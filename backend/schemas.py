from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    role: str = Field("teacher", pattern="^(admin|teacher)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Login Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Course Schemas
class CourseBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseResponse(CourseBase):
    id: str
    created_at: datetime
    enrolled_students_count: Optional[int] = 0
    total_sessions_count: Optional[int] = 0
    last_attendance_rate: Optional[int] = None
    last_session_date: Optional[datetime] = None

    class Config:
        from_attributes = True

# Student Schemas
class StudentBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    student_code: str = Field(..., min_length=3, max_length=64)

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Enrollment Schemas
class EnrollmentCreate(BaseModel):
    student_id: str

class TeacherAssignmentCreate(BaseModel):
    teacher_id: str

# Attendance Session Schemas
class SessionCreate(BaseModel):
    duration_minutes: Optional[int] = 10

class SessionResponse(BaseModel):
    id: str
    course_id: str
    teacher_id: str
    token: str
    starts_at: datetime
    expires_at: datetime
    status: str
    created_at: datetime
    attendance_url: Optional[str] = None
    course_name: Optional[str] = None

    class Config:
        from_attributes = True

class SessionDetailResponse(BaseModel):
    session: SessionResponse
    course: Optional[CourseResponse]
    total_enrolled: int
    checked_in_count: int
    attendance_rate: int

# Check-in Schemas
class CheckInRequest(BaseModel):
    student_code: str = Field(..., min_length=2, description="Student registration code or student email")

class CheckInResponse(BaseModel):
    message: str
    student_name: str
    student_code: str
    course_name: str
    checked_in_at: datetime

class PublicSessionInfoResponse(BaseModel):
    valid: bool
    status: str
    course_name: Optional[str] = None
    teacher_name: Optional[str] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    detail: Optional[str] = None

class TeacherSignUp(BaseModel):
    invitation_code: str = Field(..., min_length=1, max_length=72)
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)
    course_name: str = Field(..., min_length=2, max_length=255)

class AdminSignUp(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    invitation_code: str = Field(min_length=1, max_length=72)
