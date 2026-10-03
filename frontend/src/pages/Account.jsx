import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const signOut = async () => {
    setError("");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      setError("We couldn't reach the account service. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">Your NOVA</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Account</h1>
        <div className="mt-8 grid gap-5 md:grid-cols-[1fr_1.3fr]">
          <section className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm">
            <p className="text-sm text-neutral-500">Signed in as</p>
            <h2 className="mt-2 text-xl font-semibold">{user?.name}</h2>
            <p className="mt-1 text-sm text-neutral-500">{user?.email}</p>
            {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
            <button onClick={signOut} className="mt-7 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold transition hover:border-black hover:bg-black hover:text-white">Sign out</button>
          </section>
          <section className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-semibold">Your orders</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">Track recent purchases and revisit order details from your order history.</p>
            <Link to="/orders" className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">View order history</Link>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Account;
