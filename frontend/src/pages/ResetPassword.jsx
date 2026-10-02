import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthPageShell from "../components/AuthPageShell";
import api, { getApiError } from "../services/api";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "This password reset link is missing its token.");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("auth/reset-password", { token, password });
      setMessage(data.message);
      window.setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (requestError) {
      setError(getApiError(requestError, "This reset link is invalid or has expired."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell title="Choose a new password" description="Use at least 10 characters for your new password.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs text-white/55">New password
          <input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d9b979]/60" placeholder="At least 10 characters" />
        </label>
        {message && <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <button disabled={submitting || !token} className="w-full rounded-xl bg-gradient-to-r from-[#f7f0e3] via-white to-[#eee0c3] py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
      <Link to="/login" className="mt-5 block text-center text-sm text-white/45 hover:text-white">Back to sign in</Link>
    </AuthPageShell>
  );
}

export default ResetPassword;
