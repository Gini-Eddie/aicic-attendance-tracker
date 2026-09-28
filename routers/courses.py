from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Course, TeacherCourse, Enrollment, AttendanceSession, AttendanceRecord
from ..schemas import CourseCreate, CourseResponse, TeacherAssignmentCreate
from ..auth import get_current_user, require_admin

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("")
def list_courses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        courses = db.query(Course).all()
    else:
        # Teacher: only courses assigned to them
        courses = db.query(Course).join(TeacherCourse).filter(TeacherCourse.teacher_id == current_user.id).all()

    result = []
    for c in courses:
        student_count = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()
        sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == c.id).order_by(AttendanceSession.starts_at.desc()).all()
        last_session = sessions[0] if sessions else None
        last_rate = None
        if last_session and student_count > 0:
            rec_count = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == last_session.id).count()
            last_rate = round((rec_count / student_count) * 100)

        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "created_at": c.created_at,
            "enrolled_students_count": student_count,
            "total_sessions_count": len(sessions),
            "last_attendance_rate": last_rate,
            "last_session_date": last_session.starts_at if last_session else None
        })
    return result

@router.get("/{course_id}")
def get_course(course_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == "teacher":
        is_assigned = db.query(TeacherCourse).filter(
            TeacherCourse.course_id == course_id,
            TeacherCourse.teacher_id == current_user.id
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Course not assigned to you")

    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    students = [{
        "id": e.student.id,
        "full_name": e.student.full_name,
        "email": e.student.email,
        "student_code": e.student.student_code,
        "enrolled_at": e.enrolled_at
    } for e in enrollments]

    teachers = [{
        "id": t.id,
        "name": t.name,
        "email": t.email
    } for t in course.teachers]

    sessions = []
    course_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id
    ).order_by(AttendanceSession.starts_at.desc()).all()

    for s in course_sessions:
        present_count = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).count()
        total = len(students)
        rate = round((present_count / total) * 100) if total > 0 else 0
        sessions.append({
            "id": s.id,
            "token": s.token,
            "starts_at": s.starts_at,
            "expires_at": s.expires_at,
            "status": s.status,
            "teacher_name": s.teacher.name if s.teacher else "Unknown",
            "present_count": present_count,
            "total_students": total,
            "attendance_rate": rate
        })

    return {
        "course": course,
        "teachers": teachers,
        "students": students,
        "sessions": sessions
    }

@router.post("", response_model=CourseResponse, status_code=201)
def create_course(data: CourseCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = Course(name=data.name.strip(), description=data.description)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@router.post("/{course_id}/teachers")
def assign_teacher(course_id: str, data: TeacherAssignmentCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    teacher = db.query(User).filter(User.id == data.teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    existing = db.query(TeacherCourse).filter(TeacherCourse.course_id == course_id, TeacherCourse.teacher_id == data.teacher_id).first()
    if not existing:
        tc = TeacherCourse(course_id=course_id, teacher_id=data.teacher_id)
        db.add(tc)
        db.commit()
    return {"message": "Teacher assigned to course"}

@router.delete("/{course_id}/teachers/{teacher_id}")
def remove_teacher(course_id: str, teacher_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    db.query(TeacherCourse).filter(
        TeacherCourse.course_id == course_id,
        TeacherCourse.teacher_id == teacher_id
    ).delete()
    db.commit()
    return {"message": "Teacher removed from course"}
