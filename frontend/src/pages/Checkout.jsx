import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import CartContext from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api, { getApiError } from "../services/api";
import { formatPrice } from "../utils/formatPrice";

const fieldClass = "mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-neutral-300 focus:border-black/40 focus:ring-2 focus:ring-black/5 disabled:bg-neutral-50 disabled:text-neutral-500";

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const current = document.querySelector("script[data-razorpay-checkout]");
    if (current) {
      current.addEventListener("load", resolve, { once: true });
      current.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function checkoutAddress(order) {
  const saved = order.shippingAddress;
  return {
    name: saved.name,
    phone: saved.phone,
    addressLine1: saved.addressLine1,
    addressLine2: saved.addressLine2 || "",
    city: saved.city,
    state: saved.state,
    postalCode: saved.postalCode,
    country: saved.country,
  };
}

function Checkout() {
  const { user } = useAuth();
  const { cartItems, subtotalPaise, loading: cartLoading, refreshCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [activeCheckout, setActiveCheckout] = useState(null);
  const [checkingActiveCheckout, setCheckingActiveCheckout] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const paymentHandlerStarted = useRef(false);
  const checkoutKey = useRef("");
  const cartSignature = cartItems.map((item) => `${item.id}:${item.quantity}:${item.pricePaise}`).join("|");
  const previousCartSignature = useRef(cartSignature);

  useEffect(() => {
    let current = true;
    api.get("orders/active")
      .then(({ data: order }) => {
        if (!current || !order) return;
        setActiveCheckout(order);
        setAddress(checkoutAddress(order));
        setNotice("Your secure checkout was restored. You can resume payment or cancel it to edit your delivery details.");
      })
      .catch((requestError) => {
        if (current) setError(getApiError(requestError, "We couldn't check for an existing checkout. You can still try again safely."));
      })
      .finally(() => {
        if (current) setCheckingActiveCheckout(false);
      });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (previousCartSignature.current !== cartSignature && !activeCheckout) {
      checkoutKey.current = "";
    }
    previousCartSignature.current = cartSignature;
  }, [activeCheckout, cartSignature]);

  const update = (key) => (event) => {
    if (!activeCheckout) checkoutKey.current = "";
    setAddress((current) => ({ ...current, [key]: event.target.value }));
  };

  const restoreActiveCheckout = async () => {
    const { data: order } = await api.get("orders/active");
    if (!order) return false;
    setActiveCheckout(order);
    setAddress(checkoutAddress(order));
    setNotice("An open checkout was found and restored. Resume payment or cancel it to make changes.");
    setError("");
    return true;
  };

  const retryActiveCheckoutLookup = async () => {
    setError("");
    setCheckingActiveCheckout(true);
    try {
      await restoreActiveCheckout();
    } catch (requestError) {
      setError(getApiError(requestError, "We couldn't check for an existing checkout. Please try again."));
    } finally {
      setCheckingActiveCheckout(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    paymentHandlerStarted.current = false;
    if (!activeCheckout && !checkoutKey.current) checkoutKey.current = window.crypto.randomUUID();
    setSubmitting(true);
    let order = activeCheckout;
    let createdForThisAttempt = false;
    try {
      if (!order) {
        const { data } = await api.post("orders", { shippingAddress: address }, {
          headers: { "Idempotency-Key": checkoutKey.current },
        });
        order = data;
        createdForThisAttempt = true;
        setActiveCheckout(order);
        setAddress(checkoutAddress(order));
      }
      await loadRazorpayScript();

      const savedAddress = order.shippingAddress;
      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.totalPaise,
        currency: order.currency,
        name: "NOVA",
        description: `Order ${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        prefill: { name: savedAddress.name, email: user?.email, contact: savedAddress.phone },
        notes: { order_number: order.orderNumber },
        theme: { color: "#171717" },
        handler: async (paymentResponse) => {
          paymentHandlerStarted.current = true;
          setNotice("Payment received. Confirming your order…");
          try {
            const { data: result } = await api.post(`orders/${order.id}/verify`, {
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            });
            checkoutKey.current = "";
            setActiveCheckout(null);
            await refreshCart().catch(() => {});
            navigate(`/order-confirmation/${order.id}`, { replace: true, state: { paymentStatus: result.paymentStatus } });
          } catch (verificationError) {
            setSubmitting(false);
            setNotice("");
            setError(`${getApiError(verificationError, "Payment is still being confirmed.")} You can resume this checkout or check your order history shortly.`);
          }
        },
        modal: {
          ondismiss: () => {
            if (paymentHandlerStarted.current) return;
            setNotice("Closing your checkout…");
            api.post(`orders/${order.id}/cancel`).then(async ({ data: result }) => {
              if (["paid", "payment_review", "refund_pending", "refunded"].includes(result.status)) {
                navigate(`/order-confirmation/${order.id}`, { replace: true });
                return;
              }
              checkoutKey.current = "";
              setActiveCheckout(null);
              await refreshCart().catch(() => {});
              setNotice("Checkout closed in NOVA. Any late payment will be refunded or moved to manual review; check order history before paying again.");
            }).catch((cancelError) => {
              setNotice("");
              setError(getApiError(cancelError, "Checkout is still open. You can return and finish it."));
            }).finally(() => {
              setSubmitting(false);
            });
          },
        },
      });
      checkout.open();
    } catch (requestError) {
      if (createdForThisAttempt && order?.id) {
        try {
          await api.post(`orders/${order.id}/cancel`);
          setActiveCheckout(null);
          checkoutKey.current = "";
        } catch {
          setActiveCheckout(order);
        }
      }
      if (requestError?.response?.status === 409) {
        try {
          if (await restoreActiveCheckout()) {
            setSubmitting(false);
            return;
          }
        } catch {
          // Keep the original server message if the recovery lookup also fails.
        }
      }
      if (requestError?.response && !activeCheckout) checkoutKey.current = "";
      setError(getApiError(requestError, "Checkout couldn't be started. Please try again."));
      setSubmitting(false);
    }
  };

  const cancelActiveCheckout = async () => {
    if (!activeCheckout) return;
    setError("");
    setNotice("Cancelling your checkout…");
    setSubmitting(true);
    try {
      const { data: result } = await api.post(`orders/${activeCheckout.id}/cancel`);
      if (["paid", "payment_review", "refund_pending", "refunded"].includes(result.status)) {
        navigate(`/order-confirmation/${activeCheckout.id}`, { replace: true });
        return;
      }
      setActiveCheckout(null);
      checkoutKey.current = "";
      setNotice("Checkout closed in NOVA. Any late payment will be refunded or moved to manual review; check order history before paying again.");
      await refreshCart().catch(() => {});
    } catch (cancelError) {
      setNotice("");
      setError(getApiError(cancelError, "We couldn't cancel this checkout. Your saved order is still available."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartLoading && !checkingActiveCheckout && cartItems.length === 0 && !activeCheckout && !error) {
    return <div className="min-h-screen bg-[#f7f6f3]"><Navbar /><main className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-3xl font-semibold">Your bag is empty.</h1><Link to="/shop" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white">Return to shop</Link></main><Footer /></div>;
  }

  const orderItems = activeCheckout?.items || cartItems;
  const totalPaise = activeCheckout?.totalPaise ?? subtotalPaise;

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-black"><ArrowLeft size={16} /> Back to bag</Link>
        <div className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">Almost yours</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Checkout</h1><p className="mt-2 text-sm text-neutral-500">Delivery is complimentary. Your payment stays in test mode.</p></div>
        {(cartLoading || checkingActiveCheckout) && <p aria-live="polite" className="mt-7 text-sm text-neutral-500">Loading your secure checkout…</p>}
        {!cartLoading && !checkingActiveCheckout && <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} className="rounded-3xl border border-black/[0.08] bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2eee6] text-sm font-semibold">1</span><div><h2 className="font-semibold">Delivery details</h2><p className="text-xs text-neutral-500">{activeCheckout ? `Saved for order ${activeCheckout.orderNumber}` : "Where should we send your order?"}</p></div></div>
            {activeCheckout && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"><p className="font-semibold">You have a payment in progress</p><p className="mt-1 leading-6">This order keeps the bag and delivery address saved when checkout began. Resume payment below, or close it here to make changes. Closing it here cannot close a Razorpay window already open in another tab; any late payment will trigger a full refund, or be flagged for review if the refund cannot be confirmed.</p><button type="button" onClick={cancelActiveCheckout} disabled={submitting} className="mt-3 text-sm font-semibold underline underline-offset-4 disabled:opacity-50">Close this checkout</button></div>}
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-neutral-600 sm:col-span-2">Full name<input required autoComplete="name" maxLength={100} value={address.name} onChange={update("name")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} /></label>
              <label className="text-xs font-medium text-neutral-600 sm:col-span-2">Phone number<input required type="tel" autoComplete="tel" minLength={7} maxLength={24} value={address.phone} onChange={update("phone")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} placeholder="For delivery updates" /></label>
              <label className="text-xs font-medium text-neutral-600 sm:col-span-2">Address line 1<input required autoComplete="address-line1" maxLength={180} value={address.addressLine1} onChange={update("addressLine1")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} placeholder="Street and building" /></label>
              <label className="text-xs font-medium text-neutral-600 sm:col-span-2">Address line 2 <span className="font-normal text-neutral-400">(optional)</span><input autoComplete="address-line2" maxLength={180} value={address.addressLine2} onChange={update("addressLine2")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} placeholder="Apartment, suite, landmark" /></label>
              <label className="text-xs font-medium text-neutral-600">City<input required autoComplete="address-level2" value={address.city} onChange={update("city")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} /></label>
              <label className="text-xs font-medium text-neutral-600">State / region<input required autoComplete="address-level1" value={address.state} onChange={update("state")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} /></label>
              <label className="text-xs font-medium text-neutral-600">Postal code<input required autoComplete="postal-code" value={address.postalCode} onChange={update("postalCode")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} /></label>
              <label className="text-xs font-medium text-neutral-600">Country<input required autoComplete="country-name" value={address.country} onChange={update("country")} disabled={Boolean(activeCheckout) || submitting} className={fieldClass} /></label>
            </div>
            {notice && <p role="status" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
            {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><p>{error}</p>{!activeCheckout && cartItems.length === 0 && <button type="button" onClick={retryActiveCheckoutLookup} className="mt-2 font-semibold underline underline-offset-2">Check again</button>}</div>}
            <button disabled={submitting || (!activeCheckout && cartItems.length === 0)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-50"><LockKeyhole size={16} />{submitting ? "Opening secure checkout…" : activeCheckout ? "Resume secure payment" : "Pay securely with Razorpay"}</button>
            <p className="mt-3 text-center text-xs leading-5 text-neutral-400">This portfolio store uses Razorpay sandbox keys. No real payment is taken.</p>
          </form>
          <aside className="rounded-3xl border border-black/[0.08] bg-white p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a8055]">{activeCheckout ? "Saved order" : "Your bag"}</p>
            <div className="mt-5 space-y-4">{orderItems.map((item) => <div key={item.id} className="flex items-center gap-3"><img src={item.image} alt="" onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }} className="h-14 w-14 rounded-xl bg-[#eeece6] object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-neutral-400">Qty {item.quantity}</p></div><p className="text-sm font-semibold">{formatPrice(item.lineTotalPaise ?? item.pricePaise * item.quantity)}</p></div>)}</div>
            <div className="my-5 border-t border-black/10" />
            <div className="flex justify-between text-sm text-neutral-500"><span>Subtotal</span><span className="font-medium text-black">{formatPrice(totalPaise)}</span></div>
            <div className="mt-3 flex justify-between text-sm text-neutral-500"><span>Delivery</span><span className="font-medium text-black">Complimentary</span></div>
            <div className="my-5 border-t border-black/10" />
            <div className="flex justify-between font-semibold"><span>Total</span><span className="text-lg">{formatPrice(totalPaise)}</span></div>
          </aside>
        </div>}
      </main>
      <Footer />
    </div>
  );
}

export default Checkout;
