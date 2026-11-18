import {
  createContext,
  useContext,
  useMemo,
} from "react";
import { useCart } from "./CartContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const {
    wishlist,
    wishlistItems,
    wishlistLoading,
    refreshWishlist,
    addToWishlist,
    removeWishlistItem,
    toggleWishlist,
    isWishlisted,
  } = useCart();

  const value = useMemo(
    () => ({
      wishlist,
      wishlistItems,
      wishlistLoading,
      refreshWishlist,
      addToWishlist,
      removeWishlistItem,
      toggleWishlist,
      isWishlisted,
    }),
    [
      wishlist,
      wishlistItems,
      wishlistLoading,
      refreshWishlist,
      addToWishlist,
      removeWishlistItem,
      toggleWishlist,
      isWishlisted,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider"
    );
  }

  return context;
}