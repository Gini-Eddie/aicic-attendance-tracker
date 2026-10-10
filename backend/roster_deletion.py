"""Permanent roster removal, scoped to a course and cohort."""
from .models import (Student, StudentRegistration, DeletedRegistration, Enrollment,
                     AttendanceSession, AttendanceRecord, PendingAttendance)
from .registration import session_cohort, current_cohort


def delete_registration_data(db, course_id, student_id, selected, targets):
    sessions = db.query(AttendanceSession).filter_by(course_id=course_id).all()
    include_legacy = not selected or selected == current_cohort(db, course_id)
    session_ids = [s.id for s in sessions if not selected or session_cohort(db, s) == selected or (include_legacy and not session_cohort(db, s))]
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id, AttendanceRecord.session_id.in_(session_ids)).delete(synchronize_session=False)
    db.query(PendingAttendance).filter(PendingAttendance.student_id == student_id, PendingAttendance.session_id.in_(session_ids)).delete(synchronize_session=False)
    target_ids = [r.id for r in targets]
    db.query(DeletedRegistration).filter(DeletedRegistration.registration_id.in_(target_ids)).delete(synchronize_session=False)
    db.query(StudentRegistration).filter(StudentRegistration.id.in_(target_ids)).delete(synchronize_session=False)
    db.flush()
    remaining = db.query(StudentRegistration).filter_by(student_id=student_id, course_id=course_id).all()
    active = [r for r in remaining if not db.get(DeletedRegistration, r.id)]
    if not active:
        db.query(Enrollment).filter_by(student_id=student_id, course_id=course_id).delete(synchronize_session=False)
    db.flush()
    if not db.query(Enrollment).filter_by(student_id=student_id).first():
        # Nothing remains enrolled: remove the identity too, rather than moving it
        # into the admin directory's unassigned group.
        registrations = db.query(StudentRegistration.id).filter_by(student_id=student_id)
        db.query(DeletedRegistration).filter(DeletedRegistration.registration_id.in_(registrations)).delete(synchronize_session=False)
        db.query(StudentRegistration).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(AttendanceRecord).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(PendingAttendance).filter_by(student_id=student_id).delete(synchronize_session=False)
        db.query(Student).filter_by(id=student_id).delete(synchronize_session=False)
    else:
        student = db.get(Student, student_id)
        active_aliases = db.query(StudentRegistration).filter_by(student_id=student_id).all()
        active_aliases = [r for r in active_aliases if not db.get(DeletedRegistration, r.id)]
        removed_codes = {r.code for r in targets}
        if student and student.student_code in removed_codes and active_aliases:
            student.student_code = active_aliases[0].code
    db.flush()
