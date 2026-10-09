import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aicic_concepts_jwt_secret_key_change_in_production";
const DATA_FILE = path.join(process.cwd(), "data_store.json");

// Models Interface
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "teacher";
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface TeacherCourse {
  teacher_id: string;
  course_id: string;
}

export interface Student {
  id: string;
  full_name: string;
  email: string;
  student_code: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface AttendanceSession {
  id: string;
  course_id: string;
  teacher_id: string;
  token: string;
  starts_at: string;
  expires_at: string;
  status: "active" | "closed" | "expired";
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  checked_in_at: string;
}

interface DatabaseSchema {
  users: User[];
  courses: Course[];
  teacher_courses: TeacherCourse[];
  students: Student[];
  enrollments: Enrollment[];
  attendance_sessions: AttendanceSession[];
  attendance_records: AttendanceRecord[];
}

// Initial Seed Data
function getInitialSeedData(): DatabaseSchema {
  const adminHash = bcrypt.hashSync("admin123Password!", 10);
  const teacherHash = bcrypt.hashSync("teacher123Password!", 10);

  const users: User[] = [
    {
      id: "u-admin-1",
      name: "Engr. Patrick Chukwuma",
      email: "admin@aicicconcepts.com",
      password_hash: adminHash,
      role: "admin",
      created_at: "2026-01-10T08:00:00Z"
    },
    {
      id: "u-teach-1",
      name: "Dr. Grace Okafor",
      email: "grace.okafor@aicicconcepts.com",
      password_hash: teacherHash,
      role: "teacher",
      created_at: "2026-01-15T09:00:00Z"
    },
    {
      id: "u-teach-2",
      name: "Chidi Eze",
      email: "chidi.eze@aicicconcepts.com",
      password_hash: teacherHash,
      role: "teacher",
      created_at: "2026-01-18T10:00:00Z"
    }
  ];

  const courses: Course[] = [
    {
      id: "c-101",
      name: "AI & Machine Learning",
      description: "Comprehensive physical training on Python, neural networks, computer vision, and modern generative AI models.",
      created_at: "2026-02-01T08:00:00Z"
    },
    {
      id: "c-102",
      name: "Full-Stack Web Development",
      description: "Hands-on software development with modern TypeScript, React, RESTful architectures, and database design.",
      created_at: "2026-02-05T08:00:00Z"
    },
    {
      id: "c-103",
      name: "Data Engineering & Cloud Systems",
      description: "Building production data pipelines, distributed storage, and cloud infrastructure architectures.",
      created_at: "2026-02-10T08:00:00Z"
    }
  ];

  const teacher_courses: TeacherCourse[] = [
    { teacher_id: "u-teach-1", course_id: "c-101" }, // Dr. Grace -> AI & ML
    { teacher_id: "u-teach-2", course_id: "c-102" }, // Chidi -> Full-Stack Web
    { teacher_id: "u-teach-1", course_id: "c-103" }, // Dr. Grace -> Data Eng
    { teacher_id: "u-teach-2", course_id: "c-103" }  // Chidi -> Data Eng
  ];

  const students: Student[] = [
    { id: "s-1", full_name: "Chinelo Adebayo", email: "chinelo.adebayo@example.com", student_code: "AICIC-2026-001", created_at: "2026-02-12T09:00:00Z" },
    { id: "s-2", full_name: "Emeka Nwosu", email: "emeka.nwosu@example.com", student_code: "AICIC-2026-002", created_at: "2026-02-12T09:10:00Z" },
    { id: "s-3", full_name: "Fatima Bello", email: "fatima.bello@example.com", student_code: "AICIC-2026-003", created_at: "2026-02-12T09:15:00Z" },
    { id: "s-4", full_name: "Tunde Bakare", email: "tunde.bakare@example.com", student_code: "AICIC-2026-004", created_at: "2026-02-12T09:20:00Z" },
    { id: "s-5", full_name: "Blessing Okon", email: "blessing.okon@example.com", student_code: "AICIC-2026-005", created_at: "2026-02-12T09:25:00Z" },
    { id: "s-6", full_name: "David Obi", email: "david.obi@example.com", student_code: "AICIC-2026-006", created_at: "2026-02-12T09:30:00Z" },
    { id: "s-7", full_name: "Zainab Ibrahim", email: "zainab.ibrahim@example.com", student_code: "AICIC-2026-007", created_at: "2026-02-12T09:35:00Z" },
    { id: "s-8", full_name: "Kelechi Kalu", email: "kelechi.kalu@example.com", student_code: "AICIC-2026-008", created_at: "2026-02-12T09:40:00Z" },
    { id: "s-9", full_name: "Mary James", email: "mary.james@example.com", student_code: "AICIC-2026-009", created_at: "2026-02-12T09:45:00Z" },
    { id: "s-10", full_name: "John Doe", email: "john.doe@example.com", student_code: "AICIC-2026-010", created_at: "2026-02-12T09:50:00Z" }
  ];

  // Course 101 Enrollments (8 students)
  const enrollments: Enrollment[] = [
    { id: "e-1", student_id: "s-1", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },
    { id: "e-2", student_id: "s-2", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },
    { id: "e-3", student_id: "s-3", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },
    { id: "e-4", student_id: "s-4", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },
    { id: "e-5", student_id: "s-6", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },
    { id: "e-6", student_id: "s-8", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },
    { id: "e-7", student_id: "s-9", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },
    { id: "e-8", student_id: "s-10", course_id: "c-101", enrolled_at: "2026-02-15T10:00:00Z" },

    // Course 102 Enrollments (7 students)
    { id: "e-9", student_id: "s-2", course_id: "c-102", enrolled_at: "2026-02-16T10:00:00Z" },
    { id: "e-10", student_id: "s-3", course_id: "c-102", enrolled_at: "2026-02-16T10:00:00Z" },
    { id: "e-11", student_id: "s-5", course_id: "c-102", enrolled_at: "2026-02-16T10:00:00Z" },
    { id: "e-12", student_id: "s-7", course_id: "c-102", enrolled_at: "2026-02-16T10:00:00Z" },
    { id: "e-13", student_id: "s-8", course_id: "c-102", enrolled_at: "2026-02-16T10:00:00Z" },
    { id: "e-14", student_id: "s-9", course_id: "c-102", enrolled_at: "2026-02-16T10:00:00Z" },
    { id: "e-15", student_id: "s-10", course_id: "c-102", enrolled_at: "2026-02-16T10:00:00Z" },

    // Course 103 Enrollments (6 students)
    { id: "e-16", student_id: "s-1", course_id: "c-103", enrolled_at: "2026-02-18T10:00:00Z" },
    { id: "e-17", student_id: "s-4", course_id: "c-103", enrolled_at: "2026-02-18T10:00:00Z" },
    { id: "e-18", student_id: "s-5", course_id: "c-103", enrolled_at: "2026-02-18T10:00:00Z" },
    { id: "e-19", student_id: "s-6", course_id: "c-103", enrolled_at: "2026-02-18T10:00:00Z" },
    { id: "e-20", student_id: "s-7", course_id: "c-103", enrolled_at: "2026-02-18T10:00:00Z" },
    { id: "e-21", student_id: "s-10", course_id: "c-103", enrolled_at: "2026-02-18T10:00:00Z" }
  ];

  // Past Attendance Sessions for Course c-101
  const attendance_sessions: AttendanceSession[] = [
    {
      id: "sess-past-1",
      course_id: "c-101",
      teacher_id: "u-teach-1",
      token: "8f31b402a78148b199d9b4c6e261a812",
      starts_at: "2026-08-24T09:00:00Z",
      expires_at: "2026-08-24T09:15:00Z",
      status: "closed",
      created_at: "2026-08-24T09:00:00Z"
    },
    {
      id: "sess-past-2",
      course_id: "c-101",
      teacher_id: "u-teach-1",
      token: "2c7901dafe634125b3991278eac1945a",
      starts_at: "2026-08-31T09:00:00Z",
      expires_at: "2026-08-31T09:15:00Z",
      status: "closed",
      created_at: "2026-08-31T09:00:00Z"
    },
    {
      id: "sess-past-3",
      course_id: "c-101",
      teacher_id: "u-teach-1",
      token: "47bce194a32e49c7bc234857b290df81",
      starts_at: "2026-09-07T09:00:00Z",
      expires_at: "2026-09-07T09:15:00Z",
      status: "closed",
      created_at: "2026-09-07T09:00:00Z"
    }
  ];

  // Records for past sessions
  const attendance_records: AttendanceRecord[] = [
    // Session 1 (6 attended out of 8 = 75%)
    { id: "ar-1", session_id: "sess-past-1", student_id: "s-1", checked_in_at: "2026-08-24T09:02:11Z" },
    { id: "ar-2", session_id: "sess-past-1", student_id: "s-2", checked_in_at: "2026-08-24T09:04:30Z" },
    { id: "ar-3", session_id: "sess-past-1", student_id: "s-3", checked_in_at: "2026-08-24T09:05:14Z" },
    { id: "ar-4", session_id: "sess-past-1", student_id: "s-4", checked_in_at: "2026-08-24T09:06:50Z" },
    { id: "ar-5", session_id: "sess-past-1", student_id: "s-9", checked_in_at: "2026-08-24T09:08:12Z" },
    { id: "ar-6", session_id: "sess-past-1", student_id: "s-10", checked_in_at: "2026-08-24T09:09:44Z" },

    // Session 2 (7 attended out of 8 = 88%)
    { id: "ar-7", session_id: "sess-past-2", student_id: "s-1", checked_in_at: "2026-08-31T09:01:05Z" },
    { id: "ar-8", session_id: "sess-past-2", student_id: "s-2", checked_in_at: "2026-08-31T09:03:22Z" },
    { id: "ar-9", session_id: "sess-past-2", student_id: "s-3", checked_in_at: "2026-08-31T09:05:00Z" },
    { id: "ar-10", session_id: "sess-past-2", student_id: "s-4", checked_in_at: "2026-08-31T09:07:33Z" },
    { id: "ar-11", session_id: "sess-past-2", student_id: "s-6", checked_in_at: "2026-08-31T09:08:29Z" },
    { id: "ar-12", session_id: "sess-past-2", student_id: "s-9", checked_in_at: "2026-08-31T09:10:15Z" },
    { id: "ar-13", session_id: "sess-past-2", student_id: "s-10", checked_in_at: "2026-08-31T09:11:40Z" },

    // Session 3 (7 attended out of 8, with David Obi absent, John Doe & Mary James present as in prompt example!)
    { id: "ar-14", session_id: "sess-past-3", student_id: "s-10", checked_in_at: "2026-09-07T09:04:12Z" }, // John Doe 9:04 AM
    { id: "ar-15", session_id: "sess-past-3", student_id: "s-9", checked_in_at: "2026-09-07T09:11:05Z" },  // Mary James 9:11 AM
    { id: "ar-16", session_id: "sess-past-3", student_id: "s-1", checked_in_at: "2026-09-07T09:02:40Z" },
    { id: "ar-17", session_id: "sess-past-3", student_id: "s-2", checked_in_at: "2026-09-07T09:05:18Z" },
    { id: "ar-18", session_id: "sess-past-3", student_id: "s-3", checked_in_at: "2026-09-07T09:07:22Z" },
    { id: "ar-19", session_id: "sess-past-3", student_id: "s-4", checked_in_at: "2026-09-07T09:08:45Z" },
    { id: "ar-20", session_id: "sess-past-3", student_id: "s-8", checked_in_at: "2026-09-07T09:12:03Z" }
    // Note: s-6 David Obi was absent!
  ];

  return {
    users,
    courses,
    teacher_courses,
    students,
    enrollments,
    attendance_sessions,
    attendance_records
  };
}

// Database Manager
class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error reading database file, using seed data:", e);
    }
    const seed = getInitialSeedData();
    this.save(seed);
    return seed;
  }

  public save(newData?: DatabaseSchema) {
    if (newData) {
      this.data = newData;
    }
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving database file:", e);
    }
  }

  public get db(): DatabaseSchema {
    return this.data;
  }

  public resetSeed() {
    this.data = getInitialSeedData();
    this.save();
    return this.data;
  }
}

