import { useParams } from "react-router-dom";
import products from "../data/products";

function ProductDetails() {
  const { id } = useParams();
  const product = products.find((item) => item.id === Number(id));

  if (!product) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">Product not found.</h1>
    </div>
  );
}
  return (
  <div className="min-h-screen bg-white px-6 py-16">
    <div className="nova-fade-up mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
      
      {/* Product Image */}
      <div className="nova-image-reveal overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Product Information */}
      <div className="flex flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
          {product.category}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-gray-900">
          {product.name}
        </h1>

        <p className="mt-4 text-lg">
          ⭐ {product.rating}
        </p>

        <div className="mt-6 flex items-center gap-4">
          <span className="text-3xl font-bold text-gray-900">
            ₹{product.price}
          </span>

          <span className="text-lg text-gray-400 line-through">
            ₹{product.originalPrice}
          </span>

          <span className="rounded-full bg-black px-3 py-1 text-sm font-medium text-white">
            {product.discount}% OFF
          </span>
        </div>

        <p className="mt-6 text-gray-600">
          Experience premium quality and modern design with the {product.name}.
          Built for everyday use with the quality you expect from NOVA.
        </p>

        <button className="mt-8 rounded-xl bg-black px-6 py-4 text-lg font-semibold text-white transition hover:bg-gray-800">
          Add to Cart
        </button>
      </div>

    </div>
  </div>
);
}

export default ProductDetails;