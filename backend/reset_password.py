"""Reset one account from the server terminal: python -m backend.reset_password EMAIL."""

import argparse
from getpass import getpass

from .auth import get_password_hash
from .database import SessionLocal
from .models import User


def main():
    parser = argparse.ArgumentParser(description="Reset an existing account password.")
    parser.add_argument("email", help="Email address of the account to recover")
    args = parser.parse_args()
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == args.email.strip().lower()).first()
        if user is None:
            parser.exit(1, "No account found for that email. No changes made.\n")
        password = getpass("New password (at least 8 characters): ")
        if len(password) < 8 or len(password.encode("utf-8")) > 72:
            parser.exit(1, "Use at least 8 characters and no more than 72 UTF-8 bytes. No changes made.\n")
        if password != getpass("Confirm new password: "):
            parser.exit(1, "Passwords do not match. No changes made.\n")
        user.password_hash = get_password_hash(password)
        db.commit()
        print("Password updated. You can now sign in with your new password.")


if __name__ == "__main__":
    main()
