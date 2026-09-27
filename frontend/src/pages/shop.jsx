import { useState } from "react";
import products from "../data/products";
import ProductCard from "../components/ProductCard";

function Shop() {
    const [search, setSearch] = useState("");

    const filteredProducts = products.filter((product) =>
  product.name.toLowerCase().includes(search.toLowerCase())
);
  return (
    <div className="min-h-screen bg-white px-6 py-20">
      <h1 className="text-4xl font-bold text-black">
        NOVA Shop
      </h1>

      <div className="mt-8">
  <input
    type="text"
    placeholder="Search products..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
  />
    </div>

     <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
  {filteredProducts.map((product) => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
    </div>
  );
}

export default Shop;