from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_password_hash, require_admin
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.get("", response_model=List[UserResponse])
def list_teachers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == "teacher").all()


@router.post("", response_model=UserResponse, status_code=201)
def create_teacher(data: UserCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    if len(data.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must not exceed 72 UTF-8 bytes.")
    teacher = User(name=data.name.strip(), email=email, role="teacher", password_hash=get_password_hash(data.password))
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher
