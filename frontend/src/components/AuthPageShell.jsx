import { Link } from "react-router-dom";

export default function AuthPageShell({ eyebrow = "NOVA ACCOUNT", title, description, children }) {
  return (
    <main className="min-h-screen bg-[#08090a] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">
        <Link to="/" aria-label="NOVA Clothing home" className="mb-8 inline-flex h-12 w-[132px] items-center self-center">
          <img src="/nova-clothing-logo.png" alt="NOVA Clothing — Since 2026" className="max-h-full w-full object-contain" />
        </Link>
        <section className="rounded-[24px] border border-white/10 bg-[#151515] p-7 shadow-[0_26px_80px_rgba(0,0,0,.5)] sm:p-9">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-[#d9b979]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-white/50">{description}</p>}
          <div className="mt-7">{children}</div>
        </section>
        <Link to="/shop" className="mt-6 text-center text-xs text-white/35 transition hover:text-white/70">
          Continue browsing
        </Link>
      </div>
    </main>
  );
}
