import React, { useEffect, useState } from "react";
import { api, ImportReport } from "../services/api";

export function CohortImport({ courseId, selectedCohort, onImported }: {courseId: string; selectedCohort: string; onImported: (cohort: string) => Promise<void>}) {
  const [cohort, setCohort] = useState(selectedCohort);
  useEffect(() => {setCohort(selectedCohort);}, [selectedCohort]);
  const [track, setTrack] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  return <details className="bg-white border border-slate-200 rounded-2xl p-5">
    <summary className="font-semibold cursor-pointer">Upload students from CSV or Excel</summary>
    <p className="text-sm text-slate-600 mt-3">Use name and email column headings in a .csv or .xlsx file (up to 1,000 rows, 2 MB). Select this course's cohort and a track abbreviation. Existing emails in this same course and cohort are skipped.</p>
    <form className="grid sm:grid-cols-2 gap-4 mt-4" onSubmit={async e => {e.preventDefault(); if (!file) return; setBusy(true); setError(""); setReport(null); try {const result = await api.importStudents(courseId, file, cohort, track); setReport(result); await onImported(result.cohort);} catch(err: any) {setError(err.message);} finally {setBusy(false);}}}>
      <label className="text-sm">Cohort<input required maxLength={30} placeholder="MATRIX" value={cohort} onChange={e => setCohort(e.target.value)} className="block w-full border rounded-lg p-2" /></label>
      <label className="text-sm">Track abbreviation<input required maxLength={20} placeholder="UI, AI, WEB..." value={track} onChange={e => setTrack(e.target.value)} className="block w-full border rounded-lg p-2" /></label>
      <label className="text-sm">Student file<input required type="file" accept=".csv,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full mt-1" /></label>
      <div><p className="text-xs text-slate-500 mb-2">Example: {cohort.toUpperCase() || "MATRIX"}-{track.toUpperCase() || "UI"}-001. Existing numbers are never reused.</p><button disabled={busy} className="bg-sky-700 text-white rounded-lg px-4 py-2">{busy ? "Importing..." : "Import students"}</button></div>
    </form>
    {error && <p role="alert" className="text-rose-700 mt-3">{error}</p>}
    {report && <div role="status" className="mt-4 space-y-2 text-sm"><p className="font-semibold">{report.created.length} added · {report.skipped.length} skipped · {report.errors.length} invalid rows</p>
      {report.created.length > 0 && <details><summary>View generated registration numbers</summary><ul className="max-h-64 overflow-auto mt-2">{report.created.map(r => <li key={r.student_code} className="py-1">{r.name} · {r.email} · <strong>{r.student_code}</strong></li>)}</ul></details>}
      {report.skipped.map(r => <p key={`skip-${r.row}`}>Row {r.row}: {r.email} — {r.reason}</p>)}
      {report.errors.map(r => <p key={`error-${r.row}`} className="text-rose-700">Row {r.row}: {r.reason}</p>)}
    </div>}
  </details>;
}
