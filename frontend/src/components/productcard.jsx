import { Heart, ShoppingBag, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import CartContext from "../context/CartContext";

function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
       <Link to={`/product/${product.id}`}>
       <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        </Link>

        {/* Wishlist */}
        <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-black hover:text-white">
          <Heart size={18} />
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
            ₹{product.price.toLocaleString("en-IN")}
          </span>

          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              ₹{product.originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={() => addToCart(product)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          <ShoppingBag size={17} />
          Add to Cart
        </button>

      </div>
    </div>
  );
}

export default ProductCard;