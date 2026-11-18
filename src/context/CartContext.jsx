import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api, { refreshCSRFToken } from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();

  const [cart, setCart] = useState(null);
  const [wishlist, setWishlist] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const cartItems = cart?.items ?? [];
  const wishlistItems = wishlist?.items ?? [];

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return null;
    }

    setCartLoading(true);

    try {
      const response = await api.get("/user/cart/");
      const data = response.data.data;

      setCart(data);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlist(null);
      return null;
    }

    setWishlistLoading(true);

    try {
      const response = await api.get("/user/wishlist/");
      const data = response.data.data;

      setWishlist(data);
      return data;
    } finally {
      setWishlistLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCart(null);
      setWishlist(null);
      setCartLoading(false);
      setWishlistLoading(false);
      return;
    }

    refreshCart().catch(() => {});
    refreshWishlist().catch(() => {});
  }, [user, authLoading, refreshCart, refreshWishlist]);

  const addToCart = useCallback(
    async (variantId, quantity = 1) => {
      const response = await api.post("/user/cart/", {
        variant_id: variantId,
        quantity,
      });

      await refreshCart();
      return response.data;
    },
    [refreshCart],
  );

  const updateCartQuantity = useCallback(
    async (itemId, quantity) => {
      const response = await api.patch(`/user/cart/${itemId}/`, { quantity });

      await refreshCart();
      return response.data;
    },
    [refreshCart],
  );

  const removeCartItem = useCallback(
    async (itemId) => {
      const response = await api.delete(`/user/cart/${itemId}/`);

      await refreshCart();
      return response.data;
    },
    [refreshCart],
  );

  const addToWishlist = useCallback(
    async (productId) => {
      const response = await api.post("/user/wishlist/", {
        product_id: productId,
      });

      await refreshWishlist();
      return response.data;
    },
    [refreshWishlist],
  );

  const removeWishlistItem = useCallback(
    async (itemId) => {
      const response = await api.delete(`/user/wishlist/${itemId}/`);

      await refreshWishlist();
      return response.data;
    },
    [refreshWishlist],
  );

  const isWishlisted = useCallback(
    (productId) =>
      wishlistItems.some(
        (item) => Number(item.product_id) === Number(productId),
      ),
    [wishlistItems],
  );

  const toggleWishlist = useCallback(
    async (productId) => {
      const existingItem = wishlistItems.find(
        (item) => Number(item.product_id) === Number(productId),
      );

      if (existingItem) {
        return removeWishlistItem(existingItem.id);
      }

      return addToWishlist(productId);
    },
    [wishlistItems, addToWishlist, removeWishlistItem],
  );

  const cartCount = useMemo(() => cartItems.length, [cartItems]);

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + Number(item.price ?? 0) * Number(item.quantity ?? 0),
        0,
      ),
    [cartItems],
  );

  const value = {
    cart,
    cartItems,
    wishlist,
    wishlistItems,
    cartCount,
    cartTotal,
    cartLoading,
    wishlistLoading,
    refreshCart,
    refreshWishlist,
    addToCart,
    updateCartQuantity,
    removeCartItem,
    addToWishlist,
    removeWishlistItem,
    toggleWishlist,
    isWishlisted,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
