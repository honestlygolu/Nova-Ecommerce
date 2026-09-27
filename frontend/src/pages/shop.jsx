import { useState } from "react";
import products from "../data/products";
import ProductCard from "../components/ProductCard";

function Shop() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [sort, setSort] = useState("featured");

    const filteredProducts = products.filter((product) => {
  const matchesSearch = product.name
    .toLowerCase()
    .includes(search.toLowerCase());

  const matchesCategory =
    category === "All" || product.category === category;

  return matchesSearch && matchesCategory;
});

const sortedProducts = [...filteredProducts].sort((a, b) => {
  if (sort === "price-low") {
    return a.price - b.price;
  }

  if (sort === "price-high") {
    return b.price - a.price;
  }

  if (sort === "rating") {
    return b.rating - a.rating;
  }

  return 0;
});

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

    <div className="mt-6 flex flex-wrap gap-3">
  {["All", "Audio", "Gaming", "Wearables"].map((item) => (
    <button
      key={item}
      onClick={() => setCategory(item)}
      className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-black hover:text-white"
    >
      {item}
    </button>
  ))}
</div>

<div className="mt-6">
  <label className="mr-3 text-sm font-medium text-gray-700">
    Sort by:
  </label>

  <select
    value={sort}
    onChange={(e) => setSort(e.target.value)}
    className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-black"
  >
    <option value="featured">Featured</option>
    <option value="price-low">Price: Low to High</option>
    <option value="price-high">Price: High to Low</option>
    <option value="rating">Rating: High to Low</option>
  </select>
</div>

     <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
  {sortedProducts.map((product) => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
    </div>
  );
}

export default Shop;