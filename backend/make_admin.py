"""Server-owner recovery: promote an existing account after verifying its password."""
import argparse
from getpass import getpass
from .database import SessionLocal
from .models import User
from .auth import verify_password


def main():
    parser = argparse.ArgumentParser(description="Make an existing account an administrator from the server terminal.")
    parser.add_argument("email")
    args = parser.parse_args()
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == args.email.strip().lower()).first()
        if not user:
            parser.exit(1, "Account not found. No changes made.\n")
        password = getpass("Enter this account's current password: ")
        try:
            valid = verify_password(password, user.password_hash)
        except (ValueError, TypeError):
            valid = False
        if not valid:
            parser.exit(1, "Incorrect password. No changes made.\n")
        user.role = "admin"
        db.commit()
    print("Account is now an administrator. Sign out and sign in again.")


if __name__ == "__main__":
    main()
