import { useState } from "react";
import { Link } from "react-router-dom";
import AuthPageShell from "../components/AuthPageShell";
import api, { getApiError } from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const { data } = await api.post("auth/forgot-password", { email });
      setMessage(data.message);
    } catch (requestError) {
      setError(getApiError(requestError, "We couldn't send a recovery email."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell title="Reset your password" description="Enter the email on your NOVA account. We’ll send a one-time link if recovery email is available.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs text-white/55">Email
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d9b979]/60" placeholder="you@example.com" />
        </label>
        {message && <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <button disabled={submitting} className="w-full rounded-xl bg-gradient-to-r from-[#f7f0e3] via-white to-[#eee0c3] py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60">
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <Link to="/login" className="mt-5 block text-center text-sm text-white/45 hover:text-white">Back to sign in</Link>
    </AuthPageShell>
  );
}

export default ForgotPassword;
