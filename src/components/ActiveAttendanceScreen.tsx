import React, { useState, useEffect } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import QRCode from "qrcode";
import { api } from "../services/api";
import { 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  Users, 
  ExternalLink, 
  StopCircle, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from "lucide-react";

interface ActiveAttendanceScreenProps {
  sessionId: string;
  onCloseSession: () => void;
  onBack: () => void;
  onOpenCheckInSimulator?: (token: string) => void;
}

export const ActiveAttendanceScreen: React.FC<ActiveAttendanceScreenProps> = ({
  sessionId,
  onCloseSession,
  onBack,
  onOpenCheckInSimulator
}) => {
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full session details
  const fetchSession = async () => {
    try {
      const data = await api.getSession(sessionId);
      setSessionDetail(data);

      // Generate QR Code with full absolute URL or relative URL
      const currentOrigin = window.location.origin;
      const attendanceUrl = `${currentOrigin}/attendance/${data.session.token}`;
      
      const qrUrl = await QRCode.toDataURL(attendanceUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrDataUrl(qrUrl);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load session.");
    } finally {
      setLoading(false);
    }
  };

  // Poll for live attendance updates every 3 seconds
  useEffect(() => {
    fetchSession();

    const interval = setInterval(async () => {
      try {
        const pollData = await api.pollSessionAttendance(sessionId);
        setSessionDetail((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            session: {
              ...prev.session,
              status: pollData.status
            },
            checked_in_count: pollData.checked_in_count,
            total_enrolled: pollData.total_enrolled,
            attendance_rate: pollData.total_enrolled > 0 
              ? Math.round((pollData.checked_in_count / pollData.total_enrolled) * 100) 
              : 0,
            recent_checkins: pollData.records
          };
        });
      } catch (e) {
        // silent poll error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Countdown timer calculation
  useEffect(() => {
    if (!sessionDetail?.session?.expires_at) return;

    const calculateTime = () => {
      const expiry = new Date(sessionDetail.session.expires_at).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [sessionDetail?.session?.expires_at]);

  const handleCopyLink = async () => {
    if (!sessionDetail?.session?.token) return;
    const url = `${window.location.origin}/attendance/${sessionDetail.session.token}`;
    try { await navigator.clipboard.writeText(url); }
    catch { setError("Could not copy the link. Select and copy the attendance URL manually."); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCloseSession = async () => {
    if (closing) return;
    setClosing(true);
    setCloseError("");
    try {
      await api.closeSession(sessionId);
      onCloseSession();
    } catch (err: any) {
      setCloseError(err.message || "Failed to close session. Please try again.");
      setClosing(false);
    }
  };

  const formatSeconds = (totalSec: number | null) => {
    if (totalSec === null) return "--:--";
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-slate-500">Launching active attendance screen...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionDetail) {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Session Error</h3>
        <p className="text-sm text-slate-600 mt-1 mb-4">{error || "Could not load session"}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium"
        >
          Return to Course
        </button>
      </div>
    );
  }

  const { session, course, checked_in_count, total_enrolled, attendance_rate, recent_checkins = [] } = sessionDetail;
  const isExpired = session.status === "expired" || (timeLeft !== null && timeLeft <= 0);
  const isClosed = session.status === "closed";
  const attendanceUrl = `${window.location.origin}/attendance/${session.token}`;

  return (
    <div className="space-y-6 pb-12">
      <ConfirmDialog open={showCloseDialog} busy={closing} error={closeError} onCancel={() => setShowCloseDialog(false)} onConfirm={handleCloseSession} />
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Course Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{course?.name || "Active Session"}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isClosed
                  ? "bg-slate-100 text-slate-700 border border-slate-300"
                  : isExpired
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isClosed ? "bg-slate-500" : isExpired ? "bg-amber-600" : "bg-emerald-500"
                }`}></span>
                {isClosed ? "Attendance Closed" : isExpired ? "Attendance Expired" : "Attendance Open"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live attendance session generated for students physically present in class.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isClosed && !isExpired && (
            <button
              id="close-attendance-btn"
              onClick={() => { setCloseError(""); setShowCloseDialog(true); }}
              disabled={closing}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <StopCircle className="w-4 h-4" />
              {closing ? "Closing..." : "Close Attendance"}
            </button>
          )}

          {isClosed && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg"
            >
              Back to Course
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: QR Code presentation on Left, Real-time Stats & Live List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code & Temporary Link Display */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col items-center text-center">
          <div className="w-full mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Projector / Display View
            </span>
            <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${
              isExpired || isClosed ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-800 border border-sky-200"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Time Left: {formatSeconds(timeLeft)}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl my-2 relative group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Attendance QR Code"
                className={`w-64 h-64 mx-auto rounded-lg transition-opacity ${
                  isClosed || isExpired ? "opacity-30 grayscale" : "opacity-100"
                }`}
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                <QrCode className="w-16 h-16 animate-pulse" />
              </div>
            )}

            {(isClosed || isExpired) && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-slate-900/90 text-white px-4 py-3 rounded-xl text-center shadow-lg">
                  <StopCircle className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                  <p className="font-bold text-sm">Session Inactive</p>
                  <p className="text-[11px] text-slate-300">QR Code no longer accepts check-ins</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 mt-2 font-medium">
            Scan with smartphone camera to check in immediately
          </p>

          {/* Temporary Link Display */}
          <div className="w-full mt-5 pt-4 border-t border-slate-100">
            <label className="block text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Temporary Attendance Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={attendanceUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 truncate"
              />
              <button
                id="copy-attendance-url-btn"
                onClick={handleCopyLink}
                title="Copy temporary link"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <a
                href={attendanceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Student Check-in in New Tab
              </a>
              {onOpenCheckInSimulator && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => onOpenCheckInSimulator(session.token)}
                    className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    Test Check-in Simulator
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Attendance Metrics & Check-in Feed */}
        <div className="lg:col-span-7 space-y-6">
          {/* Key Metric Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Check-in Progress
                </span>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">
                  {checked_in_count} <span className="text-slate-400 text-xl font-normal">/ {total_enrolled} students</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-sky-600">{attendance_rate}%</span>
                <span className="block text-xs text-slate-500">Attendance Rate</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-sky-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, attendance_rate)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Auto-refreshing live attendance stream every 3s
              </span>
              <span>Total Enrolled: {total_enrolled}</span>
            </div>
          </div>

          {/* Live Check-in Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Checked-in Students ({checked_in_count})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {recent_checkins.length} recorded
              </span>
            </div>

            {recent_checkins.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No students checked in yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Students who scan the QR code or open the link will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {recent_checkins.map((record: any, index: number) => (
                  <div
                    key={record.id || index}
                    className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{record.student_name}</p>
                        <button className="text-xs text-rose-700" onClick={async () => {
                          if (!window.confirm(`Delete the attendance record for ${record.student_name}?`)) return;
                          try { await api.deleteAttendance(sessionId, record.student_id); await fetchSession(); }
                          catch (err: any) { alert(err.message); }
                        }}>Delete record</button>
                        <p className="text-xs text-slate-500 font-mono">{record.student_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Present
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        {new Date(record.checked_in_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
