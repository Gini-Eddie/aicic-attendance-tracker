import React, { useEffect, useRef } from "react";

export function ConfirmDialog({ open, busy, error, onCancel, onConfirm }: { open: boolean; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby="close-attendance-title" aria-describedby="close-attendance-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }} className="m-auto w-[90vw] max-w-md rounded-2xl bg-white text-slate-900 p-6 shadow-xl backdrop:bg-slate-900/60">
    <h2 id="close-attendance-title" className="text-xl font-bold">Close attendance?</h2>
    <p id="close-attendance-description" className="mt-3 text-sm text-slate-600">Students will no longer be able to check in. Attendance already recorded will be kept.</p>
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-3"><button autoFocus disabled={busy} type="button" className="border border-slate-300 rounded-lg px-4 py-2" onClick={onCancel}>Keep open</button><button disabled={busy} type="button" className="bg-rose-600 text-white rounded-lg px-4 py-2 disabled:opacity-50" onClick={onConfirm}>{busy ? "Closing..." : "Close attendance"}</button></div>
  </dialog>;
}
