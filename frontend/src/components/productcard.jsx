import { ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import WishlistContext from "../context/WishlistContext";
import { formatPrice } from "../utils/formatPrice";

function ProductCard({ product }) {
  const wishlist = useContext(WishlistContext);
  const saved = wishlist?.hasItem(product.id) || false;
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
        {product.discount > 0 && (
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

        <p className="mt-2 text-xs text-neutral-500">Soft-touch feel · Easy everyday fit</p>

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
        <Link to={`/product/${product.id}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
          Choose a size <ArrowRight size={16} />
        </Link>

      </div>
    </article>
  );
}

export default ProductCard;
