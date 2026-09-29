import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import products from "./data/products";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";

function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="bg-black text-white">
          <div className="mx-auto grid min-h-[600px] max-w-7xl items-center px-6 py-20 md:grid-cols-2">
            
            <div>
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">
                The future of tech
              </p>

              <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Technology,
                <br />
                redefined.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-8 text-gray-400">
                Discover premium technology designed for the way you live,
                work and create.
              </p>

              <button className="mt-8 bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-gray-200">
                SHOP NOW
              </button>
            </div>

            {/* Hero Visual */}
            <div className="mt-12 flex justify-center md:mt-0">
              <div className="relative flex h-80 w-80 items-center justify-center rounded-full border border-gray-700 md:h-[450px] md:w-[450px]">
                <div className="flex h-60 w-60 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 via-gray-900 to-black shadow-2xl md:h-80 md:w-80">
                  <span className="text-7xl font-black tracking-tighter text-white">
                    N
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-7xl px-6 py-24">

          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">
              Explore
            </p>

            <h2 className="mt-2 text-4xl font-black tracking-tight">
              Shop by category
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              ["Audio", "Headphones & speakers"],
              ["Gaming", "Gear for serious players"],
              ["Laptops", "Power meets portability"],
              ["Accessories", "Complete your setup"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="group cursor-pointer border border-gray-200 p-8 transition hover:border-black"
              >
                <div className="mb-12 text-4xl font-black">
                  {title.charAt(0)}
                </div>

                <h3 className="text-xl font-bold">
                  {title}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {description}
                </p>

                <div className="mt-6 text-sm font-bold">
                  Explore →
                </div>
              </div>
              
            ))}
          </div>
          </section>
          <section className="mx-auto max-w-7xl px-6 py-24">
  <div className="mb-12 flex items-end justify-between">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">
        Featured
      </p>

      <h2 className="mt-2 text-4xl font-black tracking-tight">
        Trending products
      </h2>
    </div>

    <button className="hidden text-sm font-bold sm:block">
      View all →
    </button>
  </div>

  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {products.map((product) => (
      <ProductCard key={product.id} product={product} />
    ))}
  </div>
</section>

        
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/product/:id" element={<ProductDetails />} />
    </Routes>
  );
}

export default App;