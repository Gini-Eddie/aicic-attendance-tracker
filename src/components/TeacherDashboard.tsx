import React from "react";
import { TeacherDashboardData } from "../types";
import { 
  BookOpen, 
  Users, 
  Calendar, 
  TrendingUp, 
  Play, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Sparkles
} from "lucide-react";

interface TeacherDashboardProps {
  data: TeacherDashboardData;
  onSelectCourse: (courseId: string) => void;
  onStartCourseAttendance: (courseId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  data,
  onSelectCourse,
  onStartCourseAttendance
}) => {
  // Determine time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Greeting Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-700/50">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-semibold mb-3 border border-slate-700">
            <Sparkles className="w-3.5 h-3.5" />
            Instructor Portal • AICIC Concepts
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {getGreeting()}, {data.teacher_name}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Manage your physical training programmes, conduct real-time class attendance verification, and inspect student check-in records.
          </p>
        </div>
      </div>

      {/* Overview Statistics Section as specified:
          Assigned Courses, Today's Sessions, Average Attendance */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>Overview</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Assigned Courses
              </span>
              <span className="text-2xl font-black text-slate-900">
                {data.stats.assigned_courses_count}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Today's Sessions
              </span>
              <span className="text-2xl font-black text-slate-900">
                {data.stats.today_sessions_count}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Average Attendance
              </span>
              <span className="text-2xl font-black text-slate-900">
                {data.stats.average_attendance}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* My Courses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Courses</h2>
            <p className="text-xs text-slate-500">Programmes assigned to your instructor profile</p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {data.courses.length} Active Programmes
          </span>
        </div>

        {data.courses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No courses assigned yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Please contact the AICIC Concepts administrator to assign training programmes to your account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.courses.map((course) => {
              const hasActiveSession = Boolean(course.active_session_id);

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {course.name.slice(0, 2).toUpperCase()}
                      </span>
                      {hasActiveSession && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                          Session Active
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-slate-900 line-clamp-1 mb-1.5">
                      {course.name}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                      {course.description || "Physical training course curriculum."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Enrolled Students</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {course.enrolled_count} students
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Recent Attendance</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          {course.recent_attendance !== null ? (
                            <span className={course.recent_attendance >= 80 ? "text-emerald-600" : "text-amber-600"}>
                              {course.recent_attendance}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">None recorded</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      id={`view-course-btn-${course.id}`}
                      onClick={() => onSelectCourse(course.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors flex items-center gap-1"
                    >
                      View Course
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`quick-start-btn-${course.id}`}
                      onClick={() => onStartCourseAttendance(course.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                      {hasActiveSession ? "Resume" : "Start Attendance"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