export const dbManager = new DatabaseManager();

// Auth Middleware Helper
export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "teacher";
  name: string;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ detail: "Token invalid or expired" });
  }
}

export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as AuthUser;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ detail: "Admin privileges required" });
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auto-expire active sessions that passed expires_at
  setInterval(() => {
    const now = new Date().toISOString();
    let changed = false;
    dbManager.db.attendance_sessions.forEach(session => {
      if (session.status === "active" && session.expires_at < now) {
        session.status = "expired";
        changed = true;
      }
    });
    if (changed) {
      dbManager.save();
    }
  }, 5000);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "AICIC Concepts Attendance System" });
  });

  // Reset database demo seed
  app.post("/api/admin/reset-seed", authMiddleware, requireAdmin, (req, res) => {
    const fresh = dbManager.resetSeed();
    res.json({ message: "Database reset to initial seed data successfully" });
  });

  // 1. Auth: POST /api/auth/login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required" });
    }

    const user = dbManager.db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    const token = generateToken(user);
    res.json({
      access_token: token,
      token_type: "bearer",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", authMiddleware, (req, res) => {
    const authUser = (req as any).user as AuthUser;
    const user = dbManager.db.users.find(u => u.id === authUser.id);
    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  });

  // 2. Courses
  // GET /api/courses
  app.get("/api/courses", authMiddleware, (req, res) => {
    const authUser = (req as any).user as AuthUser;
    let coursesList = dbManager.db.courses;

    // If teacher, only return courses assigned to them
    if (authUser.role === "teacher") {
      const assignedCourseIds = new Set(
        dbManager.db.teacher_courses
          .filter(tc => tc.teacher_id === authUser.id)
          .map(tc => tc.course_id)
      );
      coursesList = coursesList.filter(c => assignedCourseIds.has(c.id));
    }

    // Attach enriched metrics: enrolled students count, teachers assigned, last attendance
    const enriched = coursesList.map(c => {
      const studentCount = dbManager.db.enrollments.filter(e => e.course_id === c.id).length;
      const assignedTeachers = dbManager.db.teacher_courses
        .filter(tc => tc.course_id === c.id)
        .map(tc => {
          const t = dbManager.db.users.find(u => u.id === tc.teacher_id);
          return t ? { id: t.id, name: t.name, email: t.email } : null;
        })
        .filter(Boolean);

      const courseSessions = dbManager.db.attendance_sessions
        .filter(s => s.course_id === c.id)
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

      const activeSession = courseSessions.find(s => {
        if (s.status === "active") {
          if (new Date(s.expires_at) > new Date()) return true;
        }
        return false;
      });

      const lastSession = courseSessions[0] || null;
      let lastAttendanceRate = null;
      if (lastSession && studentCount > 0) {
        const recordsCount = dbManager.db.attendance_records.filter(r => r.session_id === lastSession.id).length;
        lastAttendanceRate = Math.round((recordsCount / studentCount) * 100);
      }

      return {
        ...c,
        enrolled_students_count: studentCount,
        teachers: assignedTeachers,
        active_session: activeSession ? {
          id: activeSession.id,
          token: activeSession.token,
          expires_at: activeSession.expires_at
        } : null,
        total_sessions_count: courseSessions.length,
        last_attendance_rate: lastAttendanceRate,
        last_session_date: lastSession ? lastSession.starts_at : null
      };
    });

    res.json(enriched);
  });

  // GET /api/courses/:id
  app.get("/api/courses/:id", authMiddleware, (req, res) => {
    const authUser = (req as any).user as AuthUser;
    const { id } = req.params;
    const course = dbManager.db.courses.find(c => c.id === id);
    if (!course) {
      return res.status(404).json({ detail: "Course not found" });
    }

    // Teacher authorization
    if (authUser.role === "teacher") {
      const isAssigned = dbManager.db.teacher_courses.some(
        tc => tc.teacher_id === authUser.id && tc.course_id === id
      );
      if (!isAssigned) {
        return res.status(403).json({ detail: "Access denied. Course not assigned to you." });
      }
    }

    // Enrolled students
    const enrollments = dbManager.db.enrollments.filter(e => e.course_id === id);
    const students = enrollments.map(e => {
      const s = dbManager.db.students.find(st => st.id === e.student_id);
      return s ? { ...s, enrolled_at: e.enrolled_at } : null;
    }).filter(Boolean);

    // Assigned teachers
    const teachers = dbManager.db.teacher_courses
      .filter(tc => tc.course_id === id)
      .map(tc => {
        const t = dbManager.db.users.find(u => u.id === tc.teacher_id);
        return t ? { id: t.id, name: t.name, email: t.email } : null;
      })
      .filter(Boolean);

    // Attendance sessions
    const sessions = dbManager.db.attendance_sessions
      .filter(s => s.course_id === id)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .map(s => {
        const checkedInCount = dbManager.db.attendance_records.filter(r => r.session_id === s.id).length;
        const totalStudents = students.length;
        const rate = totalStudents > 0 ? Math.round((checkedInCount / totalStudents) * 100) : 0;
        const teacher = dbManager.db.users.find(u => u.id === s.teacher_id);
        return {
          ...s,
          teacher_name: teacher ? teacher.name : "Unknown Teacher",
          present_count: checkedInCount,
          total_students: totalStudents,
          attendance_rate: rate
        };
      });

    res.json({
      course,
      teachers,
      students,
      sessions
    });
  });

  // Admin Course Creation: POST /api/courses
  app.post("/api/courses", authMiddleware, requireAdmin, (req, res) => {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ detail: "Course name is required" });
    }
    const newCourse: Course = {
      id: "c-" + Date.now().toString(36),
      name: name.trim(),
      description: (description || "").trim(),
      created_at: new Date().toISOString()
    };
    dbManager.db.courses.push(newCourse);
    dbManager.save();
    res.status(201).json(newCourse);
  });

  // Admin Course Update & Delete
  app.put("/api/courses/:id", authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    const course = dbManager.db.courses.find(c => c.id === id);
    if (!course) return res.status(404).json({ detail: "Course not found" });
    if (req.body.name) course.name = req.body.name.trim();
    if (req.body.description !== undefined) course.description = req.body.description.trim();
    dbManager.save();
    res.json(course);
  });

  app.delete("/api/courses/:id", authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    dbManager.db.courses = dbManager.db.courses.filter(c => c.id !== id);
    dbManager.db.teacher_courses = dbManager.db.teacher_courses.filter(tc => tc.course_id !== id);
    dbManager.db.enrollments = dbManager.db.enrollments.filter(e => e.course_id !== id);
    dbManager.save();
    res.json({ message: "Course deleted successfully" });
  });

  // 3. Teachers & Teacher Assignments
  // GET /api/teachers
  app.get("/api/teachers", authMiddleware, (req, res) => {
    const teachers = dbManager.db.users
      .filter(u => u.role === "teacher")
      .map(u => {
        const assignedCourses = dbManager.db.teacher_courses
          .filter(tc => tc.teacher_id === u.id)
          .map(tc => {
            const c = dbManager.db.courses.find(course => course.id === tc.course_id);
            return c ? { id: c.id, name: c.name } : null;
          })
          .filter(Boolean);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          created_at: u.created_at,
          courses: assignedCourses
        };
      });
    res.json(teachers);
  });

  // Admin Create Teacher: POST /api/teachers
  app.post("/api/teachers", authMiddleware, requireAdmin, (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ detail: "Name, email, and password are required" });
    }
    const exists = dbManager.db.users.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (exists) {
      return res.status(400).json({ detail: "A user with this email already exists" });
    }

    const newUser: User = {
      id: "u-teach-" + Date.now().toString(36),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: bcrypt.hashSync(password, 10),
      role: "teacher",
      created_at: new Date().toISOString()
    };
    dbManager.db.users.push(newUser);
    dbManager.save();

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      created_at: newUser.created_at
    });
  });

  // Assign Teacher to Course: POST /api/courses/:id/teachers
  app.post("/api/courses/:id/teachers", authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { teacher_id } = req.body;
    const course = dbManager.db.courses.find(c => c.id === id);
    if (!course) return res.status(404).json({ detail: "Course not found" });

    const teacher = dbManager.db.users.find(u => u.id === teacher_id && u.role === "teacher");
    if (!teacher) return res.status(404).json({ detail: "Teacher not found" });

    const alreadyAssigned = dbManager.db.teacher_courses.some(
      tc => tc.course_id === id && tc.teacher_id === teacher_id
    );
    if (!alreadyAssigned) {
      dbManager.db.teacher_courses.push({ course_id: id, teacher_id });
      dbManager.save();
    }
    res.json({ message: "Teacher assigned to course successfully" });
  });

  // Remove Teacher from Course: DELETE /api/courses/:id/teachers/:teacher_id
  app.delete("/api/courses/:id/teachers/:teacher_id", authMiddleware, requireAdmin, (req, res) => {
    const { id, teacher_id } = req.params;
    dbManager.db.teacher_courses = dbManager.db.teacher_courses.filter(
      tc => !(tc.course_id === id && tc.teacher_id === teacher_id)
    );
    dbManager.save();
    res.json({ message: "Teacher assignment removed" });
  });

  // 4. Students
  // GET /api/students
  app.get("/api/students", authMiddleware, (req, res) => {
    const authUser = (req as any).user as AuthUser;

    let studentsList = dbManager.db.students;

    // If teacher, only return students enrolled in their assigned courses
    if (authUser.role === "teacher") {
      const assignedCourseIds = new Set(
        dbManager.db.teacher_courses
          .filter(tc => tc.teacher_id === authUser.id)
          .map(tc => tc.course_id)
      );
      const studentIdsInAssignedCourses = new Set(
        dbManager.db.enrollments
          .filter(e => assignedCourseIds.has(e.course_id))
          .map(e => e.student_id)
      );
      studentsList = studentsList.filter(s => studentIdsInAssignedCourses.has(s.id));
    }

    const enriched = studentsList.map(s => {
      const studentEnrollments = dbManager.db.enrollments.filter(e => e.student_id === s.id);
      const enrolledCourses = studentEnrollments.map(e => {
        const c = dbManager.db.courses.find(course => course.id === e.course_id);
        return c ? { id: c.id, name: c.name, enrolled_at: e.enrolled_at } : null;
      }).filter(Boolean);

      // Overall attendance stats across all their courses
      const courseIds = studentEnrollments.map(e => e.course_id);
      const totalSessions = dbManager.db.attendance_sessions.filter(
        sess => courseIds.includes(sess.course_id) && sess.status !== "active"
      ).length;

      const attendedSessions = dbManager.db.attendance_records.filter(
        rec => rec.student_id === s.id
      ).length;

      const rate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

      return {
        ...s,
        courses: enrolledCourses,
        total_sessions: totalSessions,
        attended_sessions: attendedSessions,
        attendance_rate: rate
      };
    });

    res.json(enriched);
  });

  // Admin Create Student: POST /api/students
  app.post("/api/students", authMiddleware, requireAdmin, (req, res) => {
    const { full_name, email, student_code } = req.body;
    if (!full_name || !email || !student_code) {
      return res.status(400).json({ detail: "Full name, email, and student code are required" });
    }

    const codeUpper = student_code.trim().toUpperCase();
    const codeExists = dbManager.db.students.some(s => s.student_code.toUpperCase() === codeUpper);
    if (codeExists) {
      return res.status(400).json({ detail: "Student code already exists" });
    }

    const newStudent: Student = {
      id: "s-" + Date.now().toString(36),
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      student_code: codeUpper,
      created_at: new Date().toISOString()
    };
    dbManager.db.students.push(newStudent);
    dbManager.save();

    res.status(201).json(newStudent);
  });

  // Admin Delete Student: DELETE /api/students/:id
  app.delete("/api/students/:id", authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    dbManager.db.students = dbManager.db.students.filter(s => s.id !== id);
    dbManager.db.enrollments = dbManager.db.enrollments.filter(e => e.student_id !== id);
    dbManager.db.attendance_records = dbManager.db.attendance_records.filter(r => r.student_id !== id);
    dbManager.save();
    res.json({ message: "Student deleted successfully" });
  });

  // Enroll Student: POST /api/courses/:id/students
  app.post("/api/courses/:id/students", authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { student_id } = req.body;

    const course = dbManager.db.courses.find(c => c.id === id);
    if (!course) return res.status(404).json({ detail: "Course not found" });

    const student = dbManager.db.students.find(s => s.id === student_id);
    if (!student) return res.status(404).json({ detail: "Student not found" });

    const exists = dbManager.db.enrollments.some(e => e.course_id === id && e.student_id === student_id);
    if (!exists) {
      const enrollment: Enrollment = {
        id: "e-" + Date.now().toString(36),
        course_id: id,
        student_id,
        enrolled_at: new Date().toISOString()
      };
      dbManager.db.enrollments.push(enrollment);
      dbManager.save();
    }
    res.json({ message: "Student enrolled in course successfully" });
  });

  // Unenroll Student: DELETE /api/courses/:id/students/:student_id
  app.delete("/api/courses/:id/students/:student_id", authMiddleware, requireAdmin, (req, res) => {
    const { id, student_id } = req.params;
    dbManager.db.enrollments = dbManager.db.enrollments.filter(
      e => !(e.course_id === id && e.student_id === student_id)
    );
    dbManager.save();
    res.json({ message: "Student unenrolled from course" });
  });

  // Student Attendance Profile: GET /api/students/:id/attendance?course_id=...
  app.get("/api/students/:id/attendance", authMiddleware, (req, res) => {
    const { id } = req.params;
    const courseId = req.query.course_id as string | undefined;

    const student = dbManager.db.students.find(s => s.id === id);
    if (!student) return res.status(404).json({ detail: "Student not found" });

    // Determine which courses to check
    let targetCourseIds = dbManager.db.enrollments
      .filter(e => e.student_id === id)
      .map(e => e.course_id);

    if (courseId) {
      targetCourseIds = targetCourseIds.filter(cId => cId === courseId);
    }

    const courseProfiles = targetCourseIds.map(cId => {
      const course = dbManager.db.courses.find(c => c.id === cId);
      const sessions = dbManager.db.attendance_sessions
        .filter(sess => sess.course_id === cId)
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

      const history = sessions.map(sess => {
        const record = dbManager.db.attendance_records.find(
          r => r.session_id === sess.id && r.student_id === id
        );
        return {
          session_id: sess.id,
          session_date: sess.starts_at,
          status: record ? "Present" : "Absent",
          check_in_time: record ? record.checked_in_at : null
        };
      });

      const classesHeld = sessions.length;
      const classesAttended = history.filter(h => h.status === "Present").length;
      const classesMissed = classesHeld - classesAttended;
      const attendanceRate = classesHeld > 0 ? Math.round((classesAttended / classesHeld) * 100) : 100;

      return {
        course_id: cId,
        course_name: course ? course.name : "Course",
        classes_held: classesHeld,
        classes_attended: classesAttended,
        classes_missed: classesMissed,
        attendance_rate: attendanceRate,
        history
      };
    });

    res.json({
      student,
      profiles: courseProfiles
    });
  });

  // 5. Attendance Sessions
  // Start Session: POST /api/courses/:id/sessions
  app.post("/api/courses/:id/sessions", authMiddleware, (req, res) => {
    const authUser = (req as any).user as AuthUser;
    const { id } = req.params;
    const { duration_minutes } = req.body;

    const course = dbManager.db.courses.find(c => c.id === id);
    if (!course) return res.status(404).json({ detail: "Course not found" });

    // Teachers can only start sessions for assigned courses
    if (authUser.role === "teacher") {
      const isAssigned = dbManager.db.teacher_courses.some(
        tc => tc.teacher_id === authUser.id && tc.course_id === id
      );
      if (!isAssigned) {
        return res.status(403).json({ detail: "Cannot start attendance for an unassigned course" });
      }
    }

    // Close any existing active sessions for this course
    const now = new Date();
    dbManager.db.attendance_sessions.forEach(s => {
      if (s.course_id === id && s.status === "active") {
        s.status = "closed";
      }
    });

    // Generate cryptographically secure random token
    const token = crypto.randomBytes(16).toString("hex");

    const minutes = Number(duration_minutes) && Number(duration_minutes) > 0 ? Number(duration_minutes) : 10;
    const startsAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();

    const newSession: AttendanceSession = {
      id: "sess-" + Date.now().toString(36),
      course_id: id,
      teacher_id: authUser.id,
      token,
      starts_at: startsAt,
      expires_at: expiresAt,
      status: "active",
      created_at: startsAt
    };

    dbManager.db.attendance_sessions.push(newSession);
    dbManager.save();

    res.status(201).json({
      ...newSession,
      course_name: course.name,
      attendance_url: `/attendance/${token}`
    });
  });

  // Close Session: POST /api/sessions/:id/close
  app.post("/api/sessions/:id/close", authMiddleware, (req, res) => {
    const authUser = (req as any).user as AuthUser;
    const { id } = req.params;

    const session = dbManager.db.attendance_sessions.find(s => s.id === id);
    if (!session) return res.status(404).json({ detail: "Session not found" });

    if (authUser.role === "teacher" && session.teacher_id !== authUser.id) {
      return res.status(403).json({ detail: "Cannot close a session you did not create" });
    }

    session.status = "closed";
    dbManager.save();

    res.json({ message: "Attendance session closed successfully", session });
  });

  // GET /api/sessions/:id
  app.get("/api/sessions/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const session = dbManager.db.attendance_sessions.find(s => s.id === id);
    if (!session) return res.status(404).json({ detail: "Session not found" });

    // Check expiration dynamically
    if (session.status === "active" && new Date(session.expires_at) < new Date()) {
      session.status = "expired";
      dbManager.save();
    }

    const course = dbManager.db.courses.find(c => c.id === session.course_id);
    const teacher = dbManager.db.users.find(u => u.id === session.teacher_id);
    const enrolledStudents = dbManager.db.enrollments
      .filter(e => e.course_id === session.course_id)
      .map(e => dbManager.db.students.find(s => s.id === e.student_id))
      .filter(Boolean) as Student[];

    const records = dbManager.db.attendance_records
      .filter(r => r.session_id === id)
      .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
      .map(r => {
        const student = dbManager.db.students.find(s => s.id === r.student_id);
        return {
          id: r.id,
          student_id: r.student_id,
          student_name: student ? student.full_name : "Unknown",
          student_code: student ? student.student_code : "N/A",
          student_email: student ? student.email : "N/A",
          checked_in_at: r.checked_in_at
        };
      });

    // Determine full breakdown with present vs absent
    const checkedInStudentIds = new Set(records.map(r => r.student_id));
    const studentBreakdown = enrolledStudents.map(student => {
      const rec = records.find(r => r.student_id === student.id);
      return {
        student_id: student.id,
        full_name: student.full_name,
        student_code: student.student_code,
        email: student.email,
        status: rec ? "Present" : "Absent",
        checked_in_at: rec ? rec.checked_in_at : null
      };
    });

    res.json({
      session,
      course: course ? { id: course.id, name: course.name, description: course.description } : null,
      teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
      total_enrolled: enrolledStudents.length,
      checked_in_count: records.length,
      attendance_rate: enrolledStudents.length > 0 ? Math.round((records.length / enrolledStudents.length) * 100) : 0,
      recent_checkins: records,
      student_breakdown: studentBreakdown
    });
  });

  // Live Attendance Poll for Active Screen: GET /api/sessions/:id/attendance
  app.get("/api/sessions/:id/attendance", authMiddleware, (req, res) => {
    const { id } = req.params;
    const session = dbManager.db.attendance_sessions.find(s => s.id === id);
    if (!session) return res.status(404).json({ detail: "Session not found" });

    if (session.status === "active" && new Date(session.expires_at) < new Date()) {
      session.status = "expired";
      dbManager.save();
    }

    const enrolledCount = dbManager.db.enrollments.filter(e => e.course_id === session.course_id).length;
    const records = dbManager.db.attendance_records
      .filter(r => r.session_id === id)
      .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
      .map(r => {
        const student = dbManager.db.students.find(s => s.id === r.student_id);
        return {
          id: r.id,
          student_id: r.student_id,
          student_name: student ? student.full_name : "Unknown",
          student_code: student ? student.student_code : "N/A",
          checked_in_at: r.checked_in_at
        };
      });

    res.json({
      session_id: session.id,
      status: session.status,
      expires_at: session.expires_at,
      total_enrolled: enrolledCount,
      checked_in_count: records.length,
      records
    });
  });

  // 6. PUBLIC STUDENT ATTENDANCE WORKFLOW (No authentication required)
  // GET /api/attendance/:token
  app.get("/api/attendance/:token", (req, res) => {
    const { token } = req.params;
    const session = dbManager.db.attendance_sessions.find(s => s.token === token);

    if (!session) {
      return res.status(404).json({
        valid: false,
        code: "INVALID_TOKEN",
        detail: "This attendance link is invalid or does not exist."
      });
    }

    const now = new Date();
    const isExpired = new Date(session.expires_at) < now;

    if (session.status === "closed" || isExpired) {
      if (session.status === "active" && isExpired) {
        session.status = "expired";
        dbManager.save();
      }
      return res.status(200).json({
        valid: false,
        status: session.status === "closed" ? "closed" : "expired",
        code: "SESSION_CLOSED",
        detail: "Attendance Closed. This attendance session is no longer accepting check-ins."
      });
    }

    const course = dbManager.db.courses.find(c => c.id === session.course_id);
    const teacher = dbManager.db.users.find(u => u.id === session.teacher_id);

    // List registered students in this course for easy autocomplete or validation
    const enrolledStudents = dbManager.db.enrollments
      .filter(e => e.course_id === session.course_id)
      .map(e => {
        const s = dbManager.db.students.find(stu => stu.id === e.student_id);
        return s ? { student_code: s.student_code, masked_name: s.full_name } : null;
      })
      .filter(Boolean);

    res.json({
      valid: true,
      status: "active",
      course_name: course ? course.name : "Physical Training Programme",
      teacher_name: teacher ? teacher.name : "Instructor",
      starts_at: session.starts_at,
      expires_at: session.expires_at,
      enrolled_count: enrolledStudents.length
    });
  });

  // POST /api/attendance/:token/check-in
  app.post("/api/attendance/:token/check-in", (req, res) => {
    const { token } = req.params;
    const { student_code } = req.body;

    if (!student_code || typeof student_code !== "string" || !student_code.trim()) {
      return res.status(400).json({ detail: "Student code or identification is required." });
    }

    // 1. Verify token exists
    const session = dbManager.db.attendance_sessions.find(s => s.token === token);
    if (!session) {
      return res.status(404).json({ detail: "Invalid attendance token." });
    }

    // 2. Verify session is active
    if (session.status !== "active") {
      return res.status(400).json({
        detail: "Attendance Closed. This session is no longer accepting check-ins."
      });
    }

    // 3. Verify session has not expired
    const now = new Date();
    if (new Date(session.expires_at) < now) {
      session.status = "expired";
      dbManager.save();
      return res.status(400).json({
        detail: "Attendance Closed. This attendance session has expired."
      });
    }

    // 4. Verify student exists by student_code or email (case-insensitive)
    const cleanedCode = student_code.trim().toUpperCase();
    const student = dbManager.db.students.find(
      s => s.student_code.toUpperCase() === cleanedCode || s.email.toLowerCase() === student_code.trim().toLowerCase()
    );

    if (!student) {
      return res.status(404).json({
        detail: `No student found with identification "${student_code}". Please enter your registered AICIC student code.`
      });
    }

    // 5. Verify student is enrolled in that course
    const isEnrolled = dbManager.db.enrollments.some(
      e => e.course_id === session.course_id && e.student_id === student.id
    );

    if (!isEnrolled) {
      return res.status(403).json({
        detail: `Student ${student.full_name} (${student.student_code}) is not enrolled in this course.`
      });
    }

    // 6. Verify student has not already checked into this session
    const existingRecord = dbManager.db.attendance_records.find(
      r => r.session_id === session.id && r.student_id === student.id
    );

    if (existingRecord) {
      return res.status(409).json({
        detail: `Attendance already recorded! You checked in at ${new Date(existingRecord.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`,
        already_checked_in: true,
        checked_in_at: existingRecord.checked_in_at,
        student_name: student.full_name
      });
    }

    // 7. Backend generates attendance timestamp
    const checkInTime = new Date().toISOString();
    const newRecord: AttendanceRecord = {
      id: "ar-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
      session_id: session.id,
      student_id: student.id,
      checked_in_at: checkInTime
    };

    dbManager.db.attendance_records.push(newRecord);
    dbManager.save();

    const course = dbManager.db.courses.find(c => c.id === session.course_id);

    res.status(201).json({
      message: "Attendance Recorded",
      student_name: student.full_name,
      student_code: student.student_code,
      course_name: course ? course.name : "",
      checked_in_at: checkInTime
    });
  });

  // 7. Dashboard Endpoints
  // GET /api/dashboard
  app.get("/api/dashboard", authMiddleware, (req, res) => {
    const authUser = (req as any).user as AuthUser;

    if (authUser.role === "admin") {
      const totalStudents = dbManager.db.students.length;
      const totalTeachers = dbManager.db.users.filter(u => u.role === "teacher").length;
      const totalCourses = dbManager.db.courses.length;
      const totalSessions = dbManager.db.attendance_sessions.length;

      // Calculate total attendance rate
      let totalAttendancePossibilities = 0;
      let totalActualCheckins = 0;

      dbManager.db.attendance_sessions.forEach(sess => {
        const enrolled = dbManager.db.enrollments.filter(e => e.course_id === sess.course_id).length;
        const attended = dbManager.db.attendance_records.filter(r => r.session_id === sess.id).length;
        totalAttendancePossibilities += enrolled;
        totalActualCheckins += attended;
      });

      const overallAttendanceRate = totalAttendancePossibilities > 0
        ? Math.round((totalActualCheckins / totalAttendancePossibilities) * 100)
        : 0;

      const recentSessions = dbManager.db.attendance_sessions
        .slice(-6)
        .reverse()
        .map(s => {
          const course = dbManager.db.courses.find(c => c.id === s.course_id);
          const teacher = dbManager.db.users.find(u => u.id === s.teacher_id);
          const enrolled = dbManager.db.enrollments.filter(e => e.course_id === s.course_id).length;
          const present = dbManager.db.attendance_records.filter(r => r.session_id === s.id).length;
          return {
            id: s.id,
            token: s.token,
            course_name: course ? course.name : "Course",
            teacher_name: teacher ? teacher.name : "Teacher",
            starts_at: s.starts_at,
            status: s.status,
            present_count: present,
            total_enrolled: enrolled,
            attendance_rate: enrolled > 0 ? Math.round((present / enrolled) * 100) : 0
          };
        });

      return res.json({
        role: "admin",
        stats: {
          total_students: totalStudents,
          total_teachers: totalTeachers,
          total_courses: totalCourses,
          total_sessions: totalSessions,
          overall_attendance_rate: overallAttendanceRate
        },
        recent_sessions: recentSessions
      });
    } else {
      // Teacher Dashboard
      const assignedCourses = dbManager.db.teacher_courses
        .filter(tc => tc.teacher_id === authUser.id)
        .map(tc => dbManager.db.courses.find(c => c.id === tc.course_id))
        .filter(Boolean) as Course[];

      const assignedCourseIds = new Set(assignedCourses.map(c => c.id));

      const today = new Date().toISOString().split("T")[0];
      const mySessions = dbManager.db.attendance_sessions.filter(
        s => assignedCourseIds.has(s.course_id)
      );

      const todaySessions = mySessions.filter(s => s.starts_at.startsWith(today));

      let myTotalPossibilities = 0;
      let myTotalAttended = 0;

      mySessions.forEach(sess => {
        const enrolled = dbManager.db.enrollments.filter(e => e.course_id === sess.course_id).length;
        const attended = dbManager.db.attendance_records.filter(r => r.session_id === sess.id).length;
        myTotalPossibilities += enrolled;
        myTotalAttended += attended;
      });

      const averageAttendance = myTotalPossibilities > 0
        ? Math.round((myTotalAttended / myTotalPossibilities) * 100)
        : 0;

      const courseCards = assignedCourses.map(course => {
        const enrolledStudents = dbManager.db.enrollments.filter(e => e.course_id === course.id);
        const courseSessions = mySessions
          .filter(s => s.course_id === course.id)
          .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

        const lastSession = courseSessions[0] || null;
        let recentAttendanceRate = null;
        if (lastSession && enrolledStudents.length > 0) {
          const attended = dbManager.db.attendance_records.filter(r => r.session_id === lastSession.id).length;
          recentAttendanceRate = Math.round((attended / enrolledStudents.length) * 100);
        }

        const activeSession = courseSessions.find(
          s => s.status === "active" && new Date(s.expires_at) > new Date()
        );

        return {
          id: course.id,
          name: course.name,
          description: course.description,
          enrolled_count: enrolledStudents.length,
          recent_attendance: recentAttendanceRate,
          last_session_date: lastSession ? lastSession.starts_at : null,
          total_sessions: courseSessions.length,
          active_session_id: activeSession ? activeSession.id : null,
          active_session_token: activeSession ? activeSession.token : null
        };
      });

      return res.json({
        role: "teacher",
        teacher_name: authUser.name,
        stats: {
          assigned_courses_count: assignedCourses.length,
          today_sessions_count: todaySessions.length,
          average_attendance: averageAttendance
        },
        courses: courseCards
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AICIC Attendance server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
