import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="border-t border-black/10 bg-[#111111] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2">
          <Link to="/" aria-label="NOVA Clothing home" className="inline-flex h-[68px] w-[194px] items-center">
            <img src="/nova-clothing-logo.png" alt="NOVA Clothing — Since 2026" className="max-h-full w-full object-contain" />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/50">Everyday clothing, made to move with you.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Explore</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/70">
            <Link to="/shop" className="transition hover:text-white">Shop all</Link>
            <Link to="/about" className="transition hover:text-white">About NOVA</Link>
            <Link to="/wishlist" className="transition hover:text-white">Saved items</Link>
            <Link to="/account" className="transition hover:text-white">My account</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Everyday essentials</p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/50">Soft-touch fabrics, relaxed fits, and easy layers for real life.</p>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/35">© {new Date().getFullYear()} NOVA. Made for everyday.</div>
    </footer>
  );
}

export default Footer;
