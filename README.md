# AICIC Concepts Attendance Management System

A full-stack web application designed to streamline physical classroom verification for training cohorts. The system features live QR code polling, real-time metrics, and role-based access for admins, teachers, and students.

## Tech Stack
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide React
*   **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL (Neon Serverless Postgres)
*   **Authentication:** JWT (JSON Web Tokens) with Bcrypt password hashing

## Features
*   **Role-Based Access:** Distinct portals for Administrators and Teachers.
*   **Live Attendance:** Instructors can generate temporary QR codes and links for physical check-ins.
*   **Real-Time Metrics:** Live polling updates the dashboard automatically as students scan and check-in.
*   **Teacher Registration:** Instructors can securely sign up and assign themselves to their respective training programmes.

---

## Local Development Setup

Because this is a decoupled full-stack application, you need to run the backend and frontend in two separate terminal windows.

### Prerequisites
*   Node.js (v18+ recommended)
*   Python 3.10+
*   A [Neon.tech](https://neon.tech/) PostgreSQL database (or local PostgreSQL)

### 1. Environment Configuration
Create a `.env` file in the root of the project and add your database credentials and a secure random string for signing JWTs:

```env
# Database Connection
DATABASE_URL="postgresql://<user>:<password>@<your-neon-endpoint>.neon.tech/aicic_attendance?sslmode=require"

# Security
JWT_SECRET="your_generated_random_secret_string_here"