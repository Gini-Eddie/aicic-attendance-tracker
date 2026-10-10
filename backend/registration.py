from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import joinedload
from .models import StudentRegistration, CourseCohort, SessionCohort, Student, Enrollment, DeletedRegistration, AttendanceRecord, PendingAttendance


def cohort_key(value):
    return (value or "").strip().upper()


def lock_registration_writes(db):
    if db.bind.dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(81427931)"))


def current_cohort(db, course_id):
    item = db.get(CourseCohort, course_id)
    return cohort_key(item.name) if item else ""


def session_cohort(db, session):
    item = db.get(SessionCohort, session.id)
    return item.cohort if item else ""


def roster(db, course_id, cohort=None):
    # Legacy manual enrollments keep their original registration numbers.
    selected = current_cohort(db, course_id) if cohort is None else cohort_key(cohort)
    registrations = db.query(StudentRegistration).options(joinedload(StudentRegistration.student)).filter(StudentRegistration.course_id == course_id).all()
    registered_ids = {r.student_id for r in registrations}
    deleted = {r.registration_id for r in db.query(DeletedRegistration).filter(DeletedRegistration.registration_id.in_([r.id for r in registrations]))}
    result = [{"student": r.student, "code": r.code, "cohort": r.cohort, "registration_id": r.id}
              for r in registrations if r.id not in deleted and (r.cohort == selected or not selected)]
    for enrollment in db.query(Enrollment).filter(Enrollment.course_id == course_id).all():
        if enrollment.student_id not in registered_ids and (not selected or selected == current_cohort(db, course_id)):
            result.append({"student": enrollment.student, "code": enrollment.student.student_code,
                           "cohort": "", "registration_id": None})
    return result


def attendance_roster(db, session):
    """Retain historical attendees even after their registration is removed."""
    selected = session_cohort(db, session)
    result = {r["student"].id: r for r in roster(db, session.course_id, selected)}
    ids = {r.student_id for r in db.query(AttendanceRecord).filter_by(session_id=session.id)}
    ids |= {r.student_id for r in db.query(PendingAttendance).filter_by(session_id=session.id)}
    for student_id in ids - result.keys():
        student = db.get(Student, student_id)
        registrations = db.query(StudentRegistration).filter_by(student_id=student_id, course_id=session.course_id).all()
        registration = next((r for r in registrations if r.cohort == selected), None)
        result[student_id] = {"student": student, "code": registration.code if registration else student.student_code,
                              "cohort": selected, "registration_id": registration.id if registration else None}
    return list(result.values())


def resolve_student(db, session, code):
    cleaned = code.strip().upper()
    registration = db.query(StudentRegistration).filter(StudentRegistration.code == cleaned).first()
    if registration and registration.course_id != session.course_id:
        primary = db.query(Student).filter_by(student_code=cleaned).first()
        if primary and not db.query(StudentRegistration).filter_by(student_id=primary.id, course_id=session.course_id).first():
            registration = None
    if registration:
        if db.get(DeletedRegistration, registration.id):
            raise HTTPException(403, "This registration has been removed. Contact your teacher.")
        if registration.course_id != session.course_id or (session_cohort(db, session) and registration.cohort != session_cohort(db, session)):
            raise HTTPException(403, "This registration number belongs to a different course or cohort.")
        student = registration.student
    else:
        student = db.query(Student).filter(Student.student_code == cleaned).first()
        if not student:
            raise HTTPException(404, "Registration number does not exist. Check it and try again.")
        if session_cohort(db, session) and session_cohort(db, session) != current_cohort(db, session.course_id):
            raise HTTPException(403, "This registration number belongs to a different cohort.")
        # An imported student's primary code must never bypass cohort checks.
        if db.query(StudentRegistration).filter(StudentRegistration.student_id == student.id, StudentRegistration.course_id == session.course_id).first():
            raise HTTPException(403, "Use the registration number issued for this course and cohort.")
    if not db.query(Enrollment).filter(Enrollment.course_id == session.course_id, Enrollment.student_id == student.id).first():
        raise HTTPException(403, "This registration number is not enrolled in this course. Contact your teacher.")
    return student, registration.code if registration else student.student_code
