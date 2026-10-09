import React, { useState } from "react";
import { api } from "../services/api";
import { User } from "../types";

export function AccountSettings({ user, theme, onThemeChange, onSaved }: { user: User; theme: "light" | "dark"; onThemeChange: (theme: "light" | "dark") => void; onSaved: (user: User) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    setBusy(true);
    try {
      const updated = await api.updateProfile(name, email, password, newPassword);
      onSaved(updated); setPassword(""); setNewPassword(""); setConfirmPassword(""); setMessage("Your profile has been saved.");
    } catch (err: any) { setError(err.message || "Could not save your profile."); }
    finally { setBusy(false); }
  };
  return <section className="max-w-2xl mx-auto space-y-6"><h1 className="text-2xl font-bold text-slate-900">Settings</h1>
    <div className="bg-white border border-slate-200 rounded-2xl p-6"><h2 className="font-bold text-slate-900">Appearance</h2><p className="text-sm text-slate-500 mt-1">Saved for your account on this browser.</p><div className="flex gap-3 mt-4">{(["light", "dark"] as const).map(value => <button key={value} type="button" aria-pressed={theme === value} onClick={() => onThemeChange(value)} className={`border rounded-lg px-5 py-2 ${theme === value ? "bg-sky-700 text-white border-sky-700" : "border-slate-300 text-slate-700"}`}>{value === "light" ? "Light" : "Dark"}</button>)}</div></div>
    <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><h2 className="font-bold text-slate-900">Your profile</h2><p className="text-xs text-slate-500">Account type: {user.role}. Enter your current password to save changes.</p>
      <label className="block text-sm text-slate-700">Full name<input disabled={busy} required minLength={2} maxLength={255} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="block mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white" /></label>
      <label className="block text-sm text-slate-700">Email<input disabled={busy} required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="block mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white" /></label>
      <label className="block text-sm text-slate-700">Current password<input disabled={busy} required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="block mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white" /></label>
      <label className="block text-sm text-slate-700">New password (optional)<input disabled={busy} type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="block mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white" /></label>
      <label className="block text-sm text-slate-700">Confirm new password<input disabled={busy} required={!!newPassword} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="block mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white" /></label>
      {error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}{message && <p role="status" className="text-emerald-700 text-sm">{message}</p>}
      <button disabled={busy} className="bg-sky-700 text-white px-5 py-2 rounded-lg disabled:opacity-50">{busy ? "Saving..." : "Save profile"}</button>
    </form>
  </section>;
}
