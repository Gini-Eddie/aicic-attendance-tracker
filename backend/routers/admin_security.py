from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from cryptography.fernet import InvalidToken
from ..database import get_db
from ..models import User, InvitationSetting
from ..auth import require_admin, verify_password, get_password_hash
from ..invitations import cipher
import hashlib
import time
from collections import defaultdict, deque
from threading import Lock

router = APIRouter(prefix="/admin/invitations", tags=["Admin security"])
failures = defaultdict(deque)
failure_lock = Lock()


def revision(record):
    return hashlib.sha256(record.encrypted_code.encode()).hexdigest() if record else ""


@router.get("/{kind}")
def code_status(kind: Literal["teacher", "admin"], response: Response, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return {"revision": revision(db.get(InvitationSetting, kind))}


class CodeRequest(BaseModel):
    password: str = Field(min_length=1, max_length=72)
    new_code: Optional[str] = Field(default=None, min_length=16, max_length=72)


@router.post("/{kind}")
def manage_code(kind: Literal["teacher", "admin"], data: CodeRequest, response: Response,
                current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    with failure_lock:
        attempts = failures[current_user.id]
        while attempts and attempts[0] < time.monotonic() - 300:
            attempts.popleft()
        if len(attempts) >= 5:
            raise HTTPException(429, "Too many incorrect passwords. Try again in five minutes.")
    try:
        valid = verify_password(data.password, current_user.password_hash)
    except (ValueError, TypeError):
        valid = False
    if not valid:
        with failure_lock:
            failures[current_user.id].append(time.monotonic())
        raise HTTPException(403, "Incorrect account password.")
    with failure_lock:
        failures.pop(current_user.id, None)
    encryption = cipher()
    record = db.get(InvitationSetting, kind)
    if data.new_code is not None:
        if len(data.new_code.encode("utf-8")) > 72 or data.new_code != data.new_code.strip():
            raise HTTPException(400, "Use no more than 72 UTF-8 bytes and no leading or trailing spaces.")
        from ..invitations import invitation_hash
        other_hash = invitation_hash(db, "teacher" if kind == "admin" else "admin")
        try:
            same_code = bool(other_hash) and verify_password(data.new_code, other_hash)
        except (ValueError, TypeError):
            same_code = False
        if same_code:
            raise HTTPException(400, "Use different codes for admin and teacher registration.")
        if not record:
            record = InvitationSetting(kind=kind)
            db.add(record)
        record.code_hash = get_password_hash(data.new_code)
        record.encrypted_code = encryption.encrypt(data.new_code.encode()).decode()
        db.commit()
    if not record:
        raise HTTPException(404, "No viewable code is stored yet. Set a code here; existing hashes cannot be reversed.")
    try:
        code = encryption.decrypt(record.encrypted_code.encode()).decode()
    except InvalidToken:
        raise HTTPException(503, "Cannot decrypt the stored code. Restore the server encryption key or set a new code.")
    return {"code": code, "revision": revision(record)}
