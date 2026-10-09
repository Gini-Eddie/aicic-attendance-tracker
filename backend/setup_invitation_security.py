"""Create the server encryption key once. Never print it or commit .env."""
from pathlib import Path
from dotenv import dotenv_values
from cryptography.fernet import Fernet
import re


def main():
    path = Path(__file__).resolve().parents[1] / ".env"
    if dotenv_values(path).get("INVITATION_ENCRYPTION_KEY"):
        print("Invitation encryption key is already configured; preserved existing key.")
        return
    content = path.read_text(encoding="utf-8") if path.exists() else ""
    line = 'INVITATION_ENCRYPTION_KEY="' + Fernet.generate_key().decode() + '"'
    pattern = r"(?m)^\s*INVITATION_ENCRYPTION_KEY\s*=.*$"
    content = re.sub(pattern, lambda _: line, content) if re.search(pattern, content) else content.rstrip() + "\n" + line + "\n"
    path.write_text(content, encoding="utf-8")
    print("Invitation encryption key saved to .env. Restart the backend. Preserve this key when hosting or backing up.")


if __name__ == "__main__":
    main()
