from datetime import datetime, timedelta
from .database import SessionLocal, engine, Base
from .models import User, Course, TeacherCourse, Student, Enrollment, AttendanceSession, AttendanceRecord
from .auth import get_password_hash

def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        admin_hash = get_password_hash("admin123Password!")
        teacher_hash = get_password_hash("teacher123Password!")

        admin = User(
            id="u-admin-1",
            name="Engr. Patrick Chukwuma",
            email="admin@aicicconcepts.com",
            password_hash=admin_hash,
            role="admin"
        )
        t1 = User(
            id="u-teach-1",
            name="Dr. Grace Okafor",
            email="grace.okafor@aicicconcepts.com",
            password_hash=teacher_hash,
            role="teacher"
        )
        t2 = User(
            id="u-teach-2",
            name="Chidi Eze",
            email="chidi.eze@aicicconcepts.com",
            password_hash=teacher_hash,
            role="teacher"
        )
        db.add_all([admin, t1, t2])
        db.commit()

        c1 = Course(
            id="c-101",
            name="AI & Machine Learning",
            description="Comprehensive physical training on Python, neural networks, computer vision, and modern generative AI models."
        )
        c2 = Course(
            id="c-102",
            name="Full-Stack Web Development",
            description="Hands-on software development with modern TypeScript, React, RESTful architectures, and database design."
        )
        c3 = Course(
            id="c-103",
            name="Data Engineering & Cloud Systems",
            description="Building production data pipelines, distributed storage, and cloud infrastructure architectures."
        )
        db.add_all([c1, c2, c3])
        db.commit()

        tc1 = TeacherCourse(teacher_id=t1.id, course_id=c1.id)
        tc2 = TeacherCourse(teacher_id=t2.id, course_id=c2.id)
        tc3 = TeacherCourse(teacher_id=t1.id, course_id=c3.id)
        tc4 = TeacherCourse(teacher_id=t2.id, course_id=c3.id)
        db.add_all([tc1, tc2, tc3, tc4])
        db.commit()

        students_data = [
            ("s-1", "Chinelo Adebayo", "chinelo.adebayo@example.com", "AICIC-2026-001"),
            ("s-2", "Emeka Nwosu", "emeka.nwosu@example.com", "AICIC-2026-002"),
            ("s-3", "Fatima Bello", "fatima.bello@example.com", "AICIC-2026-003"),
            ("s-4", "Tunde Bakare", "tunde.bakare@example.com", "AICIC-2026-004"),
            ("s-5", "Blessing Okon", "blessing.okon@example.com", "AICIC-2026-005"),
            ("s-6", "David Obi", "david.obi@example.com", "AICIC-2026-006"),
            ("s-7", "Zainab Ibrahim", "zainab.ibrahim@example.com", "AICIC-2026-007"),
            ("s-8", "Kelechi Kalu", "kelechi.kalu@example.com", "AICIC-2026-008"),
            ("s-9", "Mary James", "mary.james@example.com", "AICIC-2026-009"),
            ("s-10", "John Doe", "john.doe@example.com", "AICIC-2026-010")
        ]

        students = [
            Student(id=sid, full_name=fn, email=em, student_code=sc)
            for sid, fn, em, sc in students_data
        ]
        db.add_all(students)
        db.commit()

        # Enrollments for c1
        for sid in ["s-1", "s-2", "s-3", "s-4", "s-6", "s-8", "s-9", "s-10"]:
            db.add(Enrollment(student_id=sid, course_id=c1.id))
        # Enrollments for c2
        for sid in ["s-2", "s-3", "s-5", "s-7", "s-8", "s-9", "s-10"]:
            db.add(Enrollment(student_id=sid, course_id=c2.id))
        # Enrollments for c3
        for sid in ["s-1", "s-4", "s-5", "s-6", "s-7", "s-10"]:
            db.add(Enrollment(student_id=sid, course_id=c3.id))
        db.commit()

        # Past sessions for c1
        s1 = AttendanceSession(
            id="sess-past-1",
            course_id=c1.id,
            teacher_id=t1.id,
            token="8f31b402a78148b199d9b4c6e261a812",
            starts_at=datetime.utcnow() - timedelta(days=14),
            expires_at=datetime.utcnow() - timedelta(days=14, minutes=-15),
            status="closed"
        )
        s2 = AttendanceSession(
            id="sess-past-2",
            course_id=c1.id,
            teacher_id=t1.id,
            token="2c7901dafe634125b3991278eac1945a",
            starts_at=datetime.utcnow() - timedelta(days=7),
            expires_at=datetime.utcnow() - timedelta(days=7, minutes=-15),
            status="closed"
        )
        db.add_all([s1, s2])
        db.commit()

        # Attendance records
        for sid in ["s-1", "s-2", "s-3", "s-4", "s-9", "s-10"]:
            db.add(AttendanceRecord(session_id=s1.id, student_id=sid, checked_in_at=s1.starts_at + timedelta(minutes=3)))

        for sid in ["s-1", "s-2", "s-3", "s-4", "s-6", "s-9", "s-10"]:
            db.add(AttendanceRecord(session_id=s2.id, student_id=sid, checked_in_at=s2.starts_at + timedelta(minutes=4)))

        db.commit()
        print("Database seeded successfully with demo Admin, Teachers, Courses, and Students!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
