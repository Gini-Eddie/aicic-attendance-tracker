import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { StudentAttendanceProfile } from "../types";
import { 
  X, 
  User, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BarChart3,
  Calendar
} from "lucide-react";

interface StudentProfileModalProps {
  studentId: string;
  courseId?: string;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  studentId,
  courseId,
  onClose
}) => {
  const [profileData, setProfileData] = useState<StudentAttendanceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await api.getStudentAttendanceProfile(studentId, courseId);
        setProfileData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load student profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [studentId, courseId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Loading student attendance records...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full">
          <p className="text-sm text-rose-600 font-medium mb-4">{error || "Could not find student"}</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { student, profiles } = profileData;
  const currentProfile = profiles[selectedCourseIndex] || profiles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-base">
              {student.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{student.full_name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {student.student_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Course Selector if enrolled in multiple */}
        {profiles.length > 1 && (
          <div className="flex gap-2 py-3 border-b border-slate-100 overflow-x-auto">
            {profiles.map((p, idx) => (
              <button
                key={p.course_id}
                onClick={() => setSelectedCourseIndex(idx)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  selectedCourseIndex === idx
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.course_name}
              </button>
            ))}
          </div>
        )}

        {currentProfile ? (
          <>
            {/* Core Attendance Statistics as specified in prompt:
                Student Name, Course, Attendance Rate, Classes Held, Classes Attended, Classes Missed */}
            <div className="my-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Course: {currentProfile.course_name}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  currentProfile.attendance_rate >= 80
                    ? "bg-emerald-100 text-emerald-800"
                    : currentProfile.attendance_rate >= 60
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}>
                  Attendance Rate: {currentProfile.attendance_rate}%
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Rate</span>
                  <span className="text-lg font-bold text-sky-600">{currentProfile.attendance_rate}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Classes Held</span>
                  <span className="text-lg font-bold text-slate-800">{currentProfile.classes_held}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Attended</span>
                  <span className="text-lg font-bold text-emerald-600">{currentProfile.classes_attended}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Missed</span>
                  <span className="text-lg font-bold text-rose-600">{currentProfile.classes_missed}</span>
                </div>
              </div>
            </div>

            {/* Attendance History Timeline */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700">
                Attendance Log for {currentProfile.course_name}
              </div>
              <div className="divide-y divide-slate-100">
                {currentProfile.history.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No sessions recorded for this course yet
                  </div>
                ) : (
                  currentProfile.history.map((h, i) => (
                    <div key={i} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">
                          {new Date(h.session_date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {h.status === "Present" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
                            <XCircle className="w-3 h-3" />
                            Absent
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px] font-mono w-16 text-right">
                          {h.check_in_time
                            ? new Date(h.check_in_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            Student is not currently enrolled in any courses.
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
