import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export function InvitationSettings() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"admin" | "teacher">("admin");
  const [password, setPassword] = useState("");
  const [newCode, setNewCode] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState("");

  useEffect(() => {
    if (!code) return;
    const timer = setTimeout(() => setCode(""), 60000);
    const hide = () => { setCode(""); setPassword(""); setNewCode(""); };
    window.addEventListener("blur", hide);
    const poll = setInterval(async () => {
      try {
        const data = await api.invitationStatus(kind);
        if (data.revision !== revision) { setCode(""); setMessage("This code was changed by an administrator. Enter your password to view the latest code."); }
      } catch { setCode(""); }
    }, 5000);
    return () => { clearTimeout(timer); clearInterval(poll); window.removeEventListener("blur", hide); };
  }, [code, kind, revision]);

  const perform = async (action: "view" | "copy" | "change") => {
    if (!password) { setMessage("Enter your own account password first."); return; }
    if (action === "change" && !window.confirm(`Replace the shared ${kind} registration code for all administrators? The old code will stop working immediately.`)) return;
    setBusy(true); setMessage(""); setCode("");
    try {
      const result = await api.manageInvitation(kind, password, action === "change" ? newCode : undefined);
      setRevision(result.revision);
      if (action === "copy") {
        await navigator.clipboard.writeText(result.code);
        setMessage("Current code copied. Clear your clipboard after sharing it privately.");
      } else {
        setCode(result.code);
        setMessage(action === "change" ? "Code updated globally. The previous code no longer works." : "Code will hide after 60 seconds or when you leave this window.");
      }
      setNewCode("");
    } catch (err: any) { setMessage(err.message || "Could not manage invitation code."); }
    finally { setPassword(""); setBusy(false); }
  };

  return <section className="bg-white rounded-2xl border border-slate-200 p-4">
    <button className="font-semibold text-slate-900" type="button" onClick={() => { setOpen(!open); setCode(""); setPassword(""); setNewCode(""); setMessage(""); }}>Registration codes {open ? "▴" : "▾"}</button>
    {open && <div className="mt-4 space-y-3 max-w-xl">
      <p className="text-sm text-slate-600">Shared by all administrators. Keep the admin master code private; give teachers only the teacher invitation code.</p>
      <label className="block text-sm">Code type<select disabled={busy} className="block w-full border rounded p-2" value={kind} onChange={e => { setKind(e.target.value as "admin" | "teacher"); setCode(""); setPassword(""); setNewCode(""); setMessage(""); }}><option value="admin">Admin master code</option><option value="teacher">Teacher invitation code</option></select></label>
      <label className="block text-sm">Your account password<input disabled={busy} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full border rounded p-2" /></label>
      <div className="flex gap-2"><button disabled={busy} type="button" onClick={() => perform("view")} className="rounded bg-slate-900 text-white px-3 py-2">View code</button><button disabled={busy} type="button" onClick={() => perform("copy")} className="rounded border px-3 py-2">Copy current code</button><button type="button" onClick={() => setCode("")} className="rounded border px-3 py-2">Hide</button></div>
      {code && <output className="block font-mono break-all bg-slate-50 rounded p-3 select-all">{code}</output>}
      <label className="block text-sm">New code (at least 16 characters)<input disabled={busy} type="password" autoComplete="new-password" minLength={16} maxLength={72} value={newCode} onChange={e => setNewCode(e.target.value)} className="block w-full border rounded p-2" /></label>
      <button disabled={busy || newCode.length < 16} type="button" onClick={() => perform("change")} className="rounded bg-sky-700 text-white px-3 py-2">{busy ? "Processing..." : "Save code for all admins"}</button>
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>}
  </section>;
}
