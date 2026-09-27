import { Search, ShoppingBag, Heart, User } from "lucide-react";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <div className="text-2xl font-black tracking-tight">
          NOVA
        </div>

        {/* Navigation */}
        <div className="hidden items-center gap-8 md:flex">
         <Link to="/" className="text-sm font-medium text-gray-900">
           Home
        </Link>

        <Link
            to="/shop"
           className="text-sm font-medium text-gray-500 transition hover:text-black"
            >
           Shop
        </Link>

          <a
            href="#"
            className="text-sm font-medium text-gray-500 transition hover:text-black"
          >
            Categories
          </a>

          <a
            href="#"
            className="text-sm font-medium text-gray-500 transition hover:text-black"
          >
            About
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-5">
          <button className="text-gray-700 transition hover:text-black">
            <Search size={20} />
          </button>

          <button className="hidden text-gray-700 transition hover:text-black sm:block">
            <Heart size={20} />
          </button>

          <button className="hidden text-gray-700 transition hover:text-black sm:block">
            <User size={20} />
          </button>

          <button className="relative text-gray-700 transition hover:text-black">
            <ShoppingBag size={21} />

            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] text-white">
              0
            </span>
          </button>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;