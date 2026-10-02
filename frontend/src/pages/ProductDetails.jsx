import { useContext, useEffect, useState } from "react";
import { ArrowLeft, Heart, ShoppingBag, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import CartContext from "../context/CartContext";
import WishlistContext from "../context/WishlistContext";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import api, { getApiError } from "../services/api";
import { formatPrice } from "../utils/formatPrice";

function ProductDetails() {
  const { id } = useParams();
  const { addToCart, loading: cartLoading } = useContext(CartContext);
  const wishlist = useContext(WishlistContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get(`products/${id}`, { signal: controller.signal })
      .then(({ data }) => setProduct(data))
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(requestError?.response?.status === 404 ? "We couldn't find that product." : "The product couldn't load. Please try again.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  const handleAdd = async () => {
    setActionError("");
    try {
      const result = await addToCart(product);
      if (result === false) {
        setActionError(`Only ${product.stock} are currently available.`);
        return;
      }
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } catch (error) {
      setActionError(getApiError(error, "The item couldn't be added."));
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-black"><ArrowLeft size={16} /> Back to shop</Link>
        {loading && <div aria-live="polite" className="mt-8 grid min-h-[560px] animate-pulse gap-10 md:grid-cols-2"><div className="rounded-3xl bg-black/[0.06]" /><div className="rounded-3xl bg-black/[0.06]" /></div>}
        {!loading && error && <div role="alert" className="mx-auto mt-12 max-w-xl rounded-3xl border border-black/10 bg-white p-10 text-center"><h1 className="text-2xl font-semibold">{error}</h1><Link to="/shop" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">Explore the shop</Link></div>}
        {!loading && product && <article className="nova-fade-up mt-8 grid gap-10 md:grid-cols-[1.06fr_.94fr] md:gap-16">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-[#eeece6]">
            <img src={product.image} alt={product.name} onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }} className="h-full w-full object-cover" />
            {product.discount > 0 && <span className="absolute left-5 top-5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">Save {product.discount}%</span>}
          </div>
          <div className="flex flex-col justify-center py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">{product.category} · NOVA collection</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{product.name}</h1>
            <div className="mt-5 flex items-center gap-2 text-sm text-neutral-600"><Star size={16} fill="currentColor" className="text-[#b58d4e]" /><span className="font-semibold text-black">{Number(product.rating).toFixed(1)}</span><span>Thoughtfully rated by NOVA customers</span></div>
            <div className="mt-7 flex items-baseline gap-3">
              <span className="text-3xl font-semibold">{formatPrice(product.pricePaise)}</span>
              {product.originalPricePaise > product.pricePaise && <span className="text-base text-neutral-400 line-through">{formatPrice(product.originalPricePaise)}</span>}
            </div>
            <p className="mt-7 max-w-xl text-base leading-7 text-neutral-600">{product.description}</p>
            <p className={`mt-6 text-sm ${product.stock > 0 ? "text-emerald-800" : "text-rose-700"}`}>{product.stock > 0 ? `${product.stock} available` : "Currently sold out"}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button onClick={handleAdd} disabled={cartLoading || product.stock <= 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"> <ShoppingBag size={17} />{product.stock <= 0 ? "Sold out" : cartLoading ? "Syncing bag…" : added ? "Added to bag" : "Add to bag"}</button>
              <button type="button" aria-pressed={wishlist?.hasItem(product.id) || false} onClick={() => wishlist?.toggleItem(product.id)} className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 px-6 py-4 text-sm font-semibold transition hover:border-black hover:bg-white"><Heart size={17} fill={wishlist?.hasItem(product.id) ? "currentColor" : "none"} />{wishlist?.hasItem(product.id) ? "Saved" : "Save item"}</button>
            </div>
            {actionError && <p role="status" className="mt-3 text-sm text-rose-700">{actionError}</p>}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-black/10 pt-6 text-xs text-neutral-500"><p>Complimentary delivery</p><p>Secure sandbox checkout</p></div>
          </div>
        </article>}
      </main>
      <Footer />
    </div>
  );
}

export default ProductDetails;
