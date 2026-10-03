import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import api from "../services/api";

function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("q") || "";
  const category = searchParams.get("category") || "All";
  const [search, setSearch] = useState(queryFromUrl);
  const [sort, setSort] = useState("featured");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 12;

  useEffect(() => setSearch(queryFromUrl), [queryFromUrl]);

  const categories = ["Tops", "Layers", "Bottoms"];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      api.get("products", {
        params: {
          q: search.trim() || undefined,
          category: category === "All" ? undefined : category,
          sort,
          page,
          page_size: pageSize,
        },
        signal: controller.signal,
      }).then(({ data }) => {
        setProducts(data.items);
        setTotal(data.total);
      }).catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setError("We couldn't load the catalogue. Check the connection and try again.");
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, search ? 220 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, category, sort, page]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set("q", search.trim());
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const selectCategory = (nextCategory) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (nextCategory === "All") next.delete("category");
    else next.set("category", nextCategory);
    setSearchParams(next);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#171717]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9a8055]">The clothing collection</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Everyday clothes, considered.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">Easy layers, relaxed fits, and soft-touch staples made to wear on repeat.</p>
          </div>
          <form onSubmit={submitSearch} className="flex w-full max-w-md gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
            <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search clothes" aria-label="Search clothes" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
            <button className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">Search</button>
          </form>
        </div>

        <section id="categories" className="mt-10 border-y border-black/10 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2" aria-label="Product categories">
              {["All", ...categories].map((item) => (
                <button key={item} type="button" aria-pressed={category === item} onClick={() => selectCategory(item)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${category === item ? "bg-black text-white" : "border border-black/10 bg-white text-neutral-600 hover:border-black/30 hover:text-black"}`}>
                  {item}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-sm text-neutral-500">
              <span>Sort</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none focus:border-black/40">
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>
        </section>

        <div className="mt-7 flex items-center justify-between text-sm text-neutral-500">
          <p>{loading ? "Finding your next favorite…" : `${total} ${total === 1 ? "piece" : "pieces"}`}</p>
          {(queryFromUrl || category !== "All") && <Link to="/shop" className="underline underline-offset-4 hover:text-black">Clear filters</Link>}
        </div>

        {error && <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}</div>}
        {loading && <div aria-live="polite" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[.78] animate-pulse rounded-2xl bg-black/[0.06]" />)}</div>}
        {!loading && !error && products.length > 0 && <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
        {!loading && !error && products.length === 0 && (
          <div className="mt-8 rounded-3xl border border-black/[0.08] bg-white px-6 py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a8055]">Nothing here yet</p>
            <h2 className="mt-3 text-2xl font-semibold">No products match those filters.</h2>
            <p className="mt-2 text-sm text-neutral-500">Try a different search or browse the full collection.</p>
            <Link to="/shop" className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">View all products</Link>
          </div>
        )}

        {!loading && pages > 1 && <div className="mt-10 flex items-center justify-center gap-4">
          <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-full border border-black/15 px-4 py-2 text-sm disabled:opacity-35">Previous</button>
          <span className="text-sm text-neutral-500">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-black/15 px-4 py-2 text-sm disabled:opacity-35">Next</button>
        </div>}
      </main>
      <Footer />
    </div>
  );
}

export default Shop;
