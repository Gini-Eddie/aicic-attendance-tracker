import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { SessionDetail, StudentSessionBreakdown } from "../types";
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Pencil,
  Check
} from "lucide-react";

interface SessionHistoryDetailModalProps {
  sessionId: string;
  onClose: () => void;
  onViewStudentProfile?: (studentId: string) => void;
  onUpdated?: () => void;
}

function toDateTimeLocalValue(isoString: string | null | undefined, fallbackIso?: string): string {
  const source = isoString || fallbackIso;
  const date = source ? new Date(source) : new Date();
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const SessionHistoryDetailModal: React.FC<SessionHistoryDetailModalProps> = ({
  sessionId,
  onClose,
  onViewStudentProfile,
  onUpdated
}) => {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "present" | "absent">("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Session date/time editing state
  const [editingSessionDate, setEditingSessionDate] = useState(false);
  const [sessionStartsAtInput, setSessionStartsAtInput] = useState("");

  // Student attendance record editing state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<"Present" | "Absent">("Present");
  const [editCheckInTime, setEditCheckInTime] = useState("");

  const loadDetail = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data = await api.getSession(sessionId);
      setDetail(data);
    } catch (err: any) {
      setError(err.message || "Failed to load session history");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail(true);
  }, [sessionId]);

  const startEditingSessionDate = () => {
    if (!detail?.session.starts_at) return;
    setActionError(null);
    setSessionStartsAtInput(toDateTimeLocalValue(detail.session.starts_at));
    setEditingSessionDate(true);
  };

  const handleSaveSessionDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionStartsAtInput) return;
    const parsed = new Date(sessionStartsAtInput);
    if (isNaN(parsed.getTime())) {
      setActionError("Please enter a valid session date and time.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await api.updateSession(sessionId, { starts_at: parsed.toISOString() });
      await loadDetail(false);
      setEditingSessionDate(false);
      onUpdated?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to update session date and time.");
    } finally {
      setSaving(false);
    }
  };

  const startEditingStudent = (s: StudentSessionBreakdown) => {
    setActionError(null);
    setEditingStudentId(s.student_id);
    setEditStatus(s.status === "Present" ? "Present" : "Absent");
    setEditCheckInTime(toDateTimeLocalValue(s.checked_in_at, detail?.session.starts_at));
  };

  const handleSaveStudentAttendance = async (studentId: string) => {
    setSaving(true);
    setActionError(null);
    try {
      let checkedInIso: string | null = null;
      if (editStatus === "Present" && editCheckInTime) {
        const parsed = new Date(editCheckInTime);
        if (isNaN(parsed.getTime())) {
          setActionError("Please provide a valid check-in date and time.");
          setSaving(false);
          return;
        }
        checkedInIso = parsed.toISOString();
      }
      await api.updateAttendance(sessionId, studentId, {
        status: editStatus,
        checked_in_at: checkedInIso
      });
      await loadDetail(false);
      setEditingStudentId(null);
      onUpdated?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to update attendance record.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickMarkPresent = async (s: StudentSessionBreakdown) => {
    setSaving(true);
    setActionError(null);
    try {
      await api.updateAttendance(sessionId, s.student_id, {
        status: "Present",
        checked_in_at: detail?.session.starts_at || new Date().toISOString()
      });
      await loadDetail(false);
      onUpdated?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to mark student present.");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = (detail?.student_breakdown || []).filter((s) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "present" && s.status === "Present") ||
      (filter === "absent" && s.status !== "Present");

    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_code.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">Class Attendance Session</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                detail?.session.status === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
              }`}>
                {detail?.session.status === "active" ? "Active" : "Closed"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-xs text-slate-500">
                {detail?.course?.name} • Session:{" "}
                {detail?.session.starts_at
                  ? `${new Date(detail.session.starts_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })} at ${new Date(detail.session.starts_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}`
                  : ""}
              </p>
              {detail && !editingSessionDate && (
                <button
                  type="button"
                  onClick={startEditingSessionDate}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800 px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit session date/time
                </button>
              )}
            </div>

            {editingSessionDate && (
              <form onSubmit={handleSaveSessionDate} className="mt-2.5 flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Session Date & Time:</span>
                  <input
                    type="datetime-local"
                    aria-label="Session date and time"
                    value={sessionStartsAtInput}
                    onChange={(e) => setSessionStartsAtInput(e.target.value)}
                    required
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingSessionDate(false)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading student attendance records...</p>
          </div>
        ) : error || !detail ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            {error || "Could not load session details"}
          </div>
        ) : (
          <>
            {actionError && (
              <div role="alert" className="mt-3 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                <span>{actionError}</span>
                <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">
                  ✕
                </button>
              </div>
            )}

            {/* Stats Summary Bar */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Present</span>
                <span className="text-xl font-extrabold text-emerald-600">{detail.checked_in_count}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Not recorded</span>
                <span className="text-xl font-extrabold text-rose-600">{detail.total_enrolled - detail.checked_in_count}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Attendance Rate</span>
                <span className="text-xl font-extrabold text-sky-600">{detail.attendance_rate}%</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                    filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({detail.student_breakdown.length})
                </button>
                <button
                  onClick={() => setFilter("present")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                    filter === "present" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Present ({detail.checked_in_count})
                </button>
                <button
                  onClick={() => setFilter("absent")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                    filter === "absent" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Not recorded ({detail.total_enrolled - detail.checked_in_count})
                </button>
              </div>
            </div>

            {/* Table of Individual Student Attendance */}
            <div className="overflow-y-auto border border-slate-200 rounded-xl flex-1">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Student</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Student Code</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Check-in Time</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No students match the current filter
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const isEditing = editingStudentId === s.student_id;

                      return (
                        <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5">
                            {onViewStudentProfile ? (
                              <button
                                onClick={() => onViewStudentProfile(s.student_id)}
                                className="font-semibold text-slate-900 hover:text-sky-600 text-left"
                              >
                                {s.full_name}
                              </button>
                            ) : (
                              <span className="font-semibold text-slate-900">{s.full_name}</span>
                            )}
                            <span className="text-[11px] text-slate-400 block">{s.email}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">{s.student_code}</td>
                          <td className="px-4 py-2.5 text-center">
                            {isEditing ? (
                              <select
                                aria-label={`Attendance status for ${s.full_name}`}
                                value={editStatus}
                                onChange={(e) => {
                                  const nextStatus = e.target.value as "Present" | "Absent";
                                  setEditStatus(nextStatus);
                                  if (nextStatus === "Present" && !editCheckInTime) {
                                    setEditCheckInTime(toDateTimeLocalValue(s.checked_in_at, detail.session.starts_at));
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                              </select>
                            ) : s.status === "Present" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                <XCircle className="w-3 h-3" />
                                {s.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                            {isEditing ? (
                              editStatus === "Present" ? (
                                <input
                                  type="datetime-local"
                                  aria-label={`Check-in time for ${s.full_name}`}
                                  value={editCheckInTime}
                                  onChange={(e) => setEditCheckInTime(e.target.value)}
                                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              ) : (
                                <span className="text-slate-400">—</span>
                              )
                            ) : s.checked_in_at ? (
                              new Date(s.checked_in_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleSaveStudentAttendance(s.student_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => setEditingStudentId(null)}
                                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => startEditingStudent(s)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-semibold transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </button>
                                {s.status === "Present" ? (
                                  <button
                                    type="button"
                                    disabled={saving}
                                    className="text-rose-700 hover:text-rose-800 font-medium"
                                    onClick={async () => {
                                      if (!window.confirm(`Delete the attendance record for ${s.full_name}?`)) return;
                                      setSaving(true);
                                      setActionError(null);
                                      try {
                                        await api.deleteAttendance(sessionId, s.student_id);
                                        await loadDetail(false);
                                        onUpdated?.();
                                      } catch (err: any) {
                                        setActionError(err.message || "Failed to delete attendance record.");
                                      } finally {
                                        setSaving(false);
                                      }
                                    }}
                                  >
                                    Delete record
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleQuickMarkPresent(s)}
                                    className="text-emerald-700 hover:text-emerald-800 font-semibold"
                                  >
                                    Mark present
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Tutors can mark students present or absent, adjust check-in timestamps, or edit the session date.</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
