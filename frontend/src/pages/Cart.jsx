import { useContext } from "react";
import { Link } from "react-router-dom";
import CartContext from "../context/CartContext";

function Cart() {
    const {
  cartItems,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
} = useContext(CartContext);

const subtotal = cartItems.reduce(
  (total, product) => total + product.price * product.quantity,
  0
);

  return (
    <div className="min-h-screen bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-gray-900">
          Your Cart
        </h1>
        <p className="mt-4 text-gray-500">
                {cartItems.length} item(s) in your cart
        </p>

        

        {cartItems.length === 0 && (
  <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-gray-200 px-6 py-16 text-center">
    <div className="text-5xl">🛒</div>

    <h2 className="mt-5 text-2xl font-bold text-gray-900">
      Your cart is empty
    </h2>

    <p className="mt-2 max-w-md text-gray-500">
      Looks like you haven't added anything to your cart yet.
    </p>

    <Link
      to="/shop"
      className="mt-6 rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
    >
      Continue Shopping
    </Link>
  </div>
)}

        <div className="mt-8 space-y-4">
  {cartItems.map((product) => (
  <div
    key={product.id}
    className="flex items-center gap-6 rounded-2xl border border-gray-200 p-4"
  >
    <img
      src={product.image}
      alt={product.name}
      className="h-24 w-24 rounded-xl object-cover"
    />

    <div className="flex-1">
      <h2 className="text-lg font-bold text-gray-900">
        {product.name}
      </h2>

      <p className="mt-1 text-gray-500">
        {product.category}
      </p>

      <p className="mt-2 font-semibold text-gray-900">
        ₹{product.price}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => decreaseQuantity(product.id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-lg transition hover:bg-black hover:text-white"
        >
          −
        </button>

        <span className="min-w-6 text-center font-semibold">
          {product.quantity}
        </span>

        <button
          onClick={() => increaseQuantity(product.id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-lg transition hover:bg-black hover:text-white"
        >
          +
        </button>
      </div>
    </div>

    <button
      onClick={() => removeFromCart(product.id)}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-black hover:text-white"
    >
      Remove
    </button>
  </div>
))}

</div>

{cartItems.length > 0 && (
  <div className="mt-10 ml-auto max-w-md rounded-2xl border border-gray-200 p-6">

  <h2 className="text-xl font-bold text-gray-900">
    Order Summary
  </h2>

  <div className="mt-6 flex items-center justify-between">
    <span className="text-gray-500">
      Subtotal
    </span>

    <span className="font-semibold text-gray-900">
      ₹{subtotal.toLocaleString("en-IN")}
    </span>
  </div>

  <div className="mt-3 flex items-center justify-between">
    <span className="text-gray-500">
      Delivery
    </span>

    <span className="font-semibold text-gray-900">
      FREE
    </span>
  </div>

  <div className="my-5 border-t border-gray-200" />

  <div className="flex items-center justify-between">
    <span className="text-lg font-bold text-gray-900">
      Total
    </span>

    <span className="text-lg font-bold text-gray-900">
      ₹{subtotal.toLocaleString("en-IN")}
    </span>
  </div>

  <button className="mt-6 w-full rounded-xl bg-black py-3 font-semibold text-white transition hover:bg-gray-800">
    Proceed to Checkout
  </button>
</div>
)}
</div>
</div>
);
}

export default Cart;