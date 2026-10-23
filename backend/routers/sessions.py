import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Course, TeacherCourse, Enrollment, AttendanceSession, AttendanceRecord, Student
from ..schemas import SessionCreate, SessionResponse, SessionUpdate, AttendanceRecordUpdate
from ..auth import get_current_user, require_teacher
from ..permissions import require_course_access
from ..registration import roster, attendance_roster, current_cohort, cohort_key, session_cohort, lock_registration_writes
from ..models import SessionCohort, PendingAttendance, StudentRegistration

router = APIRouter(prefix="/sessions", tags=["Attendance Sessions"])


def _to_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


@router.patch("/{session_id}")
def update_session(session_id: str, data: SessionUpdate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    require_course_access(db, current_user, session.course_id)

    original_duration = (
        session.expires_at - session.starts_at
        if session.expires_at and session.starts_at and session.expires_at > session.starts_at
        else timedelta(minutes=10)
    )

    if data.starts_at is not None:
        new_starts_at = _to_utc_naive(data.starts_at)
        session.starts_at = new_starts_at
        if data.expires_at is None:
            session.expires_at = new_starts_at + original_duration

    if data.expires_at is not None:
        new_expires_at = _to_utc_naive(data.expires_at)
        if new_expires_at < session.starts_at:
            raise HTTPException(400, "Session expiration time cannot be earlier than start time")
        session.expires_at = new_expires_at

    if data.status is not None:
        session.status = data.status

    db.commit()
    db.refresh(session)
    return {
        "message": "Attendance session updated",
        "session": {
            "id": session.id,
            "course_id": session.course_id,
            "teacher_id": session.teacher_id,
            "token": session.token,
            "starts_at": session.starts_at,
            "expires_at": session.expires_at,
            "status": session.status,
            "created_at": session.created_at,
            "cohort": session_cohort(db, session)
        }
    }


@router.put("/{session_id}/attendance/{student_id}")
@router.patch("/{session_id}/attendance/{student_id}")
def update_attendance(
    session_id: str,
    student_id: str,
    data: AttendanceRecordUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    require_course_access(db, current_user, session.course_id)

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")

    roster_entries = attendance_roster(db, session)
    if not any(r["student"].id == student_id for r in roster_entries):
        raise HTTPException(403, "Student is not enrolled in this course or cohort")

    normalized_status = data.status.strip().capitalize()
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student_id
    ).first()
    desk_submission = db.query(PendingAttendance).filter_by(
        session_id=session_id,
        student_id=student_id
    ).first()

    if normalized_status == "Present":
        target_time = (
            _to_utc_naive(data.checked_in_at)
            if data.checked_in_at is not None
            else (record.checked_in_at if record else (session.starts_at or datetime.utcnow()))
        )
        if record:
            record.checked_in_at = target_time
        else:
            record = AttendanceRecord(
                session_id=session_id,
                student_id=student_id,
                checked_in_at=target_time
            )
            db.add(record)
        if desk_submission:
            desk_submission.status = "verified"
            desk_submission.verified_by = current_user.id
            desk_submission.verified_at = datetime.utcnow()
        db.commit()
        db.refresh(record)
        return {
            "message": "Attendance record updated",
            "student_id": student_id,
            "status": "Present",
            "checked_in_at": record.checked_in_at
        }
    else:
        if desk_submission:
            desk_submission.status = "removed"
        if record:
            db.delete(record)
        db.commit()
        return {
            "message": "Attendance record updated",
            "student_id": student_id,
            "status": "Absent",
            "checked_in_at": None
        }


@router.delete("/{session_id}")
def delete_session(session_id: str, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    require_course_access(db, current_user, session.course_id)
    db.query(PendingAttendance).filter_by(session_id=session_id).delete()
    db.query(SessionCohort).filter_by(session_id=session_id).delete()
    db.delete(session)
    db.commit()
    return {"message": "Session and its attendance records deleted"}


@router.delete("/{session_id}/attendance/{student_id}")
def delete_attendance(session_id: str, student_id: str, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    require_course_access(db, current_user, session.course_id)
    record = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id, AttendanceRecord.student_id == student_id).first()
    if not record:
        raise HTTPException(404, "Attendance record not found")
    desk_submission = db.query(PendingAttendance).filter_by(session_id=session_id, student_id=student_id).first()
    if desk_submission:
        desk_submission.status = "removed"
    db.delete(record)
    db.commit()
    return {"message": "Attendance record deleted"}


@router.post("/course/{course_id}", response_model=SessionResponse, status_code=201)
def start_session(course_id: str, data: SessionCreate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    lock_registration_writes(db)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == "teacher":
        is_assigned = db.query(TeacherCourse).filter(
            TeacherCourse.course_id == course_id,
            TeacherCourse.teacher_id == current_user.id
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Cannot start attendance for unassigned course")

    selected = current_cohort(db, course_id) if data.cohort is None else cohort_key(data.cohort)
    if selected and selected != current_cohort(db, course_id) and not db.query(StudentRegistration).filter_by(course_id=course_id, cohort=selected).first():
        raise HTTPException(404, "Cohort does not exist in this course.")
    if not selected and any(r[0] for r in db.query(StudentRegistration.cohort).filter_by(course_id=course_id)):
        raise HTTPException(400, "Choose a cohort before starting attendance.")
    for previous in db.query(AttendanceSession).filter_by(course_id=course_id, status="active").all():
        if session_cohort(db, previous) == selected:
            previous.status = "closed"

    token = secrets.token_hex(16)
    duration = data.duration_minutes if data.duration_minutes and data.duration_minutes > 0 else 10
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=duration)

    session = AttendanceSession(
        course_id=course_id,
        teacher_id=current_user.id,
        token=token,
        starts_at=now,
        expires_at=expires_at,
        status="active"
    )
    db.add(session)
    db.flush()
    db.add(SessionCohort(session_id=session.id, cohort=selected))
    db.commit()
    db.refresh(session)

    session_dict = {
        "id": session.id,
        "course_id": session.course_id,
        "teacher_id": session.teacher_id,
        "token": session.token,
        "starts_at": session.starts_at,
        "expires_at": session.expires_at,
        "status": session.status,
        "created_at": session.created_at,
        "attendance_url": f"/attendance/{token}",
        "course_name": course.name,
        "cohort": selected
    }
    return session_dict


@router.post("/{session_id}/close")
def close_session(session_id: str, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if current_user.role == "teacher" and session.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot close a session you did not start")

    session.status = "closed"
    db.commit()
    return {"message": "Attendance session closed successfully"}


@router.get("/{session_id}")
def get_session(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    require_course_access(db, current_user, session.course_id)
    now = datetime.utcnow()
    if session.status == "active" and session.expires_at < now:
        session.status = "expired"
        db.commit()

    course = db.query(Course).filter(Course.id == session.course_id).first()
    teacher = db.query(User).filter(User.id == session.teacher_id).first()

    enrolled = attendance_roster(db, session)
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()

    record_map = {r.student_id: r for r in records}
    pending_map = {r.student_id: r for r in db.query(PendingAttendance).filter_by(session_id=session_id).all()}

    breakdown = []
    for e in enrolled:
        student = e["student"]
        rec = record_map.get(student.id)
        breakdown.append({
            "student_id": student.id,
            "full_name": student.full_name,
            "student_code": e["code"],
            "email": "" if student.email.endswith("@students.invalid") else student.email,
            "status": "Present" if rec else ("Unverified" if student.id in pending_map and pending_map[student.id].status == "pending" else "Rejected" if student.id in pending_map and pending_map[student.id].status == "rejected" else "Absent"),
            "checked_in_at": rec.checked_in_at if rec else None
        })

    rate = round((len(records) / len(enrolled)) * 100) if enrolled else 0

    return {
        "session": session,
        "course": {"id": course.id, "name": course.name} if course else None,
        "teacher": {"id": teacher.id, "name": teacher.name} if teacher else None,
        "total_enrolled": len(enrolled),
        "checked_in_count": len(records),
        "attendance_rate": rate,
        "student_breakdown": breakdown
    }


@router.get("/{session_id}/attendance")
def live_attendance(session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    require_course_access(db, current_user, session.course_id)
    now = datetime.utcnow()
    if session.status == "active" and session.expires_at < now:
        session.status = "expired"
        db.commit()

    enrolled_count = len(attendance_roster(db, session))
    codes = {r["student"].id: r["code"] for r in attendance_roster(db, session)}
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id
    ).order_by(AttendanceRecord.checked_in_at.desc()).all()

    record_items = []
    for r in records:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        record_items.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": student.full_name if student else "Unknown",
            "student_code": codes.get(r.student_id, student.student_code) if student else "N/A",
            "checked_in_at": r.checked_in_at
        })

    return {
        "session_id": session.id,
        "status": session.status,
        "expires_at": session.expires_at,
        "total_enrolled": enrolled_count,
        "checked_in_count": len(records),
        "records": record_items
    }
