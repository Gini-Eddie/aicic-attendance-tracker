from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Course, Student, Enrollment, AttendanceSession, AttendanceRecord, TeacherCourse
from ..auth import get_current_user
from ..registration import roster, attendance_roster
from ..models import DeletedUser

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard(view: str = "admin", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin" and view != "teacher":
        total_students = db.query(Student).count()
        total_teachers = db.query(User).filter(User.role == "teacher", User.id.notin_(db.query(DeletedUser.user_id))).count()
        total_courses = db.query(Course).count()
        total_sessions = db.query(AttendanceSession).count()

        sessions = db.query(AttendanceSession).all()
        total_pos = 0
        total_rec = 0
        for s in sessions:
            enr_count = len(attendance_roster(db, s))
            rec_count = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).count()
            total_pos += enr_count
            total_rec += rec_count

        overall_rate = round((total_rec / total_pos) * 100) if total_pos > 0 else 0

        recent_sessions = db.query(AttendanceSession).order_by(AttendanceSession.starts_at.desc()).limit(6).all()
        recent_data = []
        for s in recent_sessions:
            enr = len(attendance_roster(db, s))
            rec = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).count()
            recent_data.append({
                "id": s.id,
                "token": s.token,
                "course_name": s.course.name if s.course else "Course",
                "teacher_name": s.teacher.name if s.teacher else "Teacher",
                "starts_at": s.starts_at,
                "status": s.status,
                "present_count": rec,
                "total_enrolled": enr,
                "attendance_rate": round((rec / enr) * 100) if enr > 0 else 0
            })

        return {
            "role": "admin",
            "stats": {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_courses": total_courses,
                "total_sessions": total_sessions,
                "overall_attendance_rate": overall_rate
            },
            "recent_sessions": recent_data
        }
    else:
        # Teacher Dashboard
        assigned_courses = db.query(Course).join(TeacherCourse).filter(TeacherCourse.teacher_id == current_user.id).all()
        course_ids = [c.id for c in assigned_courses]

        sessions = db.query(AttendanceSession).filter(AttendanceSession.course_id.in_(course_ids)).all() if course_ids else []
        today_str = datetime.utcnow().date()
        today_sessions = [s for s in sessions if s.starts_at.date() == today_str]

        pos = 0
        rec = 0
        for s in sessions:
            enr = len(attendance_roster(db, s))
            r = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).count()
            pos += enr
            rec += r

        avg_attendance = round((rec / pos) * 100) if pos > 0 else 0

        cards = []
        for c in assigned_courses:
            enrolled = len(roster(db, c.id))
            c_sessions = db.query(AttendanceSession).filter(
                AttendanceSession.course_id == c.id
            ).order_by(AttendanceSession.starts_at.desc()).all()

            last_s = c_sessions[0] if c_sessions else None
            recent_rate = None
            if last_s and enrolled > 0:
                rec_last = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == last_s.id).count()
                recent_rate = round((rec_last / enrolled) * 100)

            active_s = next((s for s in c_sessions if s.status == "active" and s.expires_at > datetime.utcnow()), None)

            cards.append({
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "enrolled_count": enrolled,
                "recent_attendance": recent_rate,
                "last_session_date": last_s.starts_at if last_s else None,
                "total_sessions": len(c_sessions),
                "active_session_id": active_s.id if active_s else None,
                "active_session_token": active_s.token if active_s else None
            })

        return {
            "role": "teacher",
            "teacher_name": current_user.name,
            "stats": {
                "assigned_courses_count": len(assigned_courses),
                "today_sessions_count": len(today_sessions),
                "average_attendance": avg_attendance
            },
            "courses": cards
        }
