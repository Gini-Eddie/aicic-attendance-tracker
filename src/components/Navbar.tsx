import React from "react";
import { User } from "../types";
import { 
  GraduationCap, 
  UserCheck, 
  LogOut, 
  Shield, 
  UserCircle, 
  QrCode, 
  BookOpen, 
  RefreshCw,
  Sparkles
} from "lucide-react";

interface NavbarProps {
  currentUser: User | null;
  viewMode: "admin" | "teacher";
  onSwitchView: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onQuickLogin: (email: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  viewMode,
  onSwitchView,
  onOpenLogin,
  onLogout,
  activeView,
  setActiveView,
  onQuickLogin,
}) => {
  const effectiveRole = currentUser?.role === "admin" ? viewMode : currentUser?.role;
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo Placeholder */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView("dashboard")}>
            {/* Logo placeholder area for AICIC Concepts */}
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-slate-900 text-lg">AICIC CONCEPTS</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Attendance
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Physical Training Programmes Management
              </p>
            </div>
          </div>

          {/* Center Navigation if Logged In */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button
                id="nav-dashboard-btn"
                onClick={() => setActiveView("dashboard")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeView === "dashboard"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dashboard
              </button>

              {effectiveRole === "admin" && (
                <>
                  <button
                    id="nav-admin-courses-btn"
                    onClick={() => setActiveView("courses")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeView === "courses"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Courses
                  </button>
                  <button
                    id="nav-admin-teachers-btn"
                    onClick={() => setActiveView("teachers")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeView === "teachers"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Teachers
                  </button>
                  <button
                    id="nav-admin-students-btn"
                    onClick={() => setActiveView("students")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeView === "students"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Students
                  </button>
                </>
              )}

              {effectiveRole === "teacher" && (
                <button
                  id="nav-my-courses-btn"
                  onClick={() => setActiveView("courses")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeView === "courses"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  My Courses
                </button>
              )}
            </div>
          )}

          {/* Right Action / Profile */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-900 flex items-center justify-end gap-1.5">
                    {currentUser.role === "admin" ? (
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <UserCircle className="w-3.5 h-3.5 text-teal-600" />
                    )}
                    <span>{currentUser.name}</span>
                  </div>
                  <span className={`inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.2 rounded ${
                    currentUser.role === "admin"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-teal-100 text-teal-800"
                  }`}>
                    {currentUser.role}
                  </span>
                </div>

                <button type="button" onClick={() => setActiveView("settings")} className={`px-3 py-2 text-sm rounded-lg ${activeView === "settings" ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100"}`}>Settings</button>
                {currentUser.role === "teacher" && <button type="button" className="md:hidden text-sm px-2 py-2" onClick={() => setActiveView("courses")}>My Courses</button>}

                <button
                  id="navbar-logout-btn"
                  onClick={onLogout}
                  title="Log out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="navbar-login-btn"
                  onClick={onOpenLogin}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {currentUser && <div className="max-w-7xl mx-auto px-4 pb-2 flex flex-wrap gap-2 text-xs">
        {currentUser.role === "admin" && <button onClick={onSwitchView} className="rounded-lg bg-sky-100 text-sky-800 px-3 py-2 font-semibold">Switch to {viewMode === "admin" ? "tutor" : "admin"} view</button>}
        <button onClick={() => setActiveView("operations")} className="rounded-lg border border-slate-200 px-3 py-2">{currentUser.role === "admin" ? "Attendance desk, staff & notifications" : "Verify desk attendance"}</button>
        <button className="md:hidden rounded-lg border px-3 py-2" onClick={() => setActiveView("dashboard")}>Dashboard</button>
        <button className="md:hidden rounded-lg border px-3 py-2" onClick={() => setActiveView("courses")}>Courses</button>
      </div>}
    </header>
  );
};
