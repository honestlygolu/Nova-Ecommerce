import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthPageShell from "../components/AuthPageShell";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../services/api";

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#d9b979]/60";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/account", { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, "We couldn't create your account."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell title="Create your account" description="Save your cart and keep your NOVA orders in one place.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs text-white/55">Full name
          <input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="Your name" />
        </label>
        <label className="block text-xs text-white/55">Email
          <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} placeholder="you@example.com" />
        </label>
        <label className="block text-xs text-white/55">Password
          <input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={inputClass} placeholder="At least 10 characters" />
        </label>
        {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        <button disabled={submitting} className="w-full rounded-xl bg-gradient-to-r from-[#f7f0e3] via-white to-[#eee0c3] py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/45">
        Already have an account? <Link to="/login" className="text-[#e5cc96] hover:text-white">Sign in</Link>
      </p>
    </AuthPageShell>
  );
}

export default Register;
