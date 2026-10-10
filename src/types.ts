export type Role = "admin" | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at?: string;
  courses?: { id: string; name: string }[];
}

export interface Course {
  cohort?: string | null;
  id: string;
  name: string;
  description?: string;
  created_at: string;
  enrolled_students_count?: number;
  total_sessions_count?: number;
  last_attendance_rate?: number | null;
  last_session_date?: string | null;
  teachers?: { id: string; name: string; email: string }[];
  active_session?: {
    id: string;
    token: string;
    expires_at: string;
  } | null;
}

export interface Student {
  cohort?: string;
  registration_id?: string;
  registrations?: {course_id: string; cohort: string; student_code: string}[];
  id: string;
  full_name: string;
  email: string;
  student_code: string;
  created_at: string;
  enrolled_at?: string;
  courses?: { id: string; name: string }[];
  total_sessions?: number;
  attended_sessions?: number;
  attendance_rate?: number;
}

export interface AttendanceSession {
  cohort?: string;
  id: string;
  course_id: string;
  teacher_id: string;
  token: string;
  starts_at: string;
  expires_at: string;
  status: "active" | "closed" | "expired";
  created_at: string;
  teacher_name?: string;
  course_name?: string;
  present_count?: number;
  total_students?: number;
  attendance_rate?: number;
}

export interface AttendanceRecord {
  id: string;
  session_id?: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  student_email?: string;
  checked_in_at: string;
}

export interface StudentSessionBreakdown {
  student_id: string;
  full_name: string;
  student_code: string;
  email: string;
  status: "Present" | "Absent" | "Unverified" | "Rejected";
  checked_in_at: string | null;
}

export interface SessionDetail {
  session: AttendanceSession;
  course: Course | null;
  teacher: { id: string; name: string } | null;
  total_enrolled: number;
  checked_in_count: number;
  attendance_rate: number;
  recent_checkins?: AttendanceRecord[];
  student_breakdown: StudentSessionBreakdown[];
}

export interface StudentAttendanceProfile {
  student: Student;
  profiles: {
    course_id: string;
    course_name: string;
    classes_held: number;
    classes_attended: number;
    classes_missed: number;
    attendance_rate: number;
    history: {
      session_id: string;
      session_date: string;
      status: "Present" | "Absent";
      check_in_time: string | null;
    }[];
  }[];
}

export interface AdminDashboardData {
  role: "admin";
  stats: {
    total_students: number;
    total_teachers: number;
    total_courses: number;
    total_sessions: number;
    overall_attendance_rate: number;
  };
  recent_sessions: {
    id: string;
    token: string;
    course_name: string;
    teacher_name: string;
    starts_at: string;
    status: string;
    present_count: number;
    total_enrolled: number;
    attendance_rate: number;
  }[];
}

export interface TeacherDashboardData {
  role: "teacher";
  teacher_name: string;
  stats: {
    assigned_courses_count: number;
    today_sessions_count: number;
    average_attendance: number;
  };
  courses: {
    id: string;
    name: string;
    description: string;
    enrolled_count: number;
    recent_attendance: number | null;
    last_session_date: string | null;
    total_sessions: number;
    active_session_id: string | null;
    active_session_token: string | null;
  }[];
}
