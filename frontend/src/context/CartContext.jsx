import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import api, { getApiError } from "../services/api";

const CartContext = createContext(null);
const STORAGE_KEY = "nova-guest-cart-v1";

function readGuestCart() {
  try {
    const items = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(items)) return [];
    return items.filter((item) => Number.isInteger(Number(item.id)) && Number(item.quantity) > 0).map((item) => ({
      ...item,
      id: Number(item.id),
      size: item.size || "M",
      pricePaise: Number(item.pricePaise ?? Number(item.price || 0) * 100),
      originalPricePaise: Number(item.originalPricePaise ?? Number(item.originalPrice || 0) * 100),
      stock: Number(item.stock ?? 50),
      quantity: Math.min(50, Number(item.quantity)),
    }));
  } catch {
    return [];
  }
}

function saveGuestCart(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The cart still works for this tab if browser storage is unavailable.
  }
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState(readGuestCart);
  const [loading, setLoading] = useState(true);
  const [cartError, setCartError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const itemsRef = useRef(cartItems);
  const lastUserId = useRef(null);
  const mutationQueue = useRef(Promise.resolve());

  const setItems = useCallback((items) => {
    itemsRef.current = items;
    setCartItems(items);
  }, []);

  const syncGuestCart = useCallback(async (guestItems = itemsRef.current) => {
    setLoading(true);
    setCartError("");
    try {
      const { data } = await api.post("cart/merge", {
        items: guestItems.map((item) => ({ productId: item.id, size: item.size || "M", quantity: item.quantity })),
      });
      setItems(data.items);
      setWarnings(data.warnings || []);
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ }
      return data.items;
    } catch (error) {
      setCartError(getApiError(error, "Your cart couldn't sync. Please try again."));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setItems]);

  useEffect(() => {
    if (authLoading) return undefined;
    if (user) {
      if (lastUserId.current === user.id) return undefined;
      lastUserId.current = user.id;
      void syncGuestCart(itemsRef.current).catch(() => {});
    } else if (lastUserId.current !== null) {
      lastUserId.current = null;
      setItems([]);
      setWarnings([]);
      setCartError("");
      setLoading(false);
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ }
    } else {
      setItems(readGuestCart());
      setLoading(false);
    }
    return undefined;
  }, [user, authLoading, setItems, syncGuestCart]);

  useEffect(() => {
    if (!authLoading && !user) saveGuestCart(cartItems);
  }, [cartItems, user, authLoading]);

  const queueAccountChange = useCallback((request) => {
    const pending = mutationQueue.current.catch(() => {}).then(async () => {
      const response = await request();
      const data = response?.data || { items: [] };
      setItems(data.items || []);
      setWarnings(data.warnings || []);
      setCartError("");
      return data;
    }).catch((error) => {
      setCartError(getApiError(error, "Your cart couldn't be updated. Please try again."));
      throw error;
    });
    mutationQueue.current = pending;
    return pending;
  }, [setItems]);

  const addToCart = useCallback((product, size = "M") => {
    setCartError("");
    const sizeStock = Number(product.sizes?.find((variant) => variant.size === size)?.stock ?? product.stock ?? 50);
    if (user) {
      return queueAccountChange(() => api.post("cart/items", { productId: product.id, size, quantity: 1 }));
    }
    const current = itemsRef.current;
    const existing = current.find((item) => item.id === product.id && (item.size || "M") === size);
    const stock = sizeStock;
    if (stock <= 0) {
      setCartError(`${product.name} in size ${size} is currently sold out.`);
      return Promise.resolve(false);
    }
    if (existing && existing.quantity >= stock) {
      setCartError(`Only ${stock} size ${size} of ${product.name} are available.`);
      return Promise.resolve(false);
    }
    const next = existing
      ? current.map((item) => item.id === product.id && (item.size || "M") === size ? { ...item, quantity: item.quantity + 1 } : item)
      : [...current, { ...product, size, stock, quantity: 1 }];
    setItems(next);
    return Promise.resolve(true);
  }, [user, queueAccountChange, setItems]);

  const removeFromCart = useCallback((productId, size = "M") => {
    if (user) {
      return queueAccountChange(() => api.delete(`cart/items/${productId}`, { params: { size } }));
    }
    setItems(itemsRef.current.filter((item) => item.id !== Number(productId) || (item.size || "M") !== size));
    return Promise.resolve();
  }, [user, queueAccountChange, setItems]);

  const setQuantity = useCallback((productId, quantity, size = "M") => {
    const item = itemsRef.current.find((entry) => entry.id === Number(productId) && (entry.size || "M") === size);
    if (!item) return Promise.resolve();
    const nextQuantity = Math.max(0, Math.min(Number(item.stock || 0), Number(quantity)));
    if (nextQuantity === 0) return removeFromCart(productId, size);
    if (user) {
      return queueAccountChange(() => api.put(`cart/items/${productId}`, { quantity: nextQuantity }, { params: { size } }));
    }
    setItems(itemsRef.current.map((entry) => entry.id === Number(productId) && (entry.size || "M") === size ? { ...entry, quantity: nextQuantity } : entry));
    return Promise.resolve();
  }, [user, queueAccountChange, setItems, removeFromCart]);

  const increaseQuantity = useCallback((productId, size = "M") => {
    const item = itemsRef.current.find((entry) => entry.id === Number(productId) && (entry.size || "M") === size);
    if (!item || item.quantity >= item.stock) {
      if (item) setCartError(`Only ${item.stock} of ${item.name} are available.`);
      return Promise.resolve();
    }
    return setQuantity(productId, item.quantity + 1, size);
  }, [setQuantity]);

  const decreaseQuantity = useCallback((productId, size = "M") => {
    const item = itemsRef.current.find((entry) => entry.id === Number(productId) && (entry.size || "M") === size);
    if (!item) return Promise.resolve();
    return setQuantity(productId, item.quantity - 1, size);
  }, [setQuantity]);

  const clearCart = useCallback(async () => {
    setCartError("");
    if (user) {
      await queueAccountChange(() => api.delete("cart"));
      setWarnings([]);
      return;
    }
    setItems([]);
    setWarnings([]);
  }, [user, queueAccountChange, setItems]);

  const refreshCart = useCallback(async () => {
    if (!user) return itemsRef.current;
    setLoading(true);
    try {
      const { data } = await api.get("cart");
      setItems(data.items);
      setWarnings(data.warnings || []);
      setCartError("");
      return data.items;
    } catch (error) {
      setCartError(getApiError(error, "Your cart couldn't load. Please try again."));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, setItems]);

  const subtotalPaise = cartItems.reduce((total, item) => total + item.pricePaise * item.quantity, 0);
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const value = useMemo(() => ({
    cartItems,
    loading,
    cartError,
    warnings,
    subtotalPaise,
    totalQuantity,
    setCartItems: setItems,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    refreshCart,
    syncGuestCart,
  }), [cartItems, loading, cartError, warnings, subtotalPaise, totalQuantity, setItems, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, refreshCart, syncGuestCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default CartContext;
