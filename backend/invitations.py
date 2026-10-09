from cryptography.fernet import Fernet
from fastapi import HTTPException
from .models import InvitationSetting
from .config import settings
from .auth import verify_password


def invitation_hash(db, kind):
    record = db.get(InvitationSetting, kind)
    if record:
        return record.code_hash
    return settings.ADMIN_INVITE_CODE_HASH if kind == "admin" else settings.TEACHER_INVITE_CODE_HASH


def check_invitation(db, kind, code):
    hashed = invitation_hash(db, kind)
    if not hashed:
        raise HTTPException(503, "Registration is disabled. Contact the administrator.")
    try:
        valid = verify_password(code, hashed)
    except (ValueError, TypeError):
        valid = False
    if not valid:
        raise HTTPException(403, "Invalid invitation code. Request the correct code from your administrator.")


def cipher():
    if not settings.INVITATION_ENCRYPTION_KEY:
        raise HTTPException(503, "Invitation encryption is not configured on the server.")
    try:
        return Fernet(settings.INVITATION_ENCRYPTION_KEY.encode())
    except ValueError:
        raise HTTPException(503, "Invitation encryption configuration is invalid.")
