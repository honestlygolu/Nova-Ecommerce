import { Heart, ShoppingBag, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import CartContext from "../context/CartContext";
import WishlistContext from "../context/WishlistContext";
import { formatPrice } from "../utils/formatPrice";
import { getApiError } from "../services/api";

function ProductCard({ product }) {
  const { addToCart, loading: cartLoading } = useContext(CartContext);
  const wishlist = useContext(WishlistContext);
  const saved = wishlist?.hasItem(product.id) || false;
  const [added, setAdded] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleAdd = async () => {
    setActionError("");
    try {
      const result = await addToCart(product);
      if (result === false) setActionError(`Only ${product.stock} are currently available.`);
      else {
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }
    } catch (error) {
      setActionError(getApiError(error, "The item couldn't be added."));
    }
  };
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(0,0,0,.1)]">
      
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
       <Link to={`/product/${product.id}`}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(event) => { event.currentTarget.src = "/product-placeholder.svg"; }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        </Link>

        {/* Wishlist */}
        <button
          type="button"
          aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
          aria-pressed={saved}
          onClick={() => wishlist?.toggleItem(product.id)}
          className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-black hover:text-white ${saved ? "text-rose-600" : "text-neutral-700"}`}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>

        {/* Discount */}
        {product.discount && (
          <span className="absolute left-4 top-4 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
            -{product.discount}%
          </span>
        )}
      </div>

      {/* Product Information */}
      <div className="p-5">
        
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {product.category}
        </p>

        <Link
          to={`/product/${product.id}`}
          className="mt-2 block text-lg font-bold text-gray-900 hover:underline"
          >
          {product.name}
        </Link>      

        {/* Rating */}
        <div className="mt-2 flex items-center gap-1">
          <Star size={15} fill="currentColor" />
          <span className="text-sm font-medium">
            {product.rating}
          </span>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xl font-black">
            {formatPrice(product.pricePaise)}
          </span>

          {product.originalPricePaise > product.pricePaise && (
            <span className="text-sm text-gray-400 line-through">
            {formatPrice(product.originalPricePaise)}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAdd}
          disabled={cartLoading || product.stock <= 0}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          <ShoppingBag size={17} />
          {product.stock <= 0 ? "Sold out" : cartLoading ? "Syncing bag…" : added ? "Added to bag" : "Add to bag"}
        </button>
        {actionError && <p role="status" className="mt-2 text-xs text-rose-700">{actionError}</p>}

      </div>
    </article>
  );
}

export default ProductCard;
