"""Explicit one-time reset of training data; accounts and invitations survive.

Preview: python -m backend.reset_training_data
Execute: python -m backend.reset_training_data --execute
"""
import argparse
import json
from sqlalchemy import inspect, text
from .database import engine

# Children first; do not truncate with CASCADE or drop the schema.
TRAINING_TABLES = (
    "pending_attendance", "attendance_records", "session_cohorts",
    "attendance_sessions", "deleted_registrations", "student_registrations",
    "enrollments", "teacher_courses", "course_cohorts", "students", "courses",
)
PRESERVED_TABLES = ("users", "invitation_settings", "deleted_users", "admin_notifications", "notification_reads")


def reset_training_data(connection, execute=False):
    existing = set(inspect(connection).get_table_names())
    tables = [name for name in TRAINING_TABLES if name in existing]
    preserved = [name for name in PRESERVED_TABLES if name in existing]
    if execute and connection.dialect.name == "postgresql":
        connection.execute(text("SELECT pg_advisory_xact_lock(81427931)"))
        # Exclude concurrent attendance/import writes until the reset commits.
        if tables:
            connection.execute(text("LOCK TABLE " + ", ".join(tables) + " IN EXCLUSIVE MODE"))
    counts = lambda names: {name: connection.execute(text(f"SELECT count(*) FROM {name}")).scalar_one() for name in names}
    before = counts(tables)
    kept = counts(preserved)
    if execute:
        for name in tables:
            connection.execute(text(f"DELETE FROM {name}"))
        after = counts(tables)
        if any(after.values()) or counts(preserved) != kept:
            raise RuntimeError("Reset verification failed; transaction must be rolled back.")
    else:
        after = None
    return {"executed": execute, "before": before, "after": after, "preserved": kept}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Permanently delete courses, cohorts, students and attendance data.")
    args = parser.parse_args()
    try:
        with engine.begin() as connection:
            result = reset_training_data(connection, args.execute)
    except Exception as error:
        # Never print a connection string or database error containing secrets.
        print(json.dumps({"error": type(error).__name__, "message": "Reset failed; changes rolled back. Check database connectivity and permissions."}))
        raise SystemExit(1)
    print(json.dumps({"database": {"host": engine.url.host or "local", "name": engine.url.database}, **result}, indent=2))


if __name__ == "__main__":
    main()
