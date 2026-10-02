import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer id="about" className="border-t border-black/10 bg-[#111111] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2">
          <Link to="/" className="text-2xl font-black tracking-[0.22em]">NOVA</Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/50">Thoughtful technology for the way you live, work, and create.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Explore</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/70">
            <Link to="/shop" className="transition hover:text-white">Shop all</Link>
            <Link to="/wishlist" className="transition hover:text-white">Saved items</Link>
            <Link to="/account" className="transition hover:text-white">My account</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Get in touch</p>
          <a href="mailto:hello@nova.example" className="mt-4 inline-block text-sm text-white/70 transition hover:text-white">hello@nova.example</a>
          <p className="mt-3 text-xs leading-5 text-white/35">A portfolio storefront. Orders use payment test mode.</p>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/35">© {new Date().getFullYear()} NOVA. Designed for everyday discovery.</div>
    </footer>
  );
}

export default Footer;
