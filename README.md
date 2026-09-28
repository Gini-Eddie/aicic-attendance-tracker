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
