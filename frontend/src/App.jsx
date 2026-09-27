import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";

const products = [
  {
    id: 1,
    name: "Nova Pro Headphones",
    category: "Audio",
    price: 12999,
    originalPrice: 15999,
    discount: 19,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
  },
  {
    id: 2,
    name: "Nova Mechanical Keyboard",
    category: "Gaming",
    price: 7499,
    originalPrice: 8999,
    discount: 17,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
  },
  {
    id: 3,
    name: "Nova Wireless Mouse",
    category: "Gaming",
    price: 3499,
    originalPrice: 4499,
    discount: 22,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?w=800",
  },
  {
    id: 4,
    name: "Nova Smart Watch",
    category: "Wearables",
    price: 9999,
    originalPrice: 11999,
    discount: 17,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
  },
];

function App() {
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

export default App;