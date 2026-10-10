import React, { useEffect, useRef, useState } from "react";

export function ActionConfirmation({ message, onConfirm, onCancel }: { message: string; onConfirm: () => Promise<void>; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }} className="rounded-2xl p-6 max-w-md w-full bg-white text-slate-900 backdrop:bg-slate-900/60">
    <h2 className="font-bold text-lg">Confirm removal</h2><p className="my-4 text-sm">{message}</p>
    {error && <p role="alert" className="text-rose-700 mb-3">{error}</p>}
    <div className="flex justify-end gap-3"><button disabled={busy} onClick={onCancel} className="border rounded-lg px-4 py-2">Cancel</button><button disabled={busy} className="bg-rose-700 text-white rounded-lg px-4 py-2" onClick={async () => {setBusy(true); try {await onConfirm(); onCancel();} catch(err: any) {setError(err.message);} finally {setBusy(false);}}}>{busy ? "Removing..." : "Remove"}</button></div>
  </dialog>;
}
