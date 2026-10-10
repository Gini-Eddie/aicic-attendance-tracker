import React, { useState, useEffect } from "react";
import { ActionConfirmation } from "./ActionConfirmation";
import { api } from "../services/api";
import { AdminDashboardData, Course, Student, User } from "../types";
import { GroupedStudents } from "./GroupedStudents";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Search, 
  Trash2, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";

interface AdminDashboardProps {
  initialTab?: "overview" | "courses" | "teachers" | "students";
  onInspectSession: (sessionId: string) => void;
  onViewStudentProfile: (studentId: string) => void;
  onSelectCourse: (courseId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = "overview",
  onInspectSession,
  onViewStudentProfile,
  onSelectCourse
}) => {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "teachers" | "students" | "enrollments">(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  const [cohortEdits, setCohortEdits] = useState<Record<string, string>>({});
  const [savingCohort, setSavingCohort] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Lists state
  const [courses, setCourses] = useState<Course[]>([]);
  const [deletingTeacher, setDeletingTeacher] = useState<User | null>(null);
  const [staffError, setStaffError] = useState("");
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);

  // Form states
  const [courseForm, setCourseForm] = useState({ name: "", description: "", cohort: "" });
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", password: "" });
  const [studentForm, setStudentForm] = useState({ fullName: "", email: "", studentCode: "" });
  const [enrollForm, setEnrollForm] = useState({ courseId: "", studentId: "" });
  const [assignForm, setAssignForm] = useState({ courseId: "", teacherId: "" });

  const [searchFilter, setSearchFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dash, cList, tList, sList] = await Promise.all([
        api.getDashboard() as Promise<AdminDashboardData>,
        api.getCourses(),
        api.getStaff(),
        api.getStudents()
      ]);
      setDashboardData(dash);
      setCourses(cList);
      setTeachers(tList);
      setStudents(sList);
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.name) return;
    setSubmitting(true);
    try {
      await api.createCourse(courseForm.name, courseForm.description, courseForm.cohort);
      setCourseForm({ name: "", description: "", cohort: "" });
      setShowCourseModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.email || !teacherForm.password) return;
    setSubmitting(true);
    try {
      await api.createTeacher(teacherForm.name, teacherForm.email, teacherForm.password);
      setTeacherForm({ name: "", email: "", password: "" });
      setShowTeacherModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.fullName || !studentForm.email || !studentForm.studentCode) return;
    setSubmitting(true);
    try {
      const student = await api.createStudent(studentForm.fullName, studentForm.email, studentForm.studentCode);
      setStudents(prev => [...prev, { ...student, courses: [], total_sessions: 0, attended_sessions: 0, attendance_rate: 100 }]);
      setDashboardData(prev => prev ? { ...prev, stats: { ...prev.stats, total_students: prev.stats.total_students + 1 } } : prev);
      setStudentForm({ fullName: "", email: "", studentCode: "" });
      setShowStudentModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to create student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.courseId || !enrollForm.studentId) return;
    setSubmitting(true);
    try {
      await api.enrollStudent(enrollForm.courseId, enrollForm.studentId);
      setShowEnrollModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to enroll student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.courseId || !assignForm.teacherId) return;
    setSubmitting(true);
    try {
      await api.assignTeacher(assignForm.courseId, assignForm.teacherId);
      setShowAssignTeacherModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to assign teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm("Reset all database records back to the clean demonstration seed data?")) return;
    try {
      await api.resetDatabase();
      await loadData();
      alert("Database reset to demo seed data successfully!");
    } catch (e: any) {
      alert(e.message || "Reset failed");
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs text-slate-500">Loading administrative console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Organization Administration</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            AICIC Concepts • Central management of courses, teachers, students, enrollments, and sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSeed}
            title="Reset database to demo seed data"
            className="px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Reset Seed Data
          </button>
        </div>
      </div>

      {/* Admin Dashboard Stats as specified in prompt:
          Total students, Total teachers, Total courses, Recent attendance sessions, Overall attendance overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Students
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {dashboardData?.stats.total_students || 0}
          </span>
          <span className="text-[11px] text-slate-400">Registered learners</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Teachers
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {dashboardData?.stats.total_teachers || 0}
          </span>
          <span className="text-[11px] text-slate-400">Instructors</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Courses
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {dashboardData?.stats.total_courses || 0}
          </span>
          <span className="text-[11px] text-slate-400">Programmes</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Sessions
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {dashboardData?.stats.total_sessions || 0}
          </span>
          <span className="text-[11px] text-slate-400">Conducted classes</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Overall Attendance
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {dashboardData?.stats.overall_attendance_rate || 0}%
          </span>
          <span className="text-[11px] text-slate-400">Across organization</span>
        </div>
      </div>

      {/* Navigation Tabs for Management Sections */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "overview"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Recent Attendance Sessions
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "courses"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Courses ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "teachers"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Staff ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "students"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "enrollments"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Enrollments & Assignments
        </button>
      </div>

      {/* TAB 1: Overview & Recent Sessions */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Recent Attendance Sessions</h3>
              <p className="text-xs text-slate-500">Live attendance activity across all AICIC training programmes</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {dashboardData?.recent_sessions.length} recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Instructor</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Present</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Enrolled</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Attendance Rate</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dashboardData?.recent_sessions.map((sess) => (
                  <tr
                    key={sess.id}
                    onClick={() => onInspectSession(sess.id)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {sess.course_name}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {new Date(sess.starts_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{sess.teacher_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        sess.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {sess.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{sess.present_count}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{sess.total_enrolled}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        sess.attendance_rate >= 80 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                      }`}>
                        {sess.attendance_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectSession(sess.id);
                        }}
                        className="text-sky-600 hover:text-sky-800 font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Courses Management */}
      {activeTab === "courses" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Training Courses & Programmes</h3>
              <p className="text-xs text-slate-500">Configure physical training cohorts</p>
            </div>
            <button
              id="admin-add-course-btn"
              onClick={() => setShowCourseModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Course Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Current Cohort</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Enrolled Students</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Assigned Teachers</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {course.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {course.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {course.enrolled_students_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      {(course.teachers || []).map(t => t.name).join(", ") || "None"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectCourse(course.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg"
                      >
                        View Course
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {staffError && <p role="alert" className="text-rose-700">{staffError}</p>}
      {deletingTeacher && <ActionConfirmation message={`Delete access for ${deletingTeacher.name}? Course assignments are removed and their active sessions close. History is retained.`} onCancel={() => setDeletingTeacher(null)} onConfirm={async () => {await api.deleteTeacher(deletingTeacher.id); setDeletingTeacher(null); await loadData();}} />}
      {/* TAB 3: Teachers Management */}
      {activeTab === "teachers" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Teachers & Administrators</h3>
              <button className="text-xs text-sky-700 underline mt-2" onClick={async () => {try {await api.downloadCsv("/staff/export.csv", "staff.csv");} catch(err: any) {setStaffError(err.message);}}}>Export staff CSV</button>
              <p className="text-xs text-slate-500">All active staff. Administrators may also teach assigned courses.</p>
            </div>
            <button
              id="admin-add-teacher-btn"
              onClick={() => setShowTeacherModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Add Teacher
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Instructor Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Email Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Assigned Courses</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.email}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {(t.courses || []).map(c => c.name).join(", ") || "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-teal-100 text-teal-800">
                        {t.role}
                      </span>
                      {t.role === "teacher" && <button className="block text-rose-700 text-xs mx-auto mt-2" onClick={() => setDeletingTeacher(t)}>Delete teacher</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Students Management */}
      {activeTab === "students" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Enrolled Students Database</h3>
              <p className="text-xs text-slate-500">Students registered across all courses</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="admin-add-student-btn"
                onClick={() => setShowStudentModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                Register Student
              </button>
            </div>
          </div>

          <GroupedStudents students={students} courses={courses} onViewStudentProfile={onViewStudentProfile} />
        </div>
      )}

      {/* TAB 5: Enrollments & Teacher-Course Assignments */}
      {activeTab === "enrollments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enroll Student Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Student Course Enrollment</h3>
                <p className="text-xs text-slate-500">Enroll a student into a training programme</p>
              </div>
              <button
                onClick={() => setShowEnrollModal(true)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Enroll Student
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Students must be enrolled in a course before they can check into physical sessions for that programme.
            </p>
            <div className="divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
              {courses.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="text-slate-500 font-mono">{c.enrolled_students_count} students</span>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Assignment Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Assign Teacher to Course</h3>
                <p className="text-xs text-slate-500">Grant instructor access to run sessions</p>
              </div>
              <button
                onClick={() => setShowAssignTeacherModal(true)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign Teacher
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Teachers can only see, start attendance for, and inspect courses assigned to them by an admin.
            </p>
            <div className="divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
              {courses.map((c) => (
                <div key={c.id} className="py-2.5">
                  <div className="font-medium text-slate-900">{c.name}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Instructors: {(c.teachers || []).map(t => t.name).join(", ") || "None assigned"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Course */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Training Course</h3>
            <p className="text-xs text-slate-500 mb-4">Register a new physical training cohort</p>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">Current cohort<input maxLength={255} value={courseForm.cohort} onChange={e => setCourseForm({ ...courseForm, cohort: e.target.value })} placeholder="e.g. Matrix 2026" className="block w-full border border-slate-300 rounded-lg p-2 mt-1" /></label>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g. Cloud DevOps Engineering"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Course scope, objectives, and physical lab schedule..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  {submitting ? "Creating..." : "Save Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Teacher */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Teacher Account</h3>
            <p className="text-xs text-slate-500 mb-4">Add instructor credentials with secure password hashing</p>
            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  placeholder="e.g. Dr. Ngozi Okeke"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  placeholder="e.g. ngozi.okeke@aicicconcepts.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  {submitting ? "Saving..." : "Create Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Student */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register Student</h3>
            <p className="text-xs text-slate-500 mb-4">Assign an official student identification code</p>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  placeholder="e.g. Samuel Adeleke"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  placeholder="e.g. samuel.adeleke@example.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Student Code
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.studentCode}
                  onChange={(e) => setStudentForm({ ...studentForm, studentCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. AICIC-2026-011"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500 uppercase"
                />
              </div>
              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  {submitting ? "Registering..." : "Register Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll Student */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Enroll Student into Course</h3>
            <p className="text-xs text-slate-500 mb-4">Select student and target programme</p>
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Course
                </label>
                <select
                  required
                  value={enrollForm.courseId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Student
                </label>
                <select
                  required
                  value={enrollForm.studentId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.student_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  {submitting ? "Enrolling..." : "Enroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Teacher */}
      {showAssignTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Assign Teacher to Course</h3>
            <p className="text-xs text-slate-500 mb-4">Grant teacher authority over course attendance</p>
            <form onSubmit={handleAssignTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Course
                </label>
                <select
                  required
                  value={assignForm.courseId}
                  onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Teacher
                </label>
                <select
                  required
                  value={assignForm.teacherId}
                  onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignTeacherModal(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  {submitting ? "Assigning..." : "Assign Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
