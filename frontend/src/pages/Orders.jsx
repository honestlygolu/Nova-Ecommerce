import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { formatPrice } from "../utils/formatPrice";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get("orders", { signal: controller.signal })
      .then(({ data }) => setOrders(data))
      .catch((requestError) => { if (requestError.code !== "ERR_CANCELED") setError("Your order history couldn't load. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]"><Navbar />
      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">Your NOVA</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Order history</h1><p className="mt-2 text-sm text-neutral-500">Your purchases, all in one place.</p>
        {loading && <p aria-live="polite" className="mt-8 text-sm text-neutral-500">Loading your orders…</p>}
        {error && <p role="alert" className="mt-8 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {!loading && !error && orders.length > 0 && <div className="mt-8 space-y-3">{orders.map((order) => <Link key={order.id} to={`/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-black/[0.08] bg-white p-5 transition hover:border-black/20 hover:shadow-sm sm:p-6">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a8055]">{order.orderNumber}</p><p className="mt-2 text-sm text-neutral-500">{new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} · {order.items.reduce((count, item) => count + item.quantity, 0)} items</p></div>
          <div className="flex items-center gap-5"><div className="text-right"><p className="text-sm font-semibold">{formatPrice(order.totalPaise)}</p><p className="mt-1 text-xs capitalize text-neutral-500">{order.status.replaceAll("_", " ")}</p></div><span aria-hidden="true" className="text-xl text-neutral-400">›</span></div>
        </Link>)}</div>}
        {!loading && !error && orders.length === 0 && <div className="mt-8 rounded-3xl border border-black/[0.08] bg-white px-6 py-16 text-center"><h2 className="text-2xl font-semibold">Your story with NOVA starts here.</h2><p className="mt-2 text-sm text-neutral-500">Orders will show up here after checkout.</p><Link to="/shop" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">Explore the shop</Link></div>}
      </main><Footer />
    </div>
  );
}

export default Orders;
