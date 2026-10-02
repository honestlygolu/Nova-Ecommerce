import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/navbar";
import ProductCard from "./components/productcard";
import Footer from "./components/Footer";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import { useAuth } from "./context/AuthContext";
import api from "./services/api";

function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get("products", { params: { page_size: 4 }, signal: controller.signal }),
      api.get("products/categories", { signal: controller.signal }),
    ]).then(([productResponse, categoryResponse]) => {
      setProducts(productResponse.data.items);
      setCategories(categoryResponse.data);
    }).catch((error) => {
      if (error.code !== "ERR_CANCELED") setCatalogError(true);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const heroProduct = products[0];

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main>
        <section className="overflow-hidden bg-[#111111] text-white">
          <div className="mx-auto grid min-h-[590px] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_1.05fr] md:py-16">
            <div className="relative z-10 py-5">
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#d5bd8b]"><span className="h-px w-8 bg-[#d5bd8b]" /> Technology, considered</p>
              <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl">The everyday,<br /><span className="text-[#c8b58e]">reimagined.</span></h1>
              <p className="mt-6 max-w-md text-base leading-7 text-white/55">Discover thoughtful essentials that bring a little more intention to how you work, play, and unwind.</p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link to="/shop" className="group inline-flex items-center gap-3 rounded-full bg-[#f1ebdf] px-6 py-4 text-sm font-semibold text-black transition hover:bg-white">Explore the collection <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
                <a href="#categories" className="text-sm text-white/55 transition hover:text-white">Shop by category</a>
              </div>
              <div className="mt-12 flex gap-8 border-t border-white/10 pt-6 text-xs text-white/40">
                <div><strong className="block text-lg font-medium text-white">01</strong>Thoughtful design</div>
                <div><strong className="block text-lg font-medium text-white">02</strong>Everyday utility</div>
                <div><strong className="block text-lg font-medium text-white">03</strong>Made to last</div>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[580px]">
              <div className="absolute -inset-6 rounded-[50%] bg-[#b48d54]/15 blur-[70px]" />
              <div className="relative aspect-[1.08] overflow-hidden rounded-[34px] border border-white/10 bg-[#24231f]">
                {heroProduct ? <img src={heroProduct.image} alt={heroProduct.name} onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }} className="h-full w-full object-cover opacity-90" /> : <div className="grid h-full place-items-center text-8xl font-black text-white/10">N</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/5" />
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-6 sm:p-8">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">Meet the collection</p><h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">Designed to feel right.</h2></div>
                  <Link aria-label="Explore featured product" to={heroProduct ? `/product/${heroProduct.id}` : "/shop"} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/35 text-white transition hover:bg-white hover:text-black"><ArrowUpRight size={20} /></Link>
                </div>
                {loading && <div className="absolute inset-0 animate-pulse bg-white/[0.04]" />}
              </div>
            </div>
          </div>
        </section>

        <section id="categories" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a8055]">Find your fit</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Shop by category</h2></div>
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-black">All products <ArrowRight size={16} /></Link>
          </div>
          {catalogError && <p role="status" className="mt-6 text-sm text-neutral-500">The catalogue is taking a moment to connect.</p>}
          {!loading && !catalogError && <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link key={category} to={`/shop?category=${encodeURIComponent(category)}`} className="group flex min-h-[180px] flex-col justify-between rounded-3xl border border-black/[0.08] bg-white p-6 transition hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_20px_45px_rgba(0,0,0,.07)] sm:p-7">
                <span className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#f2eee6] text-sm font-semibold text-[#927548]">0{index + 1}</span><ArrowUpRight size={19} className="text-neutral-400 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-black" /></span>
                <span><span className="block text-xl font-semibold">{category}</span><span className="mt-1 block text-sm text-neutral-500">Explore the {category.toLowerCase()} collection</span></span>
              </Link>
            ))}
          </div>}
        </section>

        <section className="border-y border-black/[0.06] bg-[#efede7]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a8055]">A few good things</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The NOVA edit</h2></div>
              <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-black">View the full shop <ArrowRight size={16} /></Link>
            </div>
            {catalogError && <div role="status" className="mt-8 rounded-2xl bg-white p-6 text-sm text-neutral-500">Products are temporarily unavailable. Please try the shop again in a moment.</div>}
            {loading && <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[.78] animate-pulse rounded-2xl bg-black/[0.06]" />)}</div>}
            {!loading && !catalogError && products.length > 0 && <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid items-center gap-8 rounded-[30px] bg-[#d7c7a7] px-7 py-9 sm:px-10 md:grid-cols-[1fr_auto] md:px-14 md:py-12">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-black/50">Your next favorite</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Good design makes room for more.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-black/60">Browse the NOVA collection and find the piece that fits your everyday.</p></div>
            <Link to="/shop" className="inline-flex items-center justify-center gap-3 rounded-full bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800">Browse products <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#08090a] text-sm text-white/55">Loading your account…</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main className="mx-auto grid min-h-[58vh] max-w-3xl place-items-center px-5 py-16 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a8055]">A little off the map</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">We can’t find that page.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-neutral-500">The link may have moved. Come back to the NOVA collection and keep exploring.</p>
          <Link to="/shop" className="mt-7 inline-flex rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800">Explore the shop</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/order-confirmation/:id" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
