import { createContext, useEffect, useMemo, useState } from "react";

const WishlistContext = createContext(null);
const STORAGE_KEY = "nova-wishlist-v1";

function readSavedItems() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? [...new Set(stored.map(Number).filter(Number.isInteger))] : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(readSavedItems);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Saved items still work for this tab when browser storage is unavailable.
    }
  }, [items]);

  const value = useMemo(() => ({
    items,
    hasItem: (productId) => items.includes(Number(productId)),
    toggleItem: (productId) => {
      const id = Number(productId);
      setItems((current) => current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id]);
    },
    removeItem: (productId) => setItems((current) => current.filter((id) => id !== Number(productId))),
    clearItems: () => setItems([]),
  }), [items]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export default WishlistContext;
