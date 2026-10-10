import React, { useEffect, useState } from "react";
import { api, PendingEntry, AdminNotice } from "../services/api";
import { User, Course, AttendanceSession } from "../types";
import { ActionConfirmation } from "./ActionConfirmation";

export function AttendanceOperations({ user }: {user: User}) {
  const admin = user.role === "admin";
  const [tab, setTab] = useState("review");
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [cohort, setCohort] = useState("");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [code, setCode] = useState("");
  const [identity, setIdentity] = useState<{student_name: string; student_code: string} | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<User | null>(null);
  const load = async () => {
    setError("");
    try {
      const [entries, users, notifications, courseList] = await Promise.all([api.getPendingAttendance(), admin ? api.getStaff() : Promise.resolve([]), admin ? api.getNotifications() : Promise.resolve([]), admin ? api.getCourses() : Promise.resolve([])]);
      setPending(entries); setStaff(users); setNotices(notifications); setCourses(courseList);
    } catch(err: any) {setError(err.message);} finally {setLoading(false);}
  };
  useEffect(() => {load();}, [user.id]);
  useEffect(() => {
    setIdentity(null); setSessions([]); setSessionId("");
    if (!courseId) return;
    let cancelled = false;
    api.getCourse(courseId, cohort || undefined).then(data => {if (cancelled) return; setCohorts(data.cohorts); setSessions(data.sessions.filter(s => s.status === "active" && new Date(s.expires_at) > new Date()));}).catch(err => {if (!cancelled) setError(err.message);});
    return () => {cancelled = true;};
  }, [courseId, cohort]);
  const perform = async (action: () => Promise<unknown>) => {setBusy(true); setError(""); setMessage(""); try {await action(); await load();} catch(err: any) {setError(err.message);} finally {setBusy(false);}};
  const button = "rounded-lg border border-slate-200 px-3 py-2 text-sm";
  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Attendance operations</h1><p className="text-sm text-slate-600 mt-1">Company laptop submissions require approval from a tutor assigned to the course.</p></div>
    <nav aria-label="Attendance operations" className="flex flex-wrap gap-2">{[["review", `Awaiting verification (${pending.length})`], ...(admin ? [["desk", "Company laptop desk"], ["staff", "Teachers & admins"], ["notifications", `Notifications (${notices.filter(n => !n.read).length})`]] : [])].map(([key, label]) => <button key={key} onClick={() => {setTab(key); setError(""); setMessage(""); setIdentity(null);}} className={`${button} ${tab === key ? "bg-sky-100 text-sky-800" : "bg-white"}`}>{label}</button>)}<button className={button} disabled={busy} onClick={load}>Refresh</button></nav>
    {error && <p role="alert" className="bg-rose-50 text-rose-700 rounded-xl p-4">{error}</p>}
    {message && <p role="status" className="bg-emerald-50 text-emerald-800 rounded-xl p-4">{message}</p>}
    {loading && <p role="status">Loading...</p>}
    {!loading && tab === "review" && <div className="space-y-3">{pending.length === 0 && <p className="bg-white border rounded-xl p-6">No submissions awaiting verification.</p>}{pending.map(entry => <article key={entry.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between gap-4"><div><h2 className="font-semibold">{entry.student_name} · {entry.student_code}</h2><p className="text-sm text-slate-600">{entry.course_name} · {entry.cohort || "Legacy cohort"}</p><p className="text-xs text-slate-500 mt-1">{entry.source} · {new Date(entry.submitted_at).toLocaleString()} · Unverified</p><button className="text-sm underline mt-2" onClick={() => perform(() => api.downloadCsv(`/sessions/${entry.session_id}/export.csv`, "attendance.csv"))}>Export session CSV</button></div>{entry.can_verify ? <div className="flex gap-2 items-center"><button disabled={busy} className="rounded-lg bg-emerald-700 text-white px-4 py-2" onClick={() => perform(() => api.verifyAttendance(entry.id, true))}>Verify attendance</button><button disabled={busy} className={button} onClick={() => perform(() => api.verifyAttendance(entry.id, false))}>Reject</button></div> : <p className="text-sm text-amber-700">Assigned tutor must verify</p>}</article>)}</div>}
    {admin && tab === "desk" && <div className="bg-white border rounded-2xl p-6 space-y-4 max-w-2xl"><h2 className="font-bold">Company laptop check-in</h2><p className="text-sm text-slate-600">An admin operates this desk. Select a course, cohort and open attendance session, then confirm the student's name. Keep your admin account under your supervision.</p>
      <label className="block text-sm">Course<select className="block w-full border rounded-lg p-2" value={courseId} onChange={e => {setCourseId(e.target.value); setCohort("");}}><option value="">Choose course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="block text-sm">Cohort<select className="block w-full border rounded-lg p-2" value={cohort} onChange={e => setCohort(e.target.value)}><option value="">Current cohort</option>{cohorts.filter(Boolean).map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="block text-sm">Open attendance session<select className="block w-full border rounded-lg p-2" value={sessionId} onChange={e => {setSessionId(e.target.value); setIdentity(null);}}><option value="">Choose session</option>{sessions.map(s => <option key={s.id} value={s.id}>{s.cohort || "Legacy"} · {new Date(s.starts_at).toLocaleString()}</option>)}</select></label>
      {courseId && sessions.length === 0 && <p className="text-sm text-amber-700">No active session for this selection. The tutor must start attendance first.</p>}
      <form className="space-y-3" onSubmit={async e => {e.preventDefault(); const session = sessions.find(s => s.id === sessionId); if (!session) return; setBusy(true); setError(""); setMessage(""); try {setIdentity(await api.lookupStudent(session.token, code));} catch(err: any) {setError(err.message);} finally {setBusy(false);}}}><label className="block text-sm">Registration number<input required minLength={2} maxLength={64} value={code} onChange={e => {setCode(e.target.value); setIdentity(null);}} className="block w-full border rounded-lg p-2" /></label><button disabled={busy || !sessionId} className="bg-sky-700 text-white px-4 py-2 rounded-lg">Find student</button></form>
      {identity && <div className="border rounded-xl p-4 bg-sky-50"><p className="font-bold">{identity.student_name}</p><p className="text-sm mb-3">{identity.student_code} — Confirm this is the correct student.</p><button disabled={busy} className="bg-slate-900 text-white rounded-lg px-4 py-2" onClick={() => perform(async () => {const result = await api.deskCheckIn(sessionId, identity.student_code); setMessage(result.message); setIdentity(null); setCode("");})}>Confirm & save unverified</button></div>}
    </div>}
    {admin && tab === "staff" && <div className="space-y-3"><button className={button} disabled={busy} onClick={() => perform(() => api.downloadCsv("/staff/export.csv", "staff.csv"))}>Export staff CSV</button>{staff.map(person => <article key={person.id} className="bg-white border rounded-xl p-5 flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{person.name} <span className="text-xs uppercase text-sky-700">{person.role}</span></h2><p className="text-sm text-slate-600">{person.email}</p><p className="text-xs mt-2">Courses: {person.courses?.map(c => c.name).join(", ") || "None assigned"}</p></div>{person.role === "teacher" && <button className="text-rose-700 text-sm" onClick={() => setDeleting(person)}>Delete teacher</button>}</article>)}</div>}
    {admin && tab === "notifications" && <div className="space-y-3">{notices.length === 0 && <p>No notifications yet.</p>}{notices.map(n => <article key={n.id} className={`bg-white border rounded-xl p-5 ${n.read ? "border-slate-200" : "border-sky-500"}`}><p className="text-sm">{n.message}</p><p className="text-xs text-slate-500 mt-2">{new Date(n.created_at).toLocaleString()}</p>{!n.read && <button className="text-sky-700 text-sm mt-2" disabled={busy} onClick={() => perform(() => api.readNotification(n.id))}>Mark read</button>}</article>)}</div>}
    {deleting && <ActionConfirmation message={`Delete access for ${deleting.name}? Their sessions will close and course assignments will be removed. Historical attendance is retained.`} onCancel={() => setDeleting(null)} onConfirm={async () => {await api.deleteTeacher(deleting.id); await load();}} />}
  </section>;
}
