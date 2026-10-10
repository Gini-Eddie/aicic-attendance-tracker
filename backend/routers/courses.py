from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Course, TeacherCourse, Enrollment, AttendanceSession, AttendanceRecord
from ..schemas import CourseCreate, CourseResponse, TeacherAssignmentCreate
from ..auth import get_current_user, require_admin

router = APIRouter(prefix="/courses", tags=["Courses"])

# Course-scoped routes used by the frontend; retain the original routes too.
from .sessions import start_session
from .students import enroll_student, unenroll_student
from ..schemas import SessionResponse
from ..auth import require_teacher
from ..permissions import require_course_access
from ..models import Student, CourseCohort, StudentRegistration, DeletedUser
from ..registration import roster, current_cohort, session_cohort, attendance_roster, cohort_key, lock_registration_writes
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import uuid


class RosterStudentCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    student_code: str = Field(min_length=2, max_length=64)
    email: Optional[EmailStr] = None
    cohort: Optional[str] = Field(default=None, max_length=255)


@router.post("/{course_id}/roster", status_code=201)
def add_roster_student(course_id: str, data: RosterStudentCreate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    require_course_access(db, current_user, course_id)
    lock_registration_writes(db)
    code = data.student_code.strip().upper()
    name = data.full_name.strip()
    if len(code) < 2 or len(name) < 2:
        raise HTTPException(400, "Enter a name and registration number of at least two characters.")
    if db.query(Student).filter(Student.student_code == code).first() or db.query(StudentRegistration).filter_by(code=code).first():
        raise HTTPException(409, "Registration number already exists. Use a different number or ask an administrator to enroll the existing student.")
    email = data.email.lower().strip() if data.email else f"{uuid.uuid4()}@students.invalid"
    student = db.query(Student).filter(Student.email == email).first()
    selected = cohort_key(data.cohort) if data.cohort is not None else current_cohort(db, course_id)
    if student and db.query(StudentRegistration).filter_by(student_id=student.id, course_id=course_id, cohort=selected).first():
        raise HTTPException(409, "Student is already registered in this course and cohort.")
    if not student:
        student = Student(full_name=name, student_code=code, email=email)
        db.add(student)
        db.flush()
    if not db.query(Enrollment).filter_by(course_id=course_id, student_id=student.id).first():
        db.add(Enrollment(course_id=course_id, student_id=student.id))
    db.add(StudentRegistration(student_id=student.id, course_id=course_id, cohort=selected, code=code))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Student registration changed concurrently. Refresh and retry.")
    return {"id": student.id, "full_name": student.full_name, "student_code": code, "cohort": selected, "email": data.email or "", "created_at": student.created_at, "enrolled_at": student.created_at}

router.add_api_route("/{course_id}/sessions", start_session, methods=["POST"], response_model=SessionResponse, status_code=201)
router.add_api_route("/{course_id}/students", enroll_student, methods=["POST"])
router.add_api_route("/{course_id}/students/{student_id}", unenroll_student, methods=["DELETE"])

@router.get("")
def list_courses(view: str = "admin", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin" and view != "teacher":
        courses = db.query(Course).all()
    else:
        # Teacher: only courses assigned to them
        courses = db.query(Course).join(TeacherCourse).filter(TeacherCourse.teacher_id == current_user.id).all()

    result = []
    for c in courses:
        student_count = len(roster(db, c.id))
        sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id == c.id).order_by(AttendanceSession.starts_at.desc()).all()
        last_session = sessions[0] if sessions else None
        last_rate = None
        if last_session and student_count > 0:
            rec_count = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == last_session.id).count()
            last_total = len(attendance_roster(db, last_session))
            last_rate = round((rec_count / last_total) * 100) if last_total else 0

        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "created_at": c.created_at,
            "teachers": [{"id": teacher.id, "name": teacher.name, "email": teacher.email} for teacher in c.teachers],
            "cohort": (db.get(CourseCohort, c.id).name if db.get(CourseCohort, c.id) else None),
            "enrolled_students_count": student_count,
            "total_sessions_count": len(sessions),
            "last_attendance_rate": last_rate,
            "last_session_date": last_session.starts_at if last_session else None
        })
    return result

@router.get("/{course_id}")
def get_course(course_id: str, cohort: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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

    selected = current_cohort(db, course_id) if cohort is None else cohort_key(cohort)
    students = [{"id": r["student"].id, "full_name": r["student"].full_name,
                 "email": "" if r["student"].email.endswith("@students.invalid") else r["student"].email,
                 "student_code": r["code"], "cohort": r["cohort"], "registration_id": r["registration_id"],
                 "enrolled_at": r["student"].created_at} for r in roster(db, course_id, selected)]

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
        if selected and session_cohort(db, s) not in (selected, ""):
            continue
        present_count = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).count()
        total = len(attendance_roster(db, s))
        rate = round((present_count / total) * 100) if total > 0 else 0
        sessions.append({
            "id": s.id,
            "token": s.token,
            "cohort": session_cohort(db, s),
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
        "cohort": selected,
        "cohorts": sorted({r[0] for r in db.query(StudentRegistration.cohort).filter_by(course_id=course_id)} | {current_cohort(db, course_id)} - {""}),
        "teachers": teachers,
        "students": students,
        "sessions": sessions
    }

@router.post("", response_model=CourseResponse, status_code=201)
def create_course(data: CourseCreate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    course = Course(name=data.name.strip(), description=data.description)
    db.add(course)
    db.flush()
    db.add(TeacherCourse(teacher_id=current_user.id, course_id=course.id))
    if data.cohort and data.cohort.strip():
        db.add(CourseCohort(course_id=course.id, name=data.cohort.strip()))
    db.commit()
    db.refresh(course)
    return course

@router.post("/{course_id}/teachers")
def assign_teacher(course_id: str, data: TeacherAssignmentCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    teacher = db.query(User).filter(User.id == data.teacher_id, User.role.in_(["teacher", "admin"])).first()
    if not teacher or db.get(DeletedUser, teacher.id):
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


class CohortUpdate(BaseModel):
    cohort: str = Field(max_length=255)

@router.patch("/{course_id}/cohort")
def update_cohort(course_id: str, data: CohortUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    require_course_access(db, current_user, course_id)
    cohort = db.get(CourseCohort, course_id)
    if not cohort:
        cohort = CourseCohort(course_id=course_id)
        db.add(cohort)
    cohort.name = data.cohort.strip()
    if cohort.name:
        for registration in db.query(StudentRegistration).filter_by(course_id=course_id, cohort="").all():
            if not db.query(StudentRegistration).filter_by(student_id=registration.student_id, course_id=course_id, cohort=cohort_key(cohort.name)).first():
                registration.cohort = cohort_key(cohort.name)
    db.commit()
    return {"cohort": cohort.name or None}
