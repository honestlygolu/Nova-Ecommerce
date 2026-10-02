import { useContext } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import CartContext from "../context/CartContext";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import { formatPrice } from "../utils/formatPrice";

function Cart() {
  const {
    cartItems,
    loading,
    cartError,
    warnings,
    subtotalPaise,
    totalQuantity,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    refreshCart,
  } = useContext(CartContext);

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-black"><ArrowLeft size={16} /> Continue shopping</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">Your selection</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Shopping bag</h1></div>
          <p className="text-sm text-neutral-500">{totalQuantity} {totalQuantity === 1 ? "item" : "items"}</p>
        </div>

        {warnings.map((warning) => <p key={warning} role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</p>)}
        {cartError && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{cartError}</span><button onClick={() => refreshCart().catch(() => {})} className="font-semibold underline underline-offset-4">Try again</button></div>}

        {loading && <div aria-live="polite" className="mt-8 grid gap-5 lg:grid-cols-[1fr_360px]"><div className="h-36 animate-pulse rounded-3xl bg-black/[0.06]" /><div className="h-72 animate-pulse rounded-3xl bg-black/[0.06]" /></div>}
        {!loading && cartItems.length === 0 && <div className="mt-9 rounded-[28px] border border-black/[0.08] bg-white px-6 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f2eee6] text-2xl">✳</div>
          <h2 className="mt-5 text-2xl font-semibold">Your bag is taking a breather.</h2>
          <p className="mt-2 text-sm text-neutral-500">Find something thoughtful for your everyday.</p>
          <Link to="/shop" className="mt-6 inline-flex rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800">Explore the shop</Link>
        </div>}

        {!loading && cartItems.length > 0 && <div className="mt-9 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-3" aria-label="Items in your shopping bag">
            {cartItems.map((product) => (
              <article key={product.id} className="flex gap-4 rounded-3xl border border-black/[0.08] bg-white p-4 sm:gap-6 sm:p-5">
                <Link to={`/product/${product.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#eeece6] sm:h-32 sm:w-32">
                  <img src={product.image} alt={product.name} onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }} className="h-full w-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a8055]">{product.category}</p><Link to={`/product/${product.id}`} className="mt-1 block truncate text-base font-semibold hover:underline sm:text-lg">{product.name}</Link><p className="mt-2 text-sm font-medium">{formatPrice(product.pricePaise)}</p><p className="mt-1 text-xs text-neutral-400">{product.stock} available</p></div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="inline-flex items-center rounded-full border border-black/10 p-1">
                      <button type="button" aria-label={`Decrease ${product.name} quantity`} disabled={product.quantity <= 1} onClick={() => decreaseQuantity(product.id)} className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 transition hover:bg-black/5 hover:text-black disabled:opacity-30"><Minus size={14} /></button>
                      <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold">{product.quantity}</span>
                      <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={product.quantity >= product.stock} onClick={() => increaseQuantity(product.id)} className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 transition hover:bg-black/5 hover:text-black disabled:opacity-30"><Plus size={14} /></button>
                    </div>
                    <button type="button" aria-label={`Remove ${product.name}`} onClick={() => removeFromCart(product.id)} className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-3xl border border-black/[0.08] bg-white p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a8055]">Order summary</p>
            <div className="mt-6 flex items-center justify-between text-sm"><span className="text-neutral-500">Subtotal</span><span className="font-semibold">{formatPrice(subtotalPaise)}</span></div>
            <div className="mt-4 flex items-center justify-between text-sm"><span className="text-neutral-500">Delivery</span><span className="font-semibold">Complimentary</span></div>
            <p className="mt-2 text-xs text-neutral-400">Taxes included in displayed prices.</p>
            <div className="my-6 border-t border-black/10" />
            <div className="flex items-center justify-between"><span className="font-semibold">Total</span><span className="text-xl font-semibold">{formatPrice(subtotalPaise)}</span></div>
            <Link to="/checkout" className="mt-6 flex w-full items-center justify-center rounded-full bg-black px-5 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800">Continue to checkout</Link>
            <p className="mt-4 text-center text-xs leading-5 text-neutral-400">Secure payment through Razorpay test checkout.</p>
          </aside>
        </div>}
      </main>
      <Footer />
    </div>
  );
}

export default Cart;
