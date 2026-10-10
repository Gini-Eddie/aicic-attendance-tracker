from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import AttendanceSession, AttendanceRecord, Student, Enrollment, Course, User
from ..registration import resolve_student
from ..models import PendingAttendance
from sqlalchemy.exc import IntegrityError
from ..schemas import CheckInRequest, CheckInResponse, PublicSessionInfoResponse

router = APIRouter(prefix="/attendance", tags=["Public Attendance Check-in"])


@router.post("/{token}/lookup")
def lookup_student(token: str, req: CheckInRequest, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.token == token).first()
    if not session:
        raise HTTPException(404, "Attendance link does not exist. Ask your teacher for the current link.")
    if session.status != "active" or session.expires_at < datetime.utcnow():
        raise HTTPException(400, "Attendance is closed or expired.")
    student, code = resolve_student(db, session, req.student_code)
    return {"student_name": student.full_name, "student_code": code}

@router.get("/{token}", response_model=PublicSessionInfoResponse)
def get_public_session(token: str, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.token == token).first()
    if not session:
        raise HTTPException(
            status_code=404,
            detail="This attendance link is invalid or does not exist."
        )

    now = datetime.utcnow()
    is_expired = session.expires_at < now

    if session.status == "closed" or is_expired:
        if session.status == "active" and is_expired:
            session.status = "expired"
            db.commit()
        return {
            "valid": False,
            "status": session.status if session.status == "closed" else "expired",
            "detail": "Attendance Closed. This attendance session is no longer accepting check-ins."
        }

    course = db.query(Course).filter(Course.id == session.course_id).first()
    teacher = db.query(User).filter(User.id == session.teacher_id).first()

    return {
        "valid": True,
        "status": "active",
        "course_name": course.name if course else "AICIC Course",
        "teacher_name": teacher.name if teacher else "Instructor",
        "starts_at": session.starts_at,
        "expires_at": session.expires_at,
        "detail": "Attendance is currently open."
    }

@router.post("/{token}/check-in", response_model=CheckInResponse, status_code=201)
def check_in(token: str, req: CheckInRequest, db: Session = Depends(get_db)):
    # 1. Verify token exists
    session = db.query(AttendanceSession).filter(AttendanceSession.token == token).with_for_update().first()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid attendance token.")

    # 2. Verify session is active
    if session.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Attendance Closed. This session is no longer accepting check-ins."
        )

    # 3. Verify session has not expired
    now = datetime.utcnow()
    if session.expires_at < now:
        session.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Attendance Closed. This attendance session has expired."
        )

    student, code_cleaned = resolve_student(db, session, req.student_code)
    if db.query(PendingAttendance).filter_by(session_id=session.id, student_id=student.id).first():
        raise HTTPException(409, "A company laptop submission already exists. Your course tutor must review it.")

    # 6. Verify student has not already checked into this session
    existing_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.student_id == student.id
    ).first()

    if existing_record:
        raise HTTPException(
            status_code=409,
            detail=f"Attendance already recorded for {student.full_name} in this session."
        )

    # 7. Record attendance with server-generated timestamp
    record = AttendanceRecord(
        session_id=session.id,
        student_id=student.id,
        checked_in_at=now
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Attendance has already been recorded.")
    db.refresh(record)

    course = db.query(Course).filter(Course.id == session.course_id).first()

    return {
        "message": "Attendance Recorded",
        "student_name": student.full_name,
        "student_code": code_cleaned,
        "course_name": course.name if course else "Course",
        "checked_in_at": record.checked_in_at
    }
