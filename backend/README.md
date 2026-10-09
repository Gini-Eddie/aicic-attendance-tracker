# AICIC Concepts Attendance Management System - Backend

Production-ready REST API backend for physical training programmes and courses at AICIC Concepts.

## Tech Stack
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL (with SQLAlchemy 2.0 ORM)
- **Authentication**: JWT Bearer tokens with Bcrypt password hashing
- **Security**: Cryptographically secure session tokens via `secrets.token_hex(16)`

---

## 1. Database Setup (PostgreSQL)

### Option A: Local PostgreSQL
Create a PostgreSQL database:
```sql
CREATE DATABASE aicic_attendance;
CREATE USER aicic_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aicic_attendance TO aicic_user;
```

### Option B: Docker Compose
```bash
docker run --name aicic-postgres -e POSTGRES_DB=aicic_attendance -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

---

## 2. Environment Configuration

Create a `.env` file in the project root:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aicic_attendance
JWT_SECRET=aicic_concepts_jwt_secret_key_change_in_production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
DEFAULT_ATTENDANCE_WINDOW_MINUTES=10
```

---

## 3. Installation & Database Initialization

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations / database initialization & demo data seeding
python3 -m backend.seed
```

---

## 4. Run the FastAPI Development Server

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 5. Seeded Credentials for Testing

### Teacher roster and attendance management

Open an assigned course and select **Enrolled Students** to add a student by name
and registration number; email is optional. Formats are flexible, for example
`MATRIX-AI-001` (cohort, track, sequence). Numbers are case-insensitive and must
identify distinct students across the system. No database migration is required.

Students open the current attendance link, enter their registration number,
select **Find my name**, and confirm the displayed name to record attendance.
Unknown numbers and students not enrolled in the course receive explicit errors.

Teachers can delete individual records in the live session or history details,
and delete whole sessions from course attendance history. Deleting a session
also deletes its attendance records. Access is limited to assigned courses
(administrators can manage all courses). Deleted records can be checked in again
while a session remains open.

### Shared registration codes and administrator registration

After restarting the backend, administrators can open **Registration codes** in
the admin console. Choose **Admin master code** or **Teacher invitation code**,
enter your own account password, and view, copy, or change the selected code.
Each operation rechecks the password. Codes hide after 60 seconds or on window
blur. Five incorrect password attempts block this action for five minutes per
server process. Copies always fetch the current code after password verification.

Codes are encrypted in the shared `invitation_settings` database table with
`INVITATION_ENCRYPTION_KEY`; bcrypt hashes verify registration. The encryption key
is stored in backend `.env`, never the frontend. Keep it when hosting and backing
up. Run `python -m backend.setup_invitation_security` once if it is missing.
All server instances must use the same key. New tables are created automatically
at backend startup; existing user and attendance data are preserved.

Once a code is saved through the admin console, the shared database value takes
precedence over the original environment hash. Existing hashes cannot be
recovered as plaintext: set a new code to enable viewing. Changes apply to new
registrations immediately across all administrators and backend instances;
existing accounts remain signed in. Open displays hide changed codes within
five seconds. Teacher and admin codes must be different.

To create an admin, select **Register → Administrator**, then enter the admin
master code. A teacher code cannot create an administrator. The first registered
teacher is not automatically an admin. The server owner can promote an existing
account by running `python -m backend.make_admin EMAIL` and entering that account's
password, then signing out and in again. This command must run from the trusted
server terminal; it is not available through the public website.

### Original environment-only teacher invitation setup

Teacher self-registration requires the administrator's invitation code. Without
a configured hash, self-registration is disabled. Existing logins and the
administrator's authenticated **Add Teacher** feature continue to work.

From the project root, configure or rotate the code:

```powershell
.\.venv\Scripts\python.exe -m backend.configure_teacher_invite
```

Press Enter to generate a strong random code, or enter and confirm your own
(16+ characters). Only its bcrypt hash is saved as `TEACHER_INVITE_CODE_HASH`
in `.env`; store the actual code in the administrator's password manager.
Share it privately with approved teachers. Restart the backend after changing
it. On hosting, set the same hash as a backend environment variable. Never use
a `VITE_` variable for this hash. `.env` is excluded from Git.

The teacher code permits teacher registration, not login or attendance. Students use
attendance links without accounts or authentication tokens. Anyone who learns
the shared code can register as a teacher; rotate it if it is disclosed.

### Recover an existing account

An administrator with access to the server terminal can reset one account without
knowing its old password. From the project root on Windows, run:

```powershell
.\.venv\Scripts\python.exe -m backend.reset_password account@example.com
```

Enter and confirm a new password when prompted (input is hidden). Verify the
account owner's identity before resetting their password. This changes only the
selected account's password; it does not delete attendance records. Existing
login tokens remain valid until they expire. There is no shared login password
or automated recovery email. Do not run the seed command for recovery: it drops
the database tables and recreates demo data.

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@aicicconcepts.com` | `admin123Password!` |
| **Teacher 1** | `grace.okafor@aicicconcepts.com` | `teacher123Password!` |
| **Teacher 2** | `chidi.eze@aicicconcepts.com` | `teacher123Password!` |

### Sample Students
- `AICIC-2026-001`: Chinelo Adebayo
- `AICIC-2026-002`: Emeka Nwosu
- `AICIC-2026-003`: Fatima Bello
- `AICIC-2026-004`: Tunde Bakare
- `AICIC-2026-005`: Blessing Okon
- `AICIC-2026-006`: David Obi
- `AICIC-2026-009`: Mary James
- `AICIC-2026-010`: John Doe
