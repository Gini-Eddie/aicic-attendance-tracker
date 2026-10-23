import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { StudentAttendanceProfile } from "../types";
import {
  X,
  CheckCircle2,
  XCircle,
  Calendar,
  Pencil,
  Check,
  Clock
} from "lucide-react";

interface StudentProfileModalProps {
  studentId: string;
  courseId?: string;
  onClose: () => void;
  onUpdated?: () => void;
}

function toDateTimeLocalValue(isoString: string | null | undefined, fallbackIso?: string): string {
  const source = isoString || fallbackIso;
  const date = source ? new Date(source) : new Date();
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  studentId,
  courseId,
  onClose,
  onUpdated
}) => {
  const [profileData, setProfileData] = useState<StudentAttendanceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editing state for a specific session entry in the student's attendance log
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<"Present" | "Absent">("Present");
  const [editCheckInTime, setEditCheckInTime] = useState("");
  const [editSessionDate, setEditSessionDate] = useState("");

  const loadProfile = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data = await api.getStudentAttendanceProfile(studentId, courseId);
      setProfileData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load student profile");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(true);
  }, [studentId, courseId]);

  const startEditingHistoryItem = (h: {
    session_id: string;
    session_date: string;
    status: "Present" | "Absent";
    check_in_time: string | null;
  }) => {
    setActionError(null);
    setEditingSessionId(h.session_id);
    setEditStatus(h.status);
    setEditCheckInTime(toDateTimeLocalValue(h.check_in_time, h.session_date));
    setEditSessionDate(toDateTimeLocalValue(h.session_date));
  };

  const handleSaveHistoryItem = async (h: {
    session_id: string;
    session_date: string;
    status: "Present" | "Absent";
    check_in_time: string | null;
  }) => {
    setSaving(true);
    setActionError(null);
    try {
      // 1. If session date/time was modified, update the session
      const originalSessionLocal = toDateTimeLocalValue(h.session_date);
      if (editSessionDate && editSessionDate !== originalSessionLocal) {
        const parsedSessionDate = new Date(editSessionDate);
        if (isNaN(parsedSessionDate.getTime())) {
          setActionError("Please enter a valid session date and time.");
          setSaving(false);
          return;
        }
        await api.updateSession(h.session_id, { starts_at: parsedSessionDate.toISOString() });
      }

      // 2. Update the student's attendance status & check-in timestamp for this session
      let checkedInIso: string | null = null;
      if (editStatus === "Present" && editCheckInTime) {
        const parsedCheckIn = new Date(editCheckInTime);
        if (isNaN(parsedCheckIn.getTime())) {
          setActionError("Please enter a valid check-in date and time.");
          setSaving(false);
          return;
        }
        checkedInIso = parsedCheckIn.toISOString();
      }

      await api.updateAttendance(h.session_id, studentId, {
        status: editStatus,
        checked_in_at: checkedInIso
      });

      await loadProfile(false);
      setEditingSessionId(null);
      onUpdated?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to update attendance record.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleStatus = async (h: {
    session_id: string;
    session_date: string;
    status: "Present" | "Absent";
    check_in_time: string | null;
  }) => {
    const nextStatus = h.status === "Present" ? "Absent" : "Present";
    setSaving(true);
    setActionError(null);
    try {
      await api.updateAttendance(h.session_id, studentId, {
        status: nextStatus,
        checked_in_at: nextStatus === "Present" ? h.session_date : null
      });
      await loadProfile(false);
      onUpdated?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to update attendance status.");
    } finally {
      setSaving(false);
    }
  };

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
                onClick={() => {
                  setSelectedCourseIndex(idx);
                  setEditingSessionId(null);
                  setActionError(null);
                }}
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

        {actionError && (
          <div role="alert" className="mt-3 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {currentProfile ? (
          <>
            {/* Core Attendance Statistics */}
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
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700 flex items-center justify-between">
                <span>Attendance Log for {currentProfile.course_name}</span>
                <span className="text-[11px] font-normal text-slate-500">Click Edit to modify status, check-in time, or session date</span>
              </div>
              <div className="divide-y divide-slate-100">
                {currentProfile.history.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No sessions recorded for this course yet
                  </div>
                ) : (
                  currentProfile.history.map((h) => {
                    const isEditing = editingSessionId === h.session_id;

                    return (
                      <div key={h.session_id} className="p-3 px-4 text-xs hover:bg-slate-50 transition-colors">
                        {!isEditing ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
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
                              <span className="text-[11px] text-slate-400">
                                {new Date(h.session_date).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
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

                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => startEditingHistoryItem(h)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-semibold transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleQuickToggleStatus(h)}
                                className={`font-semibold ${
                                  h.status === "Present"
                                    ? "text-rose-700 hover:text-rose-800"
                                    : "text-emerald-700 hover:text-emerald-800"
                                }`}
                              >
                                {h.status === "Present" ? "Mark absent" : "Mark present"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Status</span>
                                <select
                                  aria-label="Attendance status"
                                  value={editStatus}
                                  onChange={(e) => {
                                    const next = e.target.value as "Present" | "Absent";
                                    setEditStatus(next);
                                    if (next === "Present" && !editCheckInTime) {
                                      setEditCheckInTime(toDateTimeLocalValue(h.check_in_time, h.session_date));
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                                >
                                  <option value="Present">Present</option>
                                  <option value="Absent">Absent</option>
                                </select>
                              </label>

                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  Check-in Timestamp
                                </span>
                                <input
                                  type="datetime-local"
                                  aria-label="Check-in timestamp"
                                  disabled={editStatus !== "Present"}
                                  value={editStatus === "Present" ? editCheckInTime : ""}
                                  onChange={(e) => setEditCheckInTime(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              </label>

                              <label className="block">
                                <span className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  Session Date & Time
                                </span>
                                <input
                                  type="datetime-local"
                                  aria-label="Session date and time"
                                  value={editSessionDate}
                                  onChange={(e) => setEditSessionDate(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => setEditingSessionId(null)}
                                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-medium transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSaveHistoryItem(h)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                {saving ? "Saving..." : "Save changes"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
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
