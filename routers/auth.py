from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, TokenResponse, UserResponse
from ..auth import verify_password, create_access_token, get_current_user
from ..models import User, TeacherCourse, Course
from ..schemas import TeacherSignUp
from ..auth import get_password_hash

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def teacher_signup(req: TeacherSignUp, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(User).filter(User.email == req.email.lower().strip()).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Create Teacher
    new_teacher = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        password_hash=get_password_hash(req.password),
        role="teacher"
    )
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)

    # Handle the manually typed course
    course_name_clean = req.course_name.strip()
    course = db.query(Course).filter(Course.name.ilike(course_name_clean)).first()

    if not course:
        # Create the course if it doesn't exist yet
        course = Course(name=course_name_clean, description="Created during teacher signup.")
        db.add(course)
        db.commit()
        db.refresh(course)

    # Assign teacher to course
    tc = TeacherCourse(teacher_id=new_teacher.id, course_id=course.id)
    db.add(tc)
    db.commit()

    # Auto-login after sign up
    token = create_access_token({
        "id": new_teacher.id,
        "email": new_teacher.email,
        "role": new_teacher.role,
        "name": new_teacher.name
    })
    return {"access_token": token, "token_type": "bearer", "user": new_teacher}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
