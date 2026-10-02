import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import ProductCard from "../components/productcard";
import { useContext } from "react";
import WishlistContext from "../context/WishlistContext";
import api from "../services/api";

function Wishlist() {
  const { items, clearItems } = useContext(WishlistContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(items.length > 0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!items.length) {
      setProducts([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    api.get("products", { params: { page_size: 48 }, signal: controller.signal })
      .then(({ data }) => setProducts(data.items.filter((product) => items.includes(product.id))))
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setError("Saved items couldn't load. Please try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [items]);

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">Your collection</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Saved items</h1><p className="mt-2 text-sm text-neutral-500">A little list of things you love.</p></div>
          {!!items.length && <button onClick={clearItems} className="rounded-full border border-black/15 px-4 py-2.5 text-sm font-medium transition hover:border-black">Clear saved items</button>}
        </div>
        {loading && <div aria-live="polite" className="mt-8 text-sm text-neutral-500">Loading saved items…</div>}
        {error && <p role="alert" className="mt-8 rounded-2xl bg-rose-50 p-5 text-sm text-rose-800">{error}</p>}
        {!loading && !error && products.length > 0 && <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
        {!loading && !error && !products.length && <div className="mt-9 rounded-3xl border border-black/[0.08] bg-white px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3eee4] text-2xl">♡</div><h2 className="mt-5 text-2xl font-semibold">Your saved list is waiting.</h2><p className="mt-2 text-sm text-neutral-500">Tap the heart on anything you’d like to keep close.</p><Link to="/shop" className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">Discover NOVA</Link></div>}
      </main>
      <Footer />
    </div>
  );
}

export default Wishlist;
