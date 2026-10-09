from fastapi import HTTPException
from .models import Course, TeacherCourse


def require_course_access(db, user, course_id):
    if not db.query(Course).filter(Course.id == course_id).first():
        raise HTTPException(404, "Course not found")
    if user.role != "admin" and not db.query(TeacherCourse).filter(
        TeacherCourse.teacher_id == user.id, TeacherCourse.course_id == course_id
    ).first():
        raise HTTPException(403, "Course not assigned to you")
