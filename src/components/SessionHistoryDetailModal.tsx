import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { SessionDetail } from "../types";
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Filter,
  Search,
  Download
} from "lucide-react";

interface SessionHistoryDetailModalProps {
  sessionId: string;
  onClose: () => void;
  onViewStudentProfile?: (studentId: string) => void;
}

export const SessionHistoryDetailModal: React.FC<SessionHistoryDetailModalProps> = ({
  sessionId,
  onClose,
  onViewStudentProfile
}) => {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "present" | "absent">("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        const data = await api.getSession(sessionId);
        setDetail(data);
      } catch (err: any) {
        setError(err.message || "Failed to load session history");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [sessionId]);

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
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Class Attendance Session</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                detail?.session.status === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
              }`}>
                {detail?.session.status === "active" ? "Active" : "Closed"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {detail?.course?.name} • Session: {detail?.session.starts_at ? new Date(detail.session.starts_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric"
              }) : ""}
            </p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No students match the current filter
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
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
                          {s.status === "Present" ? (
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
                          {s.status === "Present" && <button className="text-rose-700 mr-3" onClick={async () => {
                            if (!window.confirm(`Delete the attendance record for ${s.full_name}? This cannot be undone.`)) return;
                            try { await api.deleteAttendance(sessionId, s.student_id); setDetail(await api.getSession(sessionId)); }
                            catch (err: any) { alert(err.message); }
                          }}>Delete record</button>}
                          {s.checked_in_at
                            ? new Date(s.checked_in_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Absence determined dynamically by comparing course enrollments against verified check-ins.</span>
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
