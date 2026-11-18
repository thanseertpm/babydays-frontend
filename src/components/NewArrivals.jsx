import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Toast from "../components/Toast";
import { useCart } from "../context/CartContext";
import api, { refreshCSRFToken } from "../services/api";
import ProductCard from "./ProductCard";

const getPayload = (response) => {
  const payload = response?.data?.data ?? response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

const isImageFile = (url = "") =>
  /\.(jpe?g|png|gif|webp|bmp|avif|tiff?)(?:[?#].*)?$/i.test(url);

const getProductImage = (product) => {
  if (product.main_image && isImageFile(product.main_image)) {
    return product.main_image;
  }

  const files = product.files ?? product.images ?? [];

  const availableImages = files.filter((item) => {
    const url = item.file ?? item.file_url ?? item.image_url ?? "";

    return url && item.is_available !== false && isImageFile(url);
  });

  const mainImage = availableImages.find((item) => item.is_main);
  const selectedImage = mainImage ?? availableImages[0];

  return (
    selectedImage?.file ??
    selectedImage?.file_url ??
    selectedImage?.image_url ??
    ""
  );
};

const getAvailableVariant = (product) =>
  (product.variants ?? []).find(
    (variant) =>
      variant.is_available === true &&
      Number(variant.stock) > 0 &&
      Number.isFinite(Number(variant.price)),
  );

const getReviewCount = (product) =>
  Number(product.review_count ?? product.reviews?.length ?? 0);

export default function NewArrivals() {
  const { addToCart, toggleWishlist, isWishlisted } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [busyCartId, setBusyCartId] = useState(null);
  const [busyWishlistId, setBusyWishlistId] = useState(null);

  const [toast, setToast] = useState(null);

  // Toast helpers
  const showToast = useCallback((message, type = "success") => {
    setToast({
      message,
      type,
      duration: 3000,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Fetch new arrivals
  useEffect(() => {
    let cancelled = false;

    const fetchNewArrivals = async () => {
      setLoading(true);
      setLoadFailed(false);

      try {
        const response = await api.get("/catalog/products/", {
          params: { new_arrivals: "true" },
        });

        if (!cancelled) {
          const availableProducts = getPayload(response).filter((product) =>
            Boolean(getAvailableVariant(product)),
          );

          setProducts(availableProducts.slice(0, 6));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadFailed(true);

          showToast(
            err.response?.data?.message ??
              err.response?.data?.detail ??
              "Unable to load new arrivals. Please try again.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchNewArrivals();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Add product to cart
  const handleAddToCart = async (product) => {
    const variant = getAvailableVariant(product);

    if (!variant) {
      return;
    }

    setBusyCartId(product.id);

    try {
      await addToCart(variant.id, 1);
    } catch (err) {
      showToast(
        err.response?.status === 401
          ? "Please sign in to add items to your cart."
          : (err.response?.data?.message ??
              err.response?.data?.detail ??
              "Unable to add this product to your cart."),
        "error",
      );
    } finally {
      setBusyCartId(null);
    }
  };

  // Add or remove product from wishlist
  const handleWishlist = async (product) => {
    const wasWishlisted = isWishlisted(product.id);

    setBusyWishlistId(product.id);

    try {
      await toggleWishlist(product.id);
    } catch (err) {
      showToast(
        err.response?.status === 401
          ? "Please sign in to manage your wishlist."
          : (err.response?.data?.message ??
              err.response?.data?.detail ??
              "Unable to update your wishlist."),
        "error",
      );
    } finally {
      setBusyWishlistId(null);
    }
  };

  return (
    <>
      <section
        id="new-arrivals"
        aria-labelledby="new-arrivals-title"
        className="w-full bg-white px-4 py-7 text-[#242424] sm:px-11 sm:py-8 lg:py-9 "
      >
        {/* Section heading */}
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
          <div className="min-w-0">
            <h2
              id="new-arrivals-title"
              className="text-[26px] font-medium leading-tight tracking-[-0.7px] text-[#242424] title-font"
            >
              New Arrivals
            </h2>
          </div>

          <Link
            to="/collections"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] text-[#292929] no-underline transition-colors hover:text-[#a4865a] sm:gap-2 sm:text-xs"
          >
            View All Collections
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Loading state */}
        {loading ? (
          <div
            className="flex min-h-40 items-center justify-center text-sm text-[#777]"
            role="status"
          >
            Loading new arrivals...
          </div>
        ) : loadFailed ? (
          <div className="flex min-h-40 items-center justify-center text-center text-sm text-[#777]">
            Unable to load new arrivals. Please try again later.
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-center text-sm text-[#777]">
            No new arrivals available right now.
          </div>
        ) : (
          /* Responsive product grid */
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:gap-x-5 lg:grid-cols-4 lg:gap-x-6 xl:grid-cols-6 xl:gap-x-5">
            {products.map((product) => {
              const variant = getAvailableVariant(product);

              const price = Number(variant?.price ?? 0);
              const mrp = Number(variant?.mrp ?? 0);

              const discount =
                mrp > price && mrp > 0
                  ? Math.round(((mrp - price) / mrp) * 100)
                  : 0;

              const cardProduct = {
                id: product.id,
                title: product.title,
                image: getProductImage(product),
                price,
                originalPrice: mrp,
                discount,
                rating: Number(product.rating ?? 0),
                reviewCount: getReviewCount(product),
                slug: product.slug,
                categorySlug: product.category_detail?.slug,
                badge: "NEW",
                variant_id: variant?.id,
                sourceProduct: product,
              };

              return (
                <div key={product.id} className="min-w-0">
                  <ProductCard
                    product={cardProduct}
                    isWishlisted={isWishlisted(product.id)}
                    onToggleWishlist={() => handleWishlist(product)}
                    onAddToCart={() => handleAddToCart(product)}
                    cartLoading={busyCartId === product.id}
                    wishlistLoading={busyWishlistId === product.id}
                    disabled={!variant}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </>
  );
}
