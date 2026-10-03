import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { formatPrice } from "../utils/formatPrice";

function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get(`orders/${id}`, { signal: controller.signal })
      .then(({ data }) => setOrder(data))
      .catch((requestError) => { if (requestError.code !== "ERR_CANCELED") setError("This order couldn't be found."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]"><Navbar />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-black"><ArrowLeft size={16} /> Order history</Link>
        {loading && <p aria-live="polite" className="mt-8 text-sm text-neutral-500">Loading order…</p>}
        {error && <p role="alert" className="mt-8 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {order && <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">Order details</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{order.orderNumber}</h1></div><span className="rounded-full bg-white px-4 py-2 text-xs font-semibold capitalize text-neutral-600">{order.status.replaceAll("_", " ")}</span></div>
          {order.status === "payment_review" && <p role="status" className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{order.failureReason || "Your payment was captured and this order needs manual review."} Please check this order before trying another payment.</p>}
          {order.status === "refund_pending" && <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{order.failureReason || "A full refund was started for this payment."} Check this page again for the final refund status.</p>}
          {order.status === "refunded" && <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{order.failureReason || "The full refund was processed."}</p>}
          <div className="mt-8 grid items-start gap-5 md:grid-cols-[1fr_320px]">
            <section className="space-y-3">{order.items.map((item) => <article key={item.id} className="flex items-center gap-4 rounded-3xl border border-black/[0.08] bg-white p-4 sm:p-5"><img src={item.image} alt="" onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }} className="h-20 w-20 rounded-2xl bg-[#eeece6] object-cover" /><div className="min-w-0 flex-1"><p className="font-semibold">{item.name}</p><p className="mt-1 text-sm text-neutral-500">{item.sku} · Size {item.size || "M"} · Qty {item.quantity}</p></div><p className="text-sm font-semibold">{formatPrice(item.lineTotalPaise)}</p></article>)}</section>
            <aside className="space-y-4"><section className="rounded-3xl border border-black/[0.08] bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a8055]">Delivery address</p><address className="mt-4 not-italic text-sm leading-6 text-neutral-600">{order.shippingAddress.name}<br />{order.shippingAddress.addressLine1}<br />{order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />{order.shippingAddress.country}<br />{order.shippingAddress.phone}</address></section><section className="rounded-3xl border border-black/[0.08] bg-white p-6"><div className="flex justify-between text-sm text-neutral-500"><span>Delivery</span><span>Complimentary</span></div><div className="mt-4 flex justify-between border-t border-black/10 pt-4 font-semibold"><span>{["paid", "payment_review"].includes(order.status) ? "Total paid" : order.status === "refunded" ? "Amount refunded" : order.status === "refund_pending" ? "Refund amount" : "Order total"}</span><span>{formatPrice(order.totalPaise)}</span></div></section></aside>
          </div>
        </>}
      </main><Footer />
    </div>
  );
}

export default OrderDetails;
