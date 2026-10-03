import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Clock3, PackageCheck } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { formatPrice } from "../utils/formatPrice";

function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let attempts = 0;
    const refreshOrder = async () => {
      try {
        const { data } = await api.get(`orders/${id}`, { signal: controller.signal });
        setOrder(data);
        setError("");
        if (["pending_payment", "payment_processing", "refund_pending", "cancelled", "expired"].includes(data.status) && attempts < 20) {
          attempts += 1;
          timer = window.setTimeout(refreshOrder, 3000);
        }
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") setError("We couldn't load this order yet. Please check your order history.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void refreshOrder();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [id]);

  const paid = order?.status === "paid";
  const review = order?.status === "payment_review";
  const refundPending = order?.status === "refund_pending";
  const refunded = order?.status === "refunded";

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]"><Navbar />
      <main className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8 sm:py-20">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${paid ? "bg-emerald-100 text-emerald-800" : "bg-[#f0e8d8] text-[#876b3e]"}`}>{paid ? <Check size={27} /> : review ? <PackageCheck size={26} /> : <Clock3 size={26} />}</div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">{paid ? "Payment confirmed" : refunded ? "Refund processed" : refundPending ? "Refund started" : review ? "Payment received" : "Payment status"}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{paid ? "Thank you. It's on its way." : refunded ? "Your payment was refunded." : refundPending ? "Your refund is on its way." : review ? "Your payment needs a quick review." : order?.status === "expired" || order?.status === "cancelled" ? "This checkout wasn’t completed." : "We're confirming your order."}</h1>
        {loading && <p aria-live="polite" className="mt-4 text-sm text-neutral-500">Loading order details…</p>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
        {order && <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-black/[0.08] bg-white p-6 text-left sm:p-8">
          <div className="flex justify-between gap-4 text-sm"><span className="text-neutral-500">Order number</span><span className="font-semibold">{order.orderNumber}</span></div>
          <div className="mt-4 flex justify-between gap-4 text-sm"><span className="text-neutral-500">Status</span><span className="font-semibold capitalize">{order.status.replaceAll("_", " ")}</span></div>
          <div className="mt-4 flex justify-between gap-4 text-sm"><span className="text-neutral-500">Total</span><span className="font-semibold">{formatPrice(order.totalPaise)}</span></div>
          {review && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{order.failureReason || "We received a payment confirmation that needs manual review."} Please check your order history before trying another payment.</p>}
          {(refundPending || refunded) && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{order.failureReason || "A full refund was started for this payment."} Your order history will update when the refund is processed.</p>}
          {order.status === "expired" && <p className="mt-5 rounded-xl bg-neutral-100 p-4 text-sm leading-6 text-neutral-700">This checkout session expired before payment was confirmed. Your bag is still available if you’d like to try again.</p>}
        </div>}
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/orders" className="rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white">View my orders</Link><Link to="/shop" className="rounded-full border border-black/15 px-6 py-3.5 text-sm font-semibold transition hover:border-black">Continue browsing</Link></div>
      </main>
      <Footer />
    </div>
  );
}

export default OrderConfirmation;
