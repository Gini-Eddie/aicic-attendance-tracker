"""HTTP regression tests using an isolated in-memory database (no .env database)."""
import asyncio
import json
import os
import unittest
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from .main import app
from .database import Base, get_db
from .models import User, Course, Student, TeacherCourse
from .auth import create_access_token, get_password_hash


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine)
        def database():
            with self.factory() as db:
                yield db
        app.dependency_overrides[get_db] = database
        with self.factory() as db:
            db.add_all([
                User(id="admin", name="Admin", email="admin@example.com", role="admin", password_hash=get_password_hash("Password123!")),
                User(id="teacher", name="Teacher", email="teacher@example.com", role="teacher", password_hash="unused"),
                Course(id="course", name="Test Course"),
                Course(id="other", name="Unassigned Course"),
                Student(id="student", full_name="Test Student", email="student@example.com", student_code="TEST-001"),
            ])
            db.flush()
            db.add(TeacherCourse(teacher_id="teacher", course_id="course"))
            db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def request(self, method, path, body=None, user="admin"):
        async def run():
            messages = []
            async def receive():
                return {"type": "http.request", "body": json.dumps(body or {}).encode(), "more_body": False}
            async def send(message):
                messages.append(message)
            headers = [(b"content-type", b"application/json")]
            if user:
                headers.append((b"authorization", f"Bearer {create_access_token({'id': user})}".encode()))
            await app({"type": "http", "asgi": {"version": "3.0", "spec_version": "2.4"}, "http_version": "1.1", "method": method,
                       "scheme": "http", "path": path, "raw_path": path.encode(), "query_string": b"",
                       "root_path": "", "headers": headers, "server": ("test", 80), "client": ("test", 123)}, receive, send)
            status = next(m["status"] for m in messages if m["type"] == "http.response.start")
            data = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
            return status, json.loads(data)
        return asyncio.run(run())

    def test_attendance_workflow(self):
        self.assertEqual(self.request("POST", "/api/courses/course/students", {"student_id": "student"})[0], 200)
        status, session = self.request("POST", "/api/courses/course/sessions", {"duration_minutes": 10}, user="teacher")
        self.assertEqual(status, 201, session)
        token, session_id = session["token"], session["id"]
        self.assertTrue(self.request("GET", f"/api/attendance/{token}", user=None)[1]["valid"])
        path = f"/api/attendance/{token}/check-in"
        self.assertEqual(self.request("POST", path, {"student_code": "TEST-001"}, user=None)[0], 201)
        self.assertEqual(self.request("POST", path, {"student_code": "TEST-001"}, user=None)[0], 409)
        self.assertEqual(self.request("GET", f"/api/sessions/{session_id}/attendance")[1]["checked_in_count"], 1)
        self.assertEqual(self.request("POST", f"/api/sessions/{session_id}/close")[0], 200)
        self.assertEqual(self.request("POST", path, {"student_code": "TEST-001"}, user=None)[0], 400)
        self.assertEqual(self.request("DELETE", "/api/courses/course/students/student")[0], 200)

    def test_profile_and_teacher_course_list(self):
        body = {"name": "Updated Teacher", "email": "updated@example.com", "current_password": "Password123!"}
        with self.factory() as db:
            teacher = db.get(User, "teacher")
            teacher.password_hash = get_password_hash("Password123!")
            db.commit()
        self.assertEqual(self.request("PATCH", "/api/auth/me", body, user=None)[0] in (401, 403), True)
        wrong = {**body, "current_password": "wrong"}
        self.assertEqual(self.request("PATCH", "/api/auth/me", wrong, user="teacher")[0], 403)
        duplicate = {**body, "email": "admin@example.com"}
        self.assertEqual(self.request("PATCH", "/api/auth/me", duplicate, user="teacher")[0], 409)
        status, updated = self.request("PATCH", "/api/auth/me", body, user="teacher")
        self.assertEqual(status, 200, updated)
        self.assertEqual(updated["name"], "Updated Teacher")
        self.assertEqual(updated["role"], "teacher")
        self.assertNotIn("password_hash", updated)
        status, courses = self.request("GET", "/api/courses", user="teacher")
        self.assertEqual(status, 200)
        self.assertEqual([course["id"] for course in courses], ["course"])
        self.assertEqual(self.request("GET", "/api/courses/other", user="teacher")[0], 403)
        body["new_password"] = "NewPassword123!"
        body["role"] = "admin"
        self.assertEqual(self.request("PATCH", "/api/auth/me", body, user="teacher")[1]["role"], "teacher")
        self.assertEqual(self.request("POST", "/api/auth/login", {"email": body["email"], "password": "Password123!"}, user=None)[0], 401)
        self.assertEqual(self.request("POST", "/api/auth/login", {"email": body["email"], "password": body["new_password"]}, user=None)[0], 200)
        self.assertEqual(self.request("GET", "/api/auth/me", user="admin")[1]["email"], "admin@example.com")

    def test_admin_directory_and_cohorts(self):
        teachers = self.request("GET", "/api/teachers")[1]
        self.assertEqual(teachers[0]["courses"], [{"id": "course", "name": "Test Course"}])
        courses = self.request("GET", "/api/courses")[1]
        course = next(c for c in courses if c["id"] == "course")
        self.assertEqual(course["teachers"][0]["name"], "Teacher")
        self.assertIsNone(course["cohort"])
        self.assertEqual(self.request("PATCH", "/api/courses/course/cohort", {"cohort": "Matrix 2026"}, user="teacher")[0], 403)
        self.assertEqual(self.request("PATCH", "/api/courses/course/cohort", {"cohort": "Matrix 2026"})[0], 200)
        self.request("POST", "/api/courses/course/students", {"student_id": "student"})
        courses = self.request("GET", "/api/courses")[1]
        course = next(c for c in courses if c["id"] == "course")
        self.assertEqual(course["cohort"], "Matrix 2026")
        self.assertEqual(course["enrolled_students_count"], 1)
        students = self.request("GET", "/api/students")[1]
        self.assertEqual(students[0]["courses"], [{"id": "course", "name": "Test Course"}])
        status, created = self.request("POST", "/api/courses", {"name": "New Programme", "cohort": "New Cohort"})
        self.assertEqual(status, 201, created)
        course = next(c for c in self.request("GET", "/api/courses")[1] if c["id"] == created["id"])
        self.assertEqual(course["cohort"], "New Cohort")

    def test_teachers_and_permissions(self):
        status, teachers = self.request("GET", "/api/teachers")
        self.assertEqual(status, 200)
        self.assertNotIn("password_hash", teachers[0])
        body = {"name": "New Teacher", "email": "new@example.com", "password": "Password123!", "role": "admin"}
        status, teacher = self.request("POST", "/api/teachers", body)
        self.assertEqual(status, 201)
        self.assertEqual(teacher["role"], "teacher")
        self.assertNotIn("password_hash", teacher)
        self.assertEqual(self.request("POST", "/api/teachers", body)[0], 400)
        self.assertEqual(self.request("GET", "/api/teachers", user="teacher")[0], 403)
        self.assertEqual(self.request("POST", "/api/courses/other/sessions", user="teacher")[0], 403)
        self.assertEqual(self.request("POST", "/api/courses/missing/sessions")[0], 404)

    def test_roster_lookup_and_deletion(self):
        body = {"full_name": "Matrix Student", "student_code": "MATRIX-AI-001"}
        self.assertEqual(self.request("POST", "/api/courses/other/roster", body, user="teacher")[0], 403)
        status, student = self.request("POST", "/api/courses/course/roster", body, user="teacher")
        self.assertEqual(status, 201, student)
        self.assertEqual(self.request("POST", "/api/courses/course/roster", body, user="teacher")[0], 409)
        status, session = self.request("POST", "/api/courses/course/sessions", user="teacher")
        self.assertEqual(status, 201)
        token, sid = session["token"], session["id"]
        lookup = f"/api/attendance/{token}/lookup"
        self.assertEqual(self.request("POST", lookup, {"student_code": "WRONG"}, user=None)[0], 404)
        status, identity = self.request("POST", lookup, {"student_code": "matrix-ai-001"}, user=None)
        self.assertEqual(status, 200)
        self.assertEqual(identity["student_name"], "Matrix Student")
        self.assertEqual(self.request("GET", f"/api/sessions/{sid}/attendance")[1]["checked_in_count"], 0)
        self.assertEqual(self.request("POST", f"/api/attendance/{token}/check-in", {"student_code": identity["student_code"]}, user=None)[0], 201)
        record_path = f"/api/sessions/{sid}/attendance/{student['id']}"
        with self.factory() as db:
            db.query(TeacherCourse).delete()
            db.commit()
        self.assertEqual(self.request("DELETE", record_path, user="teacher")[0], 403)
        self.assertEqual(self.request("DELETE", f"/api/sessions/{sid}", user="teacher")[0], 403)
        with self.factory() as db:
            db.add(TeacherCourse(teacher_id="teacher", course_id="course"))
            db.commit()
        self.assertEqual(self.request("DELETE", record_path, user="teacher")[0], 200)
        self.assertEqual(self.request("GET", f"/api/sessions/{sid}/attendance")[1]["checked_in_count"], 0)
        self.request("POST", f"/api/attendance/{token}/check-in", {"student_code": identity["student_code"]}, user=None)
        self.assertEqual(self.request("DELETE", f"/api/sessions/{sid}", user="teacher")[0], 200)
        self.assertEqual(self.request("GET", f"/api/attendance/{token}", user=None)[0], 404)
        from .models import AttendanceRecord, Enrollment
        with self.factory() as db:
            self.assertEqual(db.query(AttendanceRecord).count(), 0)
            self.assertEqual(db.query(Enrollment).count(), 1)

    def test_invitation_required_and_student_access_blocked(self):
        from .config import settings
        body = {"name": "Invited Teacher", "email": "invited@example.com", "password": "Password123!", "course_name": "New Course"}
        self.assertEqual(self.request("POST", "/api/auth/signup", body, user=None)[0], 422)
        body["invitation_code"] = "wrong-code"
        with patch.object(settings, "TEACHER_INVITE_CODE_HASH", ""):
            self.assertEqual(self.request("POST", "/api/auth/signup", body, user=None)[0], 503)
        code = "MASTER-test-invitation-98765"
        with patch.object(settings, "TEACHER_INVITE_CODE_HASH", get_password_hash(code)):
            self.assertEqual(self.request("POST", "/api/auth/signup", body, user=None)[0], 403)
            with self.factory() as db:
                self.assertIsNone(db.query(User).filter(User.email == body["email"]).first())
            body["invitation_code"] = code
            status, result = self.request("POST", "/api/auth/signup", body, user=None)
            self.assertEqual(status, 201, result)
            self.assertEqual(result["user"]["role"], "teacher")
            self.assertNotIn("invitation_code", result["user"])
        for path in ["/api/dashboard", "/api/courses", "/api/students", "/api/teachers", "/api/sessions/example"]:
            self.assertIn(self.request("GET", path, user=None)[0], (401, 403))
        with self.factory() as db:
            db.add(User(id="student-login", name="Student", email="student-login@example.com", role="student", password_hash="unused"))
            db.commit()
        self.assertEqual(self.request("GET", "/api/dashboard", user="student-login")[0], 401)

    def test_shared_master_codes_and_admin_registration(self):
        from cryptography.fernet import Fernet
        from .config import settings
        from .models import InvitationSetting
        from .routers.admin_security import failures
        failures.clear()
        with self.factory() as db:
            db.add(User(id="admin2", name="Second Admin", email="admin2@example.com", role="admin", password_hash=get_password_hash("SecondPassword123!")))
            db.commit()
        with patch.object(settings, "INVITATION_ENCRYPTION_KEY", Fernet.generate_key().decode()), patch.object(settings, "ADMIN_INVITE_CODE_HASH", ""), patch.object(settings, "TEACHER_INVITE_CODE_HASH", ""):
            path = "/api/admin/invitations/admin"
            admin_code = "MASTER-admin-private-123456"
            teacher_code = "MASTER-teacher-only-123456"
            self.assertEqual(self.request("POST", path, {"password": "wrong"})[0], 403)
            self.assertEqual(self.request("POST", path, {"password": "Password123!"}, user="teacher")[0], 403)
            self.assertEqual(self.request("POST", path, {"password": "Password123!"})[0], 404)
            status, first = self.request("POST", path, {"password": "Password123!", "new_code": admin_code})
            self.assertEqual(status, 200, first)
            self.assertEqual(self.request("POST", path, {"password": "SecondPassword123!"}, user="admin2")[1]["code"], admin_code)
            with self.factory() as db:
                record = db.get(InvitationSetting, "admin")
                self.assertNotEqual(record.encrypted_code, admin_code)
                self.assertNotEqual(record.code_hash, admin_code)
            self.assertEqual(self.request("POST", "/api/admin/invitations/teacher", {"password": "Password123!", "new_code": admin_code})[0], 400)
            self.assertEqual(self.request("POST", "/api/admin/invitations/teacher", {"password": "Password123!", "new_code": teacher_code})[0], 200)
            registration = {"name": "New Admin", "email": "new-admin@example.com", "password": "Password123!", "invitation_code": teacher_code}
            self.assertEqual(self.request("POST", "/api/auth/signup-admin", registration, user=None)[0], 403)
            registration["invitation_code"] = admin_code
            status, created = self.request("POST", "/api/auth/signup-admin", registration, user=None)
            self.assertEqual(status, 201, created)
            self.assertEqual(created["user"]["role"], "admin")
            updated_code = "MASTER-new-admin-private-123456"
            self.assertEqual(self.request("POST", path, {"password": "SecondPassword123!", "new_code": updated_code}, user="admin2")[0], 200)
            self.assertNotEqual(self.request("GET", path)[1]["revision"], first["revision"])
            self.assertEqual(self.request("POST", path, {"password": "Password123!"})[1]["code"], updated_code)
            registration["email"] = "blocked-admin@example.com"
            self.assertEqual(self.request("POST", "/api/auth/signup-admin", registration, user=None)[0], 403)
            registration["invitation_code"] = updated_code
            self.assertEqual(self.request("POST", "/api/auth/signup-admin", registration, user=None)[0], 201)
            for _ in range(5):
                self.assertEqual(self.request("POST", path, {"password": "wrong"})[0], 403)
            self.assertEqual(self.request("POST", path, {"password": "Password123!"})[0], 429)
        failures.clear()


if __name__ == "__main__":
    unittest.main()
