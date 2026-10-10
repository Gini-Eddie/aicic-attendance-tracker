import React, { useState, useEffect, useRef } from "react";
import { api } from "./services/api";
import { User, TeacherDashboardData, AdminDashboardData } from "./types";
import { AttendanceOperations } from "./components/AttendanceOperations";
import { MyCourses } from "./components/MyCourses";
import { AccountSettings } from "./components/AccountSettings";
import { Navbar } from "./components/Navbar";
import { LoginModal } from "./components/LoginModal";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { CourseDetailView } from "./components/CourseDetailView";
import { ActiveAttendanceScreen } from "./components/ActiveAttendanceScreen";
import { SessionHistoryDetailModal } from "./components/SessionHistoryDetailModal";
import { StudentProfileModal } from "./components/StudentProfileModal";
import { StudentCheckInPage } from "./components/StudentCheckInPage";
import { 
  GraduationCap, 
  Shield, 
  UserCheck, 
  Key, 
  QrCode, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Clock,
  Sparkles
} from "lucide-react";

export default function App() {
  const attendanceTokenFromUrl = window.location.pathname.match(/^\/attendance\/([a-zA-Z0-9_-]+)\/?$/)?.[1]
    || new URLSearchParams(window.location.search).get("token");
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(api.getUser());
  const [viewMode, setViewMode] = useState<"admin" | "teacher">("admin");
  const effectiveRole = currentUser?.role === "admin" ? viewMode : currentUser?.role;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = currentUser ? localStorage.getItem(`aicic_theme_${currentUser.id}`) : "light";
    setTheme(saved === "dark" ? "dark" : "light");
  }, [currentUser?.id]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const changeTheme = (value: "light" | "dark") => {
    setTheme(value);
    if (currentUser) localStorage.setItem(`aicic_theme_${currentUser.id}`, value);
  };
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active navigation view
  // "dashboard" | "courses" | "teachers" | "students" | "course-detail" | "active-session" | "student-checkin"
  const [activeView, setActiveView] = useState<string>(attendanceTokenFromUrl ? "student-checkin" : "dashboard");
  const [noticeCount, setNoticeCount] = useState(0);
  useEffect(() => {
    if (currentUser?.role !== "admin" || attendanceTokenFromUrl) {setNoticeCount(0); return;}
    let cancelled = false;
    const load = () => api.getNotifications().then(items => {if (!cancelled) setNoticeCount(items.filter(n => !n.read).length);}).catch(() => {});
    load(); const timer = setInterval(load, 60000);
    return () => {cancelled = true; clearInterval(timer);};
  }, [currentUser?.id, activeView]);

  // Selected entities for drill-down views
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inspectSessionId, setInspectSessionId] = useState<string | null>(null);
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  // Public Attendance Token (e.g. from URL path /attendance/:token)
  const [publicToken, setPublicToken] = useState<string | null>(attendanceTokenFromUrl);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | TeacherDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const dashboardRequest = useRef(0);

  // Detect URL path or query for public student attendance (/attendance/:token)
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/attendance\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      setPublicToken(match[1]);
      setActiveView("student-checkin");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setPublicToken(tokenParam);
      setActiveView("student-checkin");
    }
  }, []);

  // Validate session on start
  useEffect(() => {
    const verifyUser = async () => {
      if (api.getToken()) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
        } catch (e) {
          api.clearSession();
          setCurrentUser(null);
        }
      }
    };
    verifyUser();
  }, []);

  // Fetch dashboard data whenever currentUser changes or view becomes "dashboard"
  const fetchDashboard = async () => {
    if (!currentUser) return;
    const requestId = ++dashboardRequest.current;
    setLoadingDashboard(true);
    try {
      const data = await api.getDashboard(effectiveRole);
      if (requestId === dashboardRequest.current) setDashboardData(data);
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    } finally {
      if (requestId === dashboardRequest.current) setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (currentUser && activeView === "dashboard" && effectiveRole === "teacher") {
      fetchDashboard();
    } else {
      dashboardRequest.current += 1;
      setDashboardData(null);
    }
  }, [currentUser, activeView, viewMode]);

  const handleSignUp = async (name: string, email: string, pass: string, courseName: string, invitationCode: string, role: "admin" | "teacher") => {
    setLoginError(null);
    const res = await api.registerTeacher(name, email, pass, courseName, invitationCode, role);
    setCurrentUser(res.user);
    setActiveView("dashboard");
    setSelectedCourseId(null);
    setActiveSessionId(null);
  };

  const handleLogin = async (email: string, pass: string) => {
    setLoginError(null);
    const res = await api.login(email, pass);
    setCurrentUser(res.user);
    setActiveView("dashboard");
    setSelectedCourseId(null);
    setActiveSessionId(null);
  };

  const handleQuickLogin = async (email: string) => {
    let password = "teacher123Password!";
    if (email.includes("admin")) {
      password = "admin123Password!";
    }
    try {
      await handleLogin(email, password);
    } catch (e: any) {
      alert(e.message || "Failed to switch user");
    }
  };

  const handleLogout = () => {
    api.clearSession();
    setCurrentUser(null);
    setDashboardData(null);
    setActiveView("dashboard");
    setSelectedCourseId(null);
    setActiveSessionId(null);
  };

  // Navigation handlers
  const handleOpenCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveView("course-detail");
  };

  const handleStartCourseAttendance = async (courseId: string) => {
    try {
      const session = await api.startSession(courseId, 10);
      setActiveSessionId(session.id);
      setSelectedCourseId(courseId);
      setActiveView("active-session");
    } catch (e: any) {
      alert(e.message || "Failed to start attendance session");
    }
  };

  const handleSessionStarted = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setActiveView("active-session");
  };

  const handleOpenCheckInSimulator = (token: string) => {
    setPublicToken(token);
    setActiveView("student-checkin");
  };

  // If viewing public attendance check-in page
  if (activeView === "student-checkin" && publicToken) {
    return (
      <StudentCheckInPage
        token={publicToken}
        onBackToApp={currentUser && ["teacher", "admin"].includes(currentUser.role) ? () => {
          setPublicToken(null);
          setActiveView("dashboard");
        } : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        viewMode={viewMode}
        onSwitchView={() => {setViewMode(viewMode === "admin" ? "teacher" : "admin"); setActiveView("dashboard"); setDashboardData(null);}}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        activeView={activeView}
        setActiveView={(view) => {
          setSelectedCourseId(null);
          setActiveSessionId(null);
          setActiveView(view);
        }}
        onQuickLogin={handleQuickLogin}
      />

      {currentUser?.role === "admin" && noticeCount > 0 && <button className="text-sm text-sky-800 bg-sky-50 px-4 py-2 text-center" onClick={() => setActiveView("operations")}>{noticeCount} unread admin notification{noticeCount === 1 ? "" : "s"} · View activity</button>}
      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentUser ? (
          /* Logged Out / Welcome Landing Screen */
          <div className="max-w-4xl mx-auto py-8">
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-sky-400 flex items-center justify-center mx-auto mb-6 shadow-md">
                <GraduationCap className="w-9 h-9" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                AICIC Concepts
              </h1>
              <p className="text-lg font-semibold text-sky-700 mt-1">
                Attendance Management System
              </p>
              <p className="text-sm text-slate-600 max-w-xl mx-auto mt-3 leading-relaxed">
                Dedicated attendance verification platform for physical technology training programmes and cohorts. Featuring secure QR code generation, real-time live polling, and student attendance analytics.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  id="landing-signin-btn"
                  onClick={() => setIsLoginOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Sign In to System
                </button>
              </div>

              {/* Fast 1-Click Persona Demos */}

            </div>
          </div>
        ) : (
          /* Logged In Application Screens */
          <div>
            {activeView === "operations" && <AttendanceOperations user={currentUser} />}
            {activeView === "settings" && <AccountSettings user={currentUser} theme={theme} onThemeChange={changeTheme} onSaved={setCurrentUser} />}
            {activeView === "courses" && effectiveRole === "teacher" && <MyCourses onSelectCourse={handleOpenCourse} />}
            {/* View 1: Active Attendance Session (QR Screen) */}
            {activeView === "active-session" && activeSessionId && (
              <ActiveAttendanceScreen
                sessionId={activeSessionId}
                onCloseSession={() => {
                  setActiveView("course-detail");
                }}
                onBack={() => {
                  setActiveView(selectedCourseId ? "course-detail" : "dashboard");
                }}
                onOpenCheckInSimulator={handleOpenCheckInSimulator}
              />
            )}

            {/* View 2: Course Detail Screen */}
            {activeView === "course-detail" && selectedCourseId && (
              <CourseDetailView
                courseId={selectedCourseId}
                onBack={() => {
                  setSelectedCourseId(null);
                  setActiveView("dashboard");
                }}
                onStartSessionSuccess={handleSessionStarted}
                onViewSessionDetail={(sessId) => setInspectSessionId(sessId)}
                onViewStudentProfile={(stuId) => setInspectStudentId(stuId)}
              />
            )}

            {/* View 3: Primary Dashboard */}
            {activeView === "dashboard" && (
              <>
                {effectiveRole === "admin" && (
                  <AdminDashboard
                    onInspectSession={(sessId) => setInspectSessionId(sessId)}
                    onViewStudentProfile={(stuId) => setInspectStudentId(stuId)}
                    onSelectCourse={handleOpenCourse}
                  />
                )}

                {effectiveRole === "teacher" && !dashboardData && <p role="status">{loadingDashboard ? "Loading your dashboard..." : "Unable to load your dashboard."} <button className="underline" onClick={fetchDashboard}>Retry</button></p>}
                {effectiveRole === "teacher" && dashboardData && (
                  <TeacherDashboard
                    data={dashboardData as TeacherDashboardData}
                    onSelectCourse={handleOpenCourse}
                    onStartCourseAttendance={handleStartCourseAttendance}
                  />
                )}
              </>
            )}

            {/* Views 4+: Admin Direct Views (Courses, Teachers, Students) */}
            {effectiveRole === "admin" && (activeView === "courses" || activeView === "teachers" || activeView === "students") && (
              <AdminDashboard
                initialTab={activeView as "courses" | "teachers" | "students"}
                onInspectSession={(sessId) => setInspectSessionId(sessId)}
                onViewStudentProfile={(stuId) => setInspectStudentId(stuId)}
                onSelectCourse={handleOpenCourse}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">AICIC Concepts</span>
            <span>•</span>
            <span>Attendance Management System</span>
          </div>
          <div>
            Physical Training Programmes & Course Session Verification
          </div>
        </div>
      </footer>

      {/* Modals */}
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          errorMessage={loginError}
        />

      {inspectSessionId && (
        <SessionHistoryDetailModal
          sessionId={inspectSessionId}
          onClose={() => setInspectSessionId(null)}
          onViewStudentProfile={(studentId) => {
            setInspectSessionId(null);
            setInspectStudentId(studentId);
          }}
        />
      )}

      {inspectStudentId && (
        <StudentProfileModal
          studentId={inspectStudentId}
          courseId={selectedCourseId || undefined}
          onClose={() => setInspectStudentId(null)}
        />
      )}
    </div>
  );
}
