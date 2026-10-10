import React, { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";

export function InvitationSettings() {
  const [kind, setKind] = useState<"admin" | "teacher">("admin");
  const [password, setPassword] = useState("");
  const [newCode, setNewCode] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState("");
  const [showNewCode, setShowNewCode] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const requestGeneration = useRef(0);

  useEffect(() => {
    const clear = () => {requestGeneration.current += 1; setCode(""); setPassword(""); setNewCode(""); setShowNewCode(false); setConfirming(false);};
    const hidden = () => {if (document.hidden) clear();};
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {requestGeneration.current += 1; window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", hidden);};
  }, []);

  useEffect(() => {
    if (!code) return;
    const timer = setTimeout(() => setCode(""), 60000);
    let cancelled = false;
    const poll = setInterval(async () => {
      try {
        const data = await api.invitationStatus(kind);
        if (!cancelled && data.revision !== revision) { setCode(""); setMessage("This code was changed by an administrator. Enter your password to view the latest code."); }
      } catch { if (!cancelled) setCode(""); }
    }, 5000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(poll); };
  }, [code, kind, revision]);

  const perform = async (action: "view" | "copy" | "change") => {
    if (!password) { setMessage("Enter your own account password first."); return; }
    const generation = ++requestGeneration.current;
    setBusy(true); setMessage(""); setCode("");
    try {
      const result = await api.manageInvitation(kind, password, action === "change" ? newCode : undefined);
      if (generation !== requestGeneration.current) return;
      setRevision(result.revision);
      if (action === "copy") {
        await navigator.clipboard.writeText(result.code);
        setMessage("Current code copied. Clear your clipboard after sharing it privately.");
      } else {
        setCode(result.code);
        setMessage(action === "change" ? "Code updated globally. The previous code no longer works." : "Code will hide after 60 seconds or when you leave this window.");
      }
      setNewCode(""); setShowNewCode(false); setConfirming(false);
    } catch (err: any) { setMessage(err.message || "Could not manage invitation code."); }
    finally { setPassword(""); setBusy(false); }
  };

  return <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm" aria-labelledby="registration-codes-heading">
    <div className="flex items-center gap-3"><span className="p-2.5 rounded-xl bg-sky-50 text-sky-700"><KeyRound className="w-5 h-5" /></span><div><h2 id="registration-codes-heading" className="font-bold text-slate-900">Registration codes</h2><p className="text-xs text-slate-500 mt-1">Admin-only controls for account registration.</p></div></div>
    <div className="mt-5 space-y-4">
      <p className="text-sm text-slate-600">Shared by all administrators. Keep the admin master code private; give teachers only the teacher invitation code.</p>
      <label className="block text-sm font-medium">Code type<select disabled={busy} className="block w-full border border-slate-300 rounded-xl p-3 mt-1.5" value={kind} onChange={e => { setKind(e.target.value as "admin" | "teacher"); setCode(""); setPassword(""); setNewCode(""); setShowNewCode(false); setConfirming(false); setMessage(""); }}><option value="admin">Admin master code</option><option value="teacher">Teacher invitation code</option></select></label>
      <label className="block text-sm font-medium">Your account password<input disabled={busy} type="password" autoComplete="current-password" maxLength={72} value={password} onChange={e => setPassword(e.target.value)} className="block w-full border border-slate-300 rounded-xl p-3 mt-1.5" /></label>
      <div><label htmlFor="current-invitation-code" className="block text-xs font-semibold text-slate-500 mb-2">CURRENT {kind === "admin" ? "ADMIN" : "TEACHER"} CODE</label><div className="flex border border-slate-200 rounded-xl bg-slate-50 overflow-hidden"><input id="current-invitation-code" readOnly type={code ? "text" : "password"} value={code || "****************"} autoComplete="off" className="min-w-0 flex-1 bg-transparent font-mono text-sm p-3" />
        <button disabled={busy} type="button" aria-label={`${code ? "Hide" : "View"} ${kind} registration code`} aria-pressed={!!code} title={code ? "Hide code" : "View code"} onClick={() => {if (code) {setCode(""); setMessage("Code hidden.");} else perform("view");}} className="px-3 text-slate-600 hover:bg-slate-100">{code ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
        <button disabled={busy} type="button" aria-label={`Copy ${kind} registration code`} title="Copy current code" onClick={async () => {if (!code) {await perform("copy"); return;} try {await navigator.clipboard.writeText(code); setMessage("Current code copied.");} catch {setMessage("Could not copy. Select the revealed code and copy it manually.");}}} className="px-3 border-l border-slate-200 text-slate-600 hover:bg-slate-100"><Copy className="w-4 h-4" /></button>
      </div></div>
      <details className="border-t border-slate-200 pt-4"><summary className="text-sm font-semibold text-sky-700 cursor-pointer">Change registration code</summary><div className="mt-4 space-y-3">
        <label htmlFor="new-invitation-code" className="block text-sm">New code (16–72 characters)</label><div className="flex border border-slate-300 rounded-xl overflow-hidden"><input id="new-invitation-code" disabled={busy} type={showNewCode ? "text" : "password"} autoComplete="new-password" minLength={16} maxLength={72} value={newCode} onChange={e => {setNewCode(e.target.value); setConfirming(false);}} className="min-w-0 flex-1 p-3 bg-white font-mono text-sm" /><button disabled={busy} type="button" aria-label={`${showNewCode ? "Hide" : "View"} new ${kind} code`} aria-pressed={showNewCode} onClick={() => setShowNewCode(!showNewCode)} className="px-3 text-slate-600">{showNewCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div>
        {confirming ? <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm"><p className="text-amber-800">Replace the shared {kind} code for all admins? The previous code stops working immediately.</p><div className="flex gap-3 mt-3"><button disabled={busy} type="button" onClick={() => perform("change")} className="rounded-lg bg-sky-700 text-white px-4 py-2">{busy ? "Saving..." : "Confirm change"}</button><button disabled={busy} type="button" className="rounded-lg border px-4 py-2" onClick={() => setConfirming(false)}>Cancel</button></div></div> : <button disabled={busy || newCode.length < 16} type="button" onClick={() => {if (!password) {setMessage("Enter your own account password first."); return;} setConfirming(true);}} className="rounded-xl bg-sky-700 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Save code for all admins</button>}
      </div></details>
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>
  </section>;
}
