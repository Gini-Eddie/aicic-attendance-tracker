import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  User, 
  Search, 
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Calendar
} from "lucide-react";

interface StudentCheckInPageProps {
  token: string;
  onBackToApp?: () => void;
}

export const StudentCheckInPage: React.FC<StudentCheckInPageProps> = ({
  token,
  onBackToApp
}) => {
  const [sessionInfo, setSessionInfo] = useState<{
    valid: boolean;
    status: string;
    course_name?: string;
    teacher_name?: string;
    starts_at?: string;
    expires_at?: string;
    detail?: string;
    enrolled_count?: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [identity, setIdentity] = useState<{ student_name: string; student_code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    student_name: string;
    student_code: string;
    course_name: string;
    checked_in_at: string;
  } | null>(null);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicSession(token);
      setSessionInfo(data);
    } catch (err: any) {
      setError(err.message || "Failed to load attendance session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [token]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      setError("Please enter your registered student code.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (!identity) {
        setIdentity(await api.lookupStudent(token, studentCode.trim()));
      } else {
        const res = await api.checkInPublic(token, identity.student_code);
        setSuccessData(res);
      }
    } catch (err: any) {
      setError(err.message || "Attendance check-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Top Brand Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Header */}
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-sky-400">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">AICIC Concepts</h1>
          <p className="text-xs text-sky-300 font-medium mt-0.5">Physical Training Programmes Attendance</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-600">Verifying attendance session...</p>
          </div>
        ) : !sessionInfo || !sessionInfo.valid ? (
          /* Session Expired or Closed State */
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Attendance Closed</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">
              {error || sessionInfo?.detail || "This attendance session is no longer accepting check-ins."}
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
              Attendance links are temporary and expire automatically. If you are physically present, please notify your instructor.
            </div>

            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        ) : successData ? (
          /* Successful Check-in State */
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs mb-2">
              VERIFIED CHECK-IN
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Attendance Recorded</h2>
            
            <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500">Programme:</span>
                <span className="font-semibold text-slate-900">{successData.course_name}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-semibold text-slate-900">{successData.student_name}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500">Student Code:</span>
                <span className="font-mono font-medium text-slate-700">{successData.student_code}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Server Timestamp:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(successData.checked_in_at)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Your attendance has been recorded directly to the course attendance register. You may safely close this page.
            </p>

            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors"
              >
                Back to AICIC Portal
              </button>
            )}
          </div>
        ) : (
          /* Active Check-in Form */
          <div className="p-6">
            <div className="mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Attendance is currently open
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expires {sessionInfo.expires_at ? formatTime(sessionInfo.expires_at) : ""}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-2">{sessionInfo.course_name}</h2>
              <p className="text-xs text-slate-600 mt-0.5">Instructor: {sessionInfo.teacher_name}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Check-in Error</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Number
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-code-input"
                    type="text"
                    required
                    value={studentCode}
                    onChange={(e) => { setStudentCode(e.target.value); setIdentity(null); setError(null); }}
                    placeholder="e.g. MATRIX-AI-001"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter the registration number provided by your teacher.
                </p>
              </div>

              {identity && (
                <div role="status" className="rounded-xl bg-sky-50 p-4 text-sm">
                  <p>Is this you?</p>
                  <p className="font-bold text-lg">{identity.student_name}</p>
                  <p>{identity.student_code}</p>
                  <button type="button" className="mt-2 underline" onClick={() => setIdentity(null)}>No, change registration number</button>
                </div>
              )}
              <button
                id="submit-checkin-btn"
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? "Processing..." : identity ? "Yes, confirm & record attendance" : "Find my name"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {onBackToApp && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Return to Admin/Teacher View
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-xs text-slate-400">
        AICIC Concepts Attendance Management System • Secure Physical Verification
      </div>
    </div>
  );
};
