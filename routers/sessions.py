import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Course, TeacherCourse, Enrollment, AttendanceSession, AttendanceRecord, Student
from ..schemas import SessionCreate, SessionResponse
from ..auth import get_current_user, require_teacher

router = APIRouter(prefix="/sessions", tags=["Attendance Sessions"])

@router.post("/course/{course_id}", response_model=SessionResponse, status_code=201)
def start_session(course_id: str, data: SessionCreate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
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

    # Close previous active sessions for this course
    db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id,
        AttendanceSession.status == "active"
    ).update({"status": "closed"})

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
        "course_name": course.name
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

    now = datetime.utcnow()
    if session.status == "active" and session.expires_at < now:
        session.status = "expired"
        db.commit()

    course = db.query(Course).filter(Course.id == session.course_id).first()
    teacher = db.query(User).filter(User.id == session.teacher_id).first()

    enrolled = db.query(Enrollment).filter(Enrollment.course_id == session.course_id).all()
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()

    record_map = {r.student_id: r for r in records}

    breakdown = []
    for e in enrolled:
        rec = record_map.get(e.student_id)
        breakdown.append({
            "student_id": e.student.id,
            "full_name": e.student.full_name,
            "student_code": e.student.student_code,
            "email": e.student.email,
            "status": "Present" if rec else "Absent",
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

    now = datetime.utcnow()
    if session.status == "active" and session.expires_at < now:
        session.status = "expired"
        db.commit()

    enrolled_count = db.query(Enrollment).filter(Enrollment.course_id == session.course_id).count()
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
            "student_code": student.student_code if student else "N/A",
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
