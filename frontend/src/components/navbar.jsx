import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import CartContext from "../context/CartContext";
import WishlistContext from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { cartItems = [] } = useContext(CartContext);
  const wishlist = useContext(WishlistContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    navigate(`/shop${params.size ? `?${params.toString()}` : ""}`);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="relative z-40 border-b border-black/[0.08] bg-[#fbfaf7] text-[#171717]">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="NOVA home" className="text-[21px] font-black tracking-[0.28em]">NOVA</Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <Link to="/" className="text-sm font-medium text-neutral-700 transition hover:text-black">Home</Link>
          <Link to="/shop" className="text-sm font-medium text-neutral-500 transition hover:text-black">Shop</Link>
          <Link to="/#categories" className="text-sm font-medium text-neutral-500 transition hover:text-black">Categories</Link>
          <Link to="/#about" className="text-sm font-medium text-neutral-500 transition hover:text-black">About</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <button type="button" aria-label="Search products" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-full text-neutral-700 transition hover:bg-black/5 hover:text-black">
            <Search size={19} />
          </button>
          <Link to="/wishlist" aria-label={`Saved items${wishlist?.items?.length ? `, ${wishlist.items.length}` : ""}`} className="relative hidden h-10 w-10 place-items-center rounded-full text-neutral-700 transition hover:bg-black/5 hover:text-black sm:grid">
            <Heart size={19} />
            {!!wishlist?.items?.length && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#171717] px-1 text-[9px] font-semibold text-white">{wishlist.items.length}</span>}
          </Link>
          <Link to={user ? "/account" : "/login"} aria-label={user ? "Your account" : "Sign in"} className="hidden h-10 w-10 place-items-center rounded-full text-neutral-700 transition hover:bg-black/5 hover:text-black sm:grid">
            <User size={19} />
          </Link>
          <Link to="/cart" aria-label={`Shopping bag, ${cartCount} items`} className="relative grid h-10 w-10 place-items-center rounded-full text-neutral-700 transition hover:bg-black/5 hover:text-black">
            <ShoppingBag size={20} />
            {!!cartCount && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[9px] font-semibold text-white">{cartCount}</span>}
          </Link>
          <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-full text-neutral-700 transition hover:bg-black/5 md:hidden">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} className="absolute right-4 top-[66px] z-50 flex w-[min(92vw,390px)] gap-2 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_20px_60px_rgba(0,0,0,.15)] sm:right-8">
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search products" placeholder="Search NOVA products" className="min-w-0 flex-1 rounded-xl bg-[#f5f4f0] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/15" />
          <button className="rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800">Search</button>
        </form>
      )}

      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full z-50 grid gap-1 border-t border-black/5 bg-[#fbfaf7] px-5 py-3 shadow-lg md:hidden">
          <Link onClick={closeMenu} to="/" className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5">Home</Link>
          <Link onClick={closeMenu} to="/shop" className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5">Shop all</Link>
          <Link onClick={closeMenu} to="/#categories" className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5">Categories</Link>
          <Link onClick={closeMenu} to="/wishlist" className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5">Saved items</Link>
          <Link onClick={closeMenu} to={user ? "/account" : "/login"} className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5">{user ? "Your account" : "Sign in"}</Link>
          <Link onClick={closeMenu} to="/#about" className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-black/5">About NOVA</Link>
        </nav>
      )}
    </header>
  );
}

export default Navbar;
