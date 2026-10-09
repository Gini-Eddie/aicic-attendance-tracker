import React, { useState } from "react";
import { UserCircle, Mail, Lock, Eye, EyeOff, AlertCircle, BookOpen } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignUp: (name: string, email: string, pass: string, courseName: string, invitationCode: string, role: "admin" | "teacher") => Promise<void>;
  errorMessage?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onSignUp,
  errorMessage
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseName, setCourseName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [registrationRole, setRegistrationRole] = useState<"admin" | "teacher">("teacher");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp && (!name || (registrationRole === "teacher" && !courseName))) {
      setError("Please provide your name and the course you teach.");
      return;
    }
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await onSignUp(name, email, password, courseName, invitationCode, registrationRole);
        setInvitationCode("");
      } else {
        await onLogin(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${isSignUp ? "register" : "authenticate"}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isSignUp ? (registrationRole === "admin" ? "Admin Registration" : "Teacher Registration") : "Sign in to AICIC Concepts"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Attendance Management for Training Programmes</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {(error || errorMessage) && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error || errorMessage}</span>
          </div>
        )}

        <div className="flex bg-slate-100 p-1 rounded-lg mb-5">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${!isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Register
          </button>
        </div>

        {!isSignUp && (
          <div className="mb-4 text-sm">
            <button type="button" onClick={() => setShowRecovery(!showRecovery)} className="text-sky-700 hover:underline">
              Forgot password?
            </button>
            {showRecovery && (
              <p role="status" className="mt-2 rounded-lg bg-sky-50 p-3 text-slate-700">
                Contact your AICIC administrator and provide your account email address.
                After verifying your identity, they can reset your password. Then return here to sign in.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && <label className="block text-sm">Account type
            <select className="block w-full border rounded p-2 mt-1" value={registrationRole} onChange={e => { setRegistrationRole(e.target.value as "admin" | "teacher"); setInvitationCode(""); }}>
              <option value="teacher">Teacher</option><option value="admin">Administrator</option>
            </select>
          </label>}
          {isSignUp && (
            <label className="block text-xs font-semibold text-slate-700">
              {registrationRole === "admin" ? "Admin master code" : "Teacher invitation code"}
              <input type="password" required maxLength={72} autoComplete="off" value={invitationCode}
                onChange={e => setInvitationCode(e.target.value)}
                className="block w-full mt-1 p-2 text-sm rounded-lg border border-slate-300" />
              <span className="block mt-1 font-normal text-slate-500">Request the appropriate code from your AICIC administrator.</span>
            </label>
          )}
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserCircle className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@aicicconcepts.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSignUp && registrationRole === "teacher" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Course / Programme
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. AI & Machine Learning"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Processing..." : isSignUp ? (registrationRole === "admin" ? "Create Admin Account" : "Create Teacher Account") : "Sign In to Account"}
          </button>
        </form>
      </div>
    </div>
  );
};
