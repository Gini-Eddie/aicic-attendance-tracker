from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routers import auth, courses, students, sessions, attendance, dashboard, teachers, admin_security

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Attendance Management System API for physical training programmes and courses at AICIC Concepts.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(teachers.router, prefix="/api")
app.include_router(admin_security.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "organization": "AICIC Concepts",
        "service": "Attendance Management Backend"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
