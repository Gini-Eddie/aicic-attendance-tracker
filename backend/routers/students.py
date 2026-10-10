from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import User, Student, Course, Enrollment, TeacherCourse, AttendanceSession, AttendanceRecord
from ..schemas import StudentCreate, StudentResponse, EnrollmentCreate
from ..auth import get_current_user, require_admin
from ..registration import attendance_roster, session_cohort, lock_registration_writes
from ..models import StudentRegistration, DeletedRegistration
from ..permissions import require_course_access

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("")
def list_students(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        students = db.query(Student).all()
    else:
        # Teachers only see students enrolled in their courses
        assigned_courses = db.query(TeacherCourse.course_id).filter(TeacherCourse.teacher_id == current_user.id).subquery()
        students = db.query(Student).join(Enrollment).filter(Enrollment.course_id.in_(assigned_courses)).distinct().all()

    result = []
    for s in students:
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == s.id).all()
        if current_user.role != "admin":
            allowed = {r[0] for r in db.query(TeacherCourse.course_id).filter_by(teacher_id=current_user.id)}
            enrollments = [e for e in enrollments if e.course_id in allowed]
        registrations = db.query(StudentRegistration).filter_by(student_id=s.id).all()
        registrations = [r for r in registrations if not db.get(DeletedRegistration, r.id) and any(e.course_id == r.course_id for e in enrollments)]
        enrolled_courses = [{"id": e.course.id, "name": e.course.name} for e in enrollments]
        course_ids = [e.course_id for e in enrollments]

        completed_sessions = db.query(AttendanceSession).filter(
            AttendanceSession.course_id.in_(course_ids),
            AttendanceSession.status != "active"
        ).all() if course_ids else []
        memberships = {(r.course_id, r.cohort) for r in registrations}
        registered_courses = {r.course_id for r in registrations}
        eligible_ids = [session.id for session in completed_sessions if not session_cohort(db, session)
                        or session.course_id not in registered_courses
                        or (session.course_id, session_cohort(db, session)) in memberships]
        total_sessions = len(eligible_ids)

        attended = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id, AttendanceRecord.session_id.in_(eligible_ids)).count()
        rate = round((attended / total_sessions) * 100) if total_sessions > 0 else 100

        result.append({
            "id": s.id,
            "full_name": s.full_name,
            "email": "" if s.email.endswith("@students.invalid") else s.email,
            "student_code": s.student_code,
            "created_at": s.created_at,
            "courses": enrolled_courses,
            "registrations": [{"course_id": r.course_id, "cohort": r.cohort, "student_code": r.code} for r in registrations],
            "total_sessions": total_sessions,
            "attended_sessions": attended,
            "attendance_rate": rate
        })
    return result

@router.post("", response_model=StudentResponse, status_code=201)
def create_student(data: StudentCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    lock_registration_writes(db)
    code_upper = data.student_code.strip().toUpperCase() if hasattr(data.student_code.strip(), "toUpperCase") else data.student_code.strip().upper()
    existing = db.query(Student).filter(
        (Student.student_code == code_upper) | (Student.email == data.email.lower().strip())
    ).first()
    if existing or db.query(StudentRegistration).filter_by(code=code_upper).first():
        raise HTTPException(status_code=400, detail="Student code or email already exists")

    student = Student(
        full_name=data.full_name.strip(),
        email=data.email.lower().strip(),
        student_code=code_upper
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.post("/enroll")
def enroll_student(course_id: str, data: EnrollmentCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not course or not student:
        raise HTTPException(status_code=404, detail="Course or Student not found")

    existing = db.query(Enrollment).filter(Enrollment.course_id == course_id, Enrollment.student_id == data.student_id).first()
    if not existing:
        enr = Enrollment(course_id=course_id, student_id=data.student_id)
        db.add(enr)
        db.commit()
    return {"message": "Student enrolled in course successfully"}

@router.delete("/enroll/{course_id}/{student_id}")
def unenroll_student(course_id: str, student_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from .operations import remove_student
    return remove_student(course_id, student_id, "", current_user, db)

@router.get("/{student_id}/attendance")
def get_student_attendance(student_id: str, course_id: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if course_id:
        require_course_access(db, current_user, course_id)
    enrollments_query = db.query(Enrollment).filter(Enrollment.student_id == student_id)
    if course_id:
        enrollments_query = enrollments_query.filter(Enrollment.course_id == course_id)
    if current_user.role != "admin":
        enrollments_query = enrollments_query.filter(Enrollment.course_id.in_(db.query(TeacherCourse.course_id).filter_by(teacher_id=current_user.id)))
    enrollments = enrollments_query.all()

    profiles = []
    for e in enrollments:
        sessions = db.query(AttendanceSession).filter(
            AttendanceSession.course_id == e.course_id
        ).order_by(AttendanceSession.starts_at.desc()).all()

        history = []
        attended_count = 0
        for sess in sessions:
            if not any(r["student"].id == student_id for r in attendance_roster(db, sess)):
                continue
            rec = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == sess.id,
                AttendanceRecord.student_id == student_id
            ).first()
            is_present = rec is not None
            if is_present:
                attended_count += 1
            history.append({
                "session_id": sess.id,
                "session_date": sess.starts_at,
                "status": "Present" if is_present else "Absent",
                "check_in_time": rec.checked_in_at if rec else None
            })

        classes_held = len(history)
        classes_missed = classes_held - attended_count
        rate = round((attended_count / classes_held) * 100) if classes_held > 0 else 100

        profiles.append({
            "course_id": e.course.id,
            "course_name": e.course.name,
            "classes_held": classes_held,
            "classes_attended": attended_count,
            "classes_missed": classes_missed,
            "attendance_rate": rate,
            "history": history
        })

    return {
        "student": student,
        "profiles": profiles
    }
