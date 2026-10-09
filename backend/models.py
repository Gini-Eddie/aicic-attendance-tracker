import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey,
    UniqueConstraint, Index, Enum
)
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class InvitationSetting(Base):
    __tablename__ = "invitation_settings"
    kind = Column(String(16), primary_key=True)
    code_hash = Column(String(255), nullable=False)
    encrypted_code = Column(Text, nullable=False)

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, index=True)  # 'admin' | 'teacher'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    courses_taught = relationship("Course", secondary="teacher_courses", back_populates="teachers")
    attendance_sessions = relationship("AttendanceSession", back_populates="teacher")

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    teachers = relationship("User", secondary="teacher_courses", back_populates="courses_taught")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="course", cascade="all, delete-orphan")

class TeacherCourse(Base):
    __tablename__ = "teacher_courses"

    teacher_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True)

    __table_args__ = (
        Index("idx_teacher_courses_composite", "teacher_id", "course_id"),
    )

class Student(Base):
    __tablename__ = "students"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    student_code = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_student_course_enrollment"),
    )

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(128), unique=True, index=True, nullable=False)
    starts_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    status = Column(String(32), default="active", nullable=False, index=True)  # 'active', 'closed', 'expired'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    course = relationship("Course", back_populates="sessions")
    teacher = relationship("User", back_populates="attendance_sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    session_id = Column(String(64), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(64), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    checked_in_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),
    )


class CourseCohort(Base):
    __tablename__ = "course_cohorts"
    course_id = Column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True)
    name = Column(String(255), nullable=False)
