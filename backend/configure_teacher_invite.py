"""Run from the project root to set or rotate the teacher registration code."""
from getpass import getpass
from pathlib import Path
import re
import secrets

from .auth import get_password_hash


def main():
    path = Path(__file__).resolve().parents[1] / ".env"
    code = getpass("Choose an invitation code (Enter to generate a strong code): ")
    generated = not code
    if generated:
        code = "MASTER-" + secrets.token_urlsafe(24)
    elif len(code) < 16 or len(code.encode("utf-8")) > 72:
        raise SystemExit("Use 16 or more characters and no more than 72 UTF-8 bytes.")
    elif code != getpass("Confirm invitation code: "):
        raise SystemExit("Codes do not match. No changes made.")
    content = path.read_text(encoding="utf-8") if path.exists() else ""
    line = f'TEACHER_INVITE_CODE_HASH="{get_password_hash(code)}"'
    pattern = r"(?m)^\s*TEACHER_INVITE_CODE_HASH\s*=.*$"
    content = re.sub(pattern, lambda _: line, content) if re.search(pattern, content) else content.rstrip() + "\n" + line + "\n"
    path.write_text(content, encoding="utf-8")
    if generated:
        print("Save this invitation code in your password manager and share only with approved teachers:")
        print(code)
    print("Only the hash was saved to .env. Restart the backend to apply it.")


if __name__ == "__main__":
    main()
