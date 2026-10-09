import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Course, Student, AttendanceSession } from "../types";
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Search,
  BookOpen,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface CourseDetailViewProps {
  courseId: string;
  onBack: () => void;
  onStartSessionSuccess: (sessionId: string) => void;
  onViewSessionDetail: (sessionId: string) => void;
  onViewStudentProfile: (studentId: string) => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  courseId,
  onBack,
  onStartSessionSuccess,
  onViewSessionDetail,
  onViewStudentProfile
}) => {
  const [data, setData] = useState<{
    course: Course;
    teachers: { id: string; name: string; email: string }[];
    students: Student[];
    sessions: AttendanceSession[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "students">("history");
  const [studentSearch, setStudentSearch] = useState("");
  const [rosterForm, setRosterForm] = useState({ name: "", code: "", email: "" });
  const [savingStudent, setSavingStudent] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getCourse(courseId);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load course details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const handleStartAttendance = async () => {
    setStartingSession(true);
    try {
      const newSession = await api.startSession(courseId, durationMinutes);
      setShowDurationModal(false);
      onStartSessionSuccess(newSession.id);
    } catch (err: any) {
      alert(err.message || "Failed to start attendance session.");
    } finally {
      setStartingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs text-slate-500">Loading course curriculum and attendance logs...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Unable to load course</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { course, teachers, students, sessions } = data;

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.student_code.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Check if there is an active session right now
  const activeSession = sessions.find(
    s => s.status === "active" && new Date(s.expires_at) > new Date()
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
              {activeSession && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  Session Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instructors: {teachers.map(t => t.name).join(", ") || "Unassigned"} • {students.length} Enrolled Students
            </p>
          </div>
        </div>

        {/* Start Attendance Action */}
        <div className="flex items-center gap-2">
          {activeSession ? (
            <button
              id="resume-attendance-btn"
              onClick={() => onStartSessionSuccess(activeSession.id)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Resume Active Session
            </button>
          ) : (
            <button
              id="start-attendance-btn"
              onClick={() => setShowDurationModal(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              Start Attendance
            </button>
          )}
        </div>
      </div>

      {/* Course Info Summary Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Course Overview
          </span>
          <p className="text-sm text-slate-700 leading-relaxed">
            {course.description || "Physical technology training and practical hands-on lectures."}
          </p>
        </div>
        <div className="flex items-center gap-4 text-center shrink-0 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
          <div>
            <span className="text-2xl font-extrabold text-slate-900">{students.length}</span>
            <span className="block text-xs text-slate-500">Students</span>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900">{sessions.length}</span>
            <span className="block text-xs text-slate-500">Classes Held</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "history"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Attendance History ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "students"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Enrolled Students ({students.length})
        </button>
      </div>

      {/* TAB 1: Attendance History Table */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Previous Attendance Sessions</h3>
              <p className="text-xs text-slate-500">Click any session row to inspect student attendance</p>
            </div>
            {sessions.length > 0 && (
              <span className="text-xs text-slate-500">
                Total Sessions: {sessions.length}
              </span>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-700">No attendance sessions recorded yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Click "Start Attendance" above to generate a live QR code and temporary link for your students.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Present</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Total Students</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Attendance Rate</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sessions.map((sess) => {
                    const sessionDate = new Date(sess.starts_at);
                    const formattedDate = sessionDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    });
                    const formattedTime = sessionDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <tr
                        key={sess.id}
                        onClick={() => onViewSessionDetail(sess.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">{formattedDate}</span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formattedTime}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            sess.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {sess.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                          {sess.present_count ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {sess.total_students ?? students.length}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            (sess.attendance_rate ?? 0) >= 80
                              ? "text-emerald-700 bg-emerald-50"
                              : (sess.attendance_rate ?? 0) >= 60
                              ? "text-amber-700 bg-amber-50"
                              : "text-rose-700 bg-rose-50"
                          }`}>
                            {sess.attendance_rate ?? 0}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-rose-700 mr-3" onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm("Delete this session and all its attendance records? This cannot be undone.")) return;
                            try { await api.deleteSession(sess.id); await fetchCourseData(); }
                            catch (err: any) { alert(err.message); }
                          }}>Delete session</button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewSessionDetail(sess.id);
                            }}
                            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Enrolled Students List */}
      {activeTab === "students" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <form className="p-4 space-y-3 border-b border-slate-200" onSubmit={async (e) => {
            e.preventDefault(); setSavingStudent(true); setRosterError("");
            try {
              const student = await api.addRosterStudent(courseId, rosterForm.name, rosterForm.code, rosterForm.email);
              setData(prev => prev ? { ...prev, students: [...prev.students, student] } : prev);
              setRosterForm({ name: "", code: "", email: "" });
            } catch (err: any) { setRosterError(err.message); }
            finally { setSavingStudent(false); }
          }}>
            <h3 className="font-bold">Add student to this course</h3>
            <p className="text-xs text-slate-600">Use any registration format. Guide: MATRIX-AI-001 = Matrix cohort, AI/ML track, student 001. Each student needs a distinct number.</p>
            <label className="block text-sm">Full name<input required minLength={2} maxLength={255} className="block border rounded p-2 w-full" value={rosterForm.name} onChange={e => setRosterForm({ ...rosterForm, name: e.target.value })} /></label>
            <label className="block text-sm">Registration number<input required minLength={2} maxLength={64} className="block border rounded p-2 w-full" value={rosterForm.code} onChange={e => setRosterForm({ ...rosterForm, code: e.target.value })} placeholder="MATRIX-AI-001" /></label>
            <label className="block text-sm">Email (optional)<input type="email" className="block border rounded p-2 w-full" value={rosterForm.email} onChange={e => setRosterForm({ ...rosterForm, email: e.target.value })} /></label>
            {rosterError && <p role="alert" className="text-rose-700">{rosterError}</p>}
            <button disabled={savingStudent} className="bg-sky-700 text-white rounded px-4 py-2">{savingStudent ? "Saving..." : "Add student"}</button>
          </form>
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Registered Course Roster</h3>
              <p className="text-xs text-slate-500">Students eligible to record attendance for this course</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student code or name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Student Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Student Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Email Address</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No students found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {s.full_name}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-600">
                        {s.student_code}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {s.email}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onViewStudentProfile(s.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 transition-colors"
                        >
                          View Attendance Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Start Attendance Duration Configuration Modal */}
      {showDurationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Start Attendance Session</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select the time window before this attendance QR code and link automatically expire.
            </p>

            <div className="space-y-2 mb-5">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    durationMinutes === mins
                      ? "border-sky-600 bg-sky-50/70 text-sky-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {mins} Minutes Active Window
                  </span>
                  {mins === 10 && (
                    <span className="text-[10px] uppercase font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDurationModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                id="confirm-start-session-btn"
                onClick={handleStartAttendance}
                disabled={startingSession}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
              >
                {startingSession ? "Generating..." : "Open Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
