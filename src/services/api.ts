import {
  User,
  Course,
  Student,
  AttendanceSession,
  SessionDetail,
  StudentAttendanceProfile,
  AdminDashboardData,
  TeacherDashboardData
} from "../types";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

const TOKEN_KEY = "aicic_auth_token";
const USER_KEY = "aicic_auth_user";

// FastAPI stores UTC timestamps without an offset. Mark them as UTC before
// browsers interpret them as local time (which prematurely expires sessions).
async function readResponse(res: Response) {
  return JSON.parse(await res.text(), (key, value) => {
    if (typeof value === "string" && /(_at|_date)$/.test(key) && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/.test(value)) return value + "Z";
    return value;
  });
}

class ApiClient {
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public getUser(): User | null {
    return this.currentUser;
  }

  public setSession(token: string, user: User) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public clearSession() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_ORIGIN}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorDetail = `Request failed with status ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorDetail = errorJson.detail;
        } else if (errorJson.message) {
          errorDetail = errorJson.message;
        }
      } catch (e) {
        // use default errorDetail
      }
      throw new Error(errorDetail);
    }

    return readResponse(res);
  }

  // Auth Endpoints
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.setSession(data.access_token, data.user);
    return data;
  }

  async getMe(): Promise<User> {
    const user = await this.request<User>("/api/auth/me");
    this.currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  async updateProfile(name: string, email: string, currentPassword: string, newPassword?: string): Promise<User> {
    const user = await this.request<User>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name, email, current_password: currentPassword, new_password: newPassword || null }) });
    this.currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  // Dashboard
  async getDashboard(): Promise<AdminDashboardData | TeacherDashboardData> {
    return this.request<AdminDashboardData | TeacherDashboardData>("/api/dashboard");
  }

  // Courses
  async getCourses(): Promise<Course[]> {
    return this.request<Course[]>("/api/courses");
  }

  async getCourse(id: string): Promise<{
    course: Course;
    teachers: { id: string; name: string; email: string }[];
    students: Student[];
    sessions: AttendanceSession[];
  }> {
    return this.request(`/api/courses/${id}`);
  }

  async createCourse(name: string, description?: string): Promise<Course> {
    return this.request<Course>("/api/courses", {
      method: "POST",
      body: JSON.stringify({ name, description })
    });
  }

  async assignTeacher(courseId: string, teacherId: string): Promise<{ message: string }> {
    return this.request(`/api/courses/${courseId}/teachers`, {
      method: "POST",
      body: JSON.stringify({ teacher_id: teacherId })
    });
  }

  async removeTeacher(courseId: string, teacherId: string): Promise<{ message: string }> {
    return this.request(`/api/courses/${courseId}/teachers/${teacherId}`, {
      method: "DELETE"
    });
  }

  // Students & Enrollments
  async getStudents(): Promise<Student[]> {
    return this.request<Student[]>("/api/students");
  }

  async createStudent(fullName: string, email: string, studentCode: string): Promise<Student> {
    return this.request<Student>("/api/students", {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName,
        email,
        student_code: studentCode
      })
    });
  }

  async enrollStudent(courseId: string, studentId: string): Promise<{ message: string }> {
    return this.request(`/api/courses/${courseId}/students`, {
      method: "POST",
      body: JSON.stringify({ student_id: studentId })
    });
  }

  async unenrollStudent(courseId: string, studentId: string): Promise<{ message: string }> {
    return this.request(`/api/courses/${courseId}/students/${studentId}`, {
      method: "DELETE"
    });
  }

  async getStudentAttendanceProfile(studentId: string, courseId?: string): Promise<StudentAttendanceProfile> {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : "";
    return this.request<StudentAttendanceProfile>(`/api/students/${studentId}/attendance${query}`);
  }

  // Teachers
  async getTeachers(): Promise<User[]> {
    return this.request<User[]>("/api/teachers");
  }

  async createTeacher(name: string, email: string, password: string): Promise<User> {
    return this.request<User>("/api/teachers", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
  }

  // Attendance Sessions
  async addRosterStudent(courseId: string, full_name: string, student_code: string, email?: string): Promise<Student> {
    return this.request<Student>(`/api/courses/${courseId}/roster`, { method: "POST", body: JSON.stringify({ full_name, student_code, email: email || null }) });
  }

  async invitationStatus(kind: "admin" | "teacher"): Promise<{ revision: string }> {
    return this.request(`/api/admin/invitations/${kind}`);
  }

  async manageInvitation(kind: "admin" | "teacher", password: string, newCode?: string): Promise<{ code: string; revision: string }> {
    return this.request(`/api/admin/invitations/${kind}`, { method: "POST", body: JSON.stringify({ password, new_code: newCode }) });
  }

  async deleteSession(sessionId: string) {
    return this.request(`/api/sessions/${sessionId}`, { method: "DELETE" });
  }

  async deleteAttendance(sessionId: string, studentId: string) {
    return this.request(`/api/sessions/${sessionId}/attendance/${studentId}`, { method: "DELETE" });
  }

  async lookupStudent(token: string, studentCode: string): Promise<{ student_name: string; student_code: string }> {
    return this.request(`/api/attendance/${token}/lookup`, { method: "POST", body: JSON.stringify({ student_code: studentCode }) });
  }

  async startSession(courseId: string, durationMinutes: number = 10): Promise<AttendanceSession & { attendance_url: string }> {
    return this.request(`/api/courses/${courseId}/sessions`, {
      method: "POST",
      body: JSON.stringify({ duration_minutes: durationMinutes })
    });
  }

  async closeSession(sessionId: string): Promise<{ message: string }> {
    return this.request(`/api/sessions/${sessionId}/close`, {
      method: "POST"
    });
  }

  async getSession(sessionId: string): Promise<SessionDetail> {
    return this.request<SessionDetail>(`/api/sessions/${sessionId}`);
  }

  async pollSessionAttendance(sessionId: string): Promise<{
    session_id: string;
    status: "active" | "closed" | "expired";
    expires_at: string;
    total_enrolled: number;
    checked_in_count: number;
    records: {
      id: string;
      student_id: string;
      student_name: string;
      student_code: string;
      checked_in_at: string;
    }[];
  }> {
    return this.request(`/api/sessions/${sessionId}/attendance`);
  }

  // Public Attendance (No auth header needed)
  async getPublicSession(token: string): Promise<{
    valid: boolean;
    status: string;
    course_name?: string;
    teacher_name?: string;
    starts_at?: string;
    expires_at?: string;
    detail?: string;
  }> {
    const res = await fetch(`${API_ORIGIN}/api/attendance/${token}`);
    const data = await readResponse(res);
    if (!res.ok) throw new Error(data.detail || "Could not load attendance session.");
    return data;
  }

  async checkInPublic(token: string, studentCode: string): Promise<{
    message: string;
    student_name: string;
    student_code: string;
    course_name: string;
    checked_in_at: string;
  }> {
    const res = await fetch(`${API_ORIGIN}/api/attendance/${token}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_code: studentCode })
    });
    const data = await readResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || "Check-in failed");
    }
    return data;
  }

  async registerTeacher(name: string, email: string, password: string, courseName: string, invitationCode: string, role: "teacher" | "admin" = "teacher"): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>(role === "admin" ? "/api/auth/signup-admin" : "/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, course_name: courseName, invitation_code: invitationCode })
    });
    this.setSession(data.access_token, data.user);
    return data;
  }

  async resetDatabase(): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/admin/reset-seed", {
      method: "POST"
    });
  }
}

export const api = new ApiClient();
