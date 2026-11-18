import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";

// ============================================================
// 1. HELPER FUNCTIONS
// ============================================================

// Format prices in Indian Rupees.
const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));

// Extract product data from the API response.
const getProductPayload = (response) => {
  const payload = response?.data?.data ?? response?.data;
  return payload?.product ?? payload;
};

// Get the media URL from a product image object.
const getMediaUrl = (item) =>
  item?.file || item?.image_url || item?.image || "";

// Get the available stock of a variant.
const getStock = (variant) => Number(variant?.stock ?? 0);

// Check whether a product variant can be purchased.
const isVariantAvailable = (variant) =>
  Boolean(variant?.is_available) && getStock(variant) > 0;

// ============================================================
// 2. PRODUCT DETAIL COMPONENT
// ============================================================

export default function ProductDetailPage() {
  // ----------------------------------------------------------
  // 2.1. ROUTER PARAMETERS AND CONTEXT
  // ----------------------------------------------------------

  const { slug } = useParams();

  const {
    addToCart,
    toggleWishlist,
    isWishlisted,
    cartItems,
    refreshWishlist,
  } = useCart();

  const { isAuthenticated, loading: authLoading } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // ----------------------------------------------------------
  // 2.2. COMPONENT STATES
  // ----------------------------------------------------------

  // Product information.
  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Loading and action states.
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [updatingWishlist, setUpdatingWishlist] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  // UI states.
  const [showZoom, setShowZoom] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // ----------------------------------------------------------
  // 2.3. REFERENCES
  // ----------------------------------------------------------

  // Prevent a pending action from executing multiple times
  // after the user returns from authentication.
  const pendingActionHandled = useRef(false);

  const reviewsContainerRef = useRef(null);

  const scrollReviews = (direction) => {
    if (!reviewsContainerRef.current) return;

    reviewsContainerRef.current.scrollBy({
      left: direction * reviewsContainerRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  // ============================================================
  // 3. COMMON HANDLERS
  // ============================================================

  // Navigate to the cart page.
  const handleGoToCart = () => {
    navigate("/cart");
  };

  // Display toast notifications.
  const showToast = useCallback((message, type = "success") => {
    setToast({
      message,
      type,
      duration: 3000,
    });
  }, []);

  // Close toast notifications.
  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // ============================================================
  // 4. AUTHENTICATION HANDLING
  // ============================================================

  // Check authentication before allowing protected actions.
  // If the user is logged out, redirect to authentication
  // and preserve the requested action for after login.
  const requireAuthentication = (action) => {
    if (authLoading) {
      showToast("Please wait while we verify your account.", "error");
      return false;
    }

    if (!isAuthenticated) {
      navigate("/auth", {
        state: {
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
          resumeAction: action,
        },
      });

      return false;
    }

    return true;
  };

  // ============================================================
  // 5. FETCH PRODUCT DETAILS
  // ============================================================

  // Fetch product information whenever the product slug changes.
  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      setLoading(true);
      setError("");
      setProduct(null);
      setSelectedImage("");
      setSelectedVariantId("");

      try {
        const response = await api.get(
          `/catalog/products/${encodeURIComponent(slug)}/`,
        );

        const productData = getProductPayload(response);

        if (!productData || !productData.id) {
          throw new Error("Product not found.");
        }

        if (cancelled) return;

        setProduct(productData);

        // Identify available product images.
        const media = Array.isArray(productData.files)
          ? productData.files
          : Array.isArray(productData.images)
            ? productData.images
            : [];

        const availableMedia = media.filter(
          (item) => item.is_available !== false && getMediaUrl(item),
        );

        // Select the main image or the first available image.
        const mainMedia =
          availableMedia.find((item) => item.is_main) || availableMedia[0];

        setSelectedImage(
          getMediaUrl(mainMedia) || productData.main_image || "",
        );

        // Select the first available product variant.
        const variants = Array.isArray(productData.variants)
          ? productData.variants
          : [];

        const firstAvailableVariant = variants.find(isVariantAvailable);

        setSelectedVariantId(
          firstAvailableVariant ? String(firstAvailableVariant.id) : "",
        );

        setQuantity(1);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load this product. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ============================================================
  // 6. PRODUCT DATA AND DERIVED VALUES
  // ============================================================

  // Get product variants.
  const variants = product?.variants ?? [];

  // Prepare product media for the image gallery.
  const mediaItems = useMemo(() => {
    if (!product) return [];

    const source = Array.isArray(product.files)
      ? product.files
      : Array.isArray(product.images)
        ? product.images
        : [];

    const filtered = source
      .filter((item) => item.is_available !== false)
      .map((item, index) => ({
        ...item,
        url: getMediaUrl(item),
        key: item.id ?? getMediaUrl(item) ?? index,
      }))
      .filter((item) => item.url);

    if (
      product.main_image &&
      !filtered.some((item) => item.url === product.main_image)
    ) {
      filtered.unshift({
        key: "main-image",
        url: product.main_image,
        is_main: true,
      });
    }

    return filtered;
  }, [product]);

  // ============================================================
  // 7. RESUME PENDING ACTION AFTER AUTHENTICATION
  // ============================================================

  // Complete the action the user originally requested before
  // being redirected to the authentication page.
  useEffect(() => {
    const resumeAction = location.state?.resumeAction;

    if (
      authLoading ||
      !isAuthenticated ||
      !product ||
      !resumeAction ||
      pendingActionHandled.current
    ) {
      return;
    }

    pendingActionHandled.current = true;

    // Clear the saved action so it cannot execute again on refresh.
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    });

    const completeAction = async () => {
      try {
        // Resume wishlist action.
        if (resumeAction.type === "wishlist") {
          const refreshedWishlist = await refreshWishlist();

          const alreadyWishlisted = (refreshedWishlist?.items ?? []).some(
            (item) => Number(item.product_id) === Number(product.id),
          );

          if (alreadyWishlisted) {
            showToast("This product is already in your wishlist.", "info");
            return;
          }

          await toggleWishlist(product.id);

          showToast("Added to your wishlist.", "success");

          return; // Stop here. Wishlist does not require a product variant.
        }

        // Find the previously selected variant.
        const variant = product.variants?.find(
          (item) => String(item.id) === String(resumeAction.variantId),
        );

        const requestedQuantity = Number(resumeAction.quantity || 1);

        // Validate variant availability.
        if (!variant || !isVariantAvailable(variant)) {
          showToast("This product option is no longer available.", "error");
          return;
        }

        if (requestedQuantity < 1 || requestedQuantity > getStock(variant)) {
          showToast(
            `Only ${getStock(variant)} items are currently available.`,
            "error",
          );
          return;
        }

        setSelectedVariantId(String(variant.id));
        setQuantity(requestedQuantity);

        // Resume add-to-cart action.
        if (resumeAction.type === "add_to_cart") {
          await addToCart(variant.id, requestedQuantity);

          showToast("Added to cart.", "success");
        }

        // Resume buy-now action.
        if (resumeAction.type === "buy_now") {
          const response = await api.post("/user/checkout-sessions/", {
            mode: "buy_now",
            variant_id: variant.id,
            quantity: requestedQuantity,
          });

          const session = response.data.data;

          if (!session?.id) {
            throw new Error("Unable to start checkout.");
          }

          navigate(`/checkout?session_id=${encodeURIComponent(session.id)}`);
        }
      } catch (err) {
        showToast(
          err.response?.data?.message ||
            err.response?.data?.detail ||
            err.message ||
            "Unable to complete your requested action.",
          "error",
        );
      }
    };

    completeAction();
  }, [
    authLoading,
    isAuthenticated,
    product,
    location.state,
    location.pathname,
    location.search,
    location.hash,
    navigate,
    addToCart,
    toggleWishlist,
    showToast,
  ]);

  // Reset the pending-action guard when navigating to another product.
  useEffect(() => {
    pendingActionHandled.current = false;
  }, [slug]);

  // ----------------------------------------------------------
  // 7.1. SELECTED VARIANT INFORMATION
  // ----------------------------------------------------------

  const selectedVariant = variants.find(
    (variant) => String(variant.id) === selectedVariantId,
  );

  // Check whether the selected variant already exists in the cart.
  const isVariantInCart = cartItems.some(
    (item) => String(item.variant_id) === String(selectedVariant?.id),
  );

  // Stock and availability.
  const stock = getStock(selectedVariant);
  const isAvailable = isVariantAvailable(selectedVariant);

  // Price information.
  const currentPrice = Number(selectedVariant?.price ?? 0);
  const mrp = Number(selectedVariant?.mrp ?? 0);

  // Calculate discount percentage.
  const discount =
    mrp > currentPrice && mrp > 0
      ? Math.round(((mrp - currentPrice) / mrp) * 100)
      : 0;

  // Rating and review information.
  const rating = Number(product?.rating ?? 0);
  const reviews = product?.reviews ?? [];
  const reviewCount = reviews.length;

  // Group variants according to their type.
  const variantGroups = useMemo(() => {
    const groups = new Map();

    variants.forEach((variant) => {
      const type = variant.type || "Option";

      if (!groups.has(type)) groups.set(type, []);

      groups.get(type).push(variant);
    });

    return Array.from(groups.entries());
  }, [variants]);

  // ============================================================
  // 8. PRODUCT INTERACTION HANDLERS
  // ============================================================

  // ----------------------------------------------------------
  // 8.1. VARIANT SELECTION
  // ----------------------------------------------------------

  const handleVariantSelect = (variant) => {
    setSelectedVariantId(String(variant.id));
    setQuantity(1);
  };

  // ----------------------------------------------------------
  // 8.2. ADD TO CART
  // ----------------------------------------------------------

  const handleAddToCart = async () => {
    if (!selectedVariant || !isAvailable) {
      showToast("Please select an available option.", "error");
      return;
    }

    if (quantity < 1 || quantity > stock) {
      showToast(`Only ${stock} items are currently available.`, "error");
      return;
    }

    if (
      !requireAuthentication({
        type: "add_to_cart",
        variantId: selectedVariant.id,
        quantity,
      })
    ) {
      return;
    }

    setAddingToCart(true);

    try {
      await addToCart(selectedVariant.id, quantity);
      showToast("Added to cart.", "success");
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Unable to add this item to your cart.",
        "error",
      );
    } finally {
      setAddingToCart(false);
    }
  };

  // ----------------------------------------------------------
  // 8.3. WISHLIST
  // ----------------------------------------------------------

  const handleWishlist = async () => {
    if (!product) return;

    if (
      !requireAuthentication({
        type: "wishlist",
      })
    ) {
      return;
    }

    setUpdatingWishlist(true);

    try {
      await toggleWishlist(product.id);

      showToast(
        wishlisted ? "Removed from wishlist." : "Added to wishlist.",
        "success",
      );
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Unable to update your wishlist.",
        "error",
      );
    } finally {
      setUpdatingWishlist(false);
    }
  };

  // ----------------------------------------------------------
  // 8.4. BUY NOW
  // ----------------------------------------------------------

  const handleBuyNow = async () => {
    if (!selectedVariant || !isAvailable) {
      showToast("Please select an available option.", "error");
      return;
    }

    if (quantity < 1 || quantity > stock) {
      showToast(`Only ${stock} items are currently available.`, "error");
      return;
    }

    if (
      !requireAuthentication({
        type: "buy_now",
        variantId: selectedVariant.id,
        quantity,
      })
    ) {
      return;
    }

    setBuyingNow(true);

    try {
      const response = await api.post("/user/checkout-sessions/", {
        mode: "buy_now",
        variant_id: selectedVariant.id,
        quantity,
      });

      const session = response.data.data;

      if (!session?.id) {
        throw new Error("Unable to start checkout.");
      }

      navigate(`/checkout?session_id=${encodeURIComponent(session.id)}`);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          err.message ||
          "Unable to start checkout.",
        "error",
      );
    } finally {
      setBuyingNow(false);
    }
  };

  // ============================================================
  // 9. LOADING AND ERROR STATES
  // ============================================================

  // Display loading UI while fetching product details.
  if (loading) {
    return (
      <main className="product-detail-page">
        <div className="detail-state">
          <span className="detail-loader" />
          <p>Loading product...</p>
        </div>
      </main>
    );
  }

  // Display error UI if the product cannot be loaded.
  if (error || !product) {
    return (
      <main className="product-detail-page">
        <div className="detail-state">
          <p className="detail-error">{error || "Product not found."}</p>
          <Link to="/collections" className="detail-back-link">
            Back to collection
          </Link>
        </div>
      </main>
    );
  }

  // ============================================================
  // 10. FINAL DISPLAY VALUES
  // ============================================================

  const wishlisted = isWishlisted(product.id);

  const selectedMedia = mediaItems.find((item) => item.url === selectedImage);

  // ============================================================
  // 11. PRODUCT DETAIL PAGE UI
  // ============================================================

  return (
    <main className="min-h-screen w-full bg-white px-4 py-5 text-[#171717] sm:px-6 lg:px-10 lg:py-7">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* ----------------------------------------------------
            11.1. BREADCRUMB NAVIGATION
        ---------------------------------------------------- */}

        <nav
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-500"
          aria-label="Breadcrumb"
        >
          <Link to="/" className="transition hover:text-black">
            Home
          </Link>
          <span>/</span>
          <Link
            to={`/categories/${product.category_detail?.slug}`}
            className="transition hover:text-black"
          >
            {product.category_detail?.title || "Collection"}
          </Link>
          <span>/</span>
          <span className="max-w-[300px] truncate text-gray-900">
            {product.title}
          </span>
        </nav>

        {/* ----------------------------------------------------
            11.2. MAIN PRODUCT LAYOUT
            Left: Product gallery
            Right: Product information and purchase actions
        ---------------------------------------------------- */}

        <section className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-10 xl:gap-16">
          {/* ==================================================
              11.3. LEFT SECTION - PRODUCT IMAGE GALLERY
          ================================================== */}

          <div
            className={`grid min-w-0 gap-3 ${
              mediaItems.length > 1
                ? "grid-cols-[64px_minmax(0,1fr)] sm:grid-cols-[76px_minmax(0,1fr)]"
                : "grid-cols-1"
            }`}
          >
            {/* Product thumbnails */}
            {mediaItems.length > 1 && (
              <div className="flex min-w-0 flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
                {mediaItems.map((item, index) => (
                  <button
                    type="button"
                    key={item.key}
                    className={`aspect-[3/4] w-[58px] shrink-0 overflow-hidden rounded-md border bg-gray-100 transition sm:w-[68px] lg:w-full ${
                      selectedImage === item.url
                        ? "border-black"
                        : "border-transparent hover:border-gray-400"
                    }`}
                    onClick={() => setSelectedImage(item.url)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={selectedImage === item.url}
                  >
                    <img
                      src={item.url}
                      alt={`${product.title} view ${index + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main product image */}
            <div className="relative min-h-[400px] overflow-hidden rounded-md bg-[#f4f4f4] sm:min-h-[500px] lg:min-h-[620px]">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.title}
                  className="absolute inset-0 h-full w-full object-contain transition-transform duration-300"
                />
              ) : (
                <div className="flex h-full min-h-[400px] items-center justify-center text-sm text-gray-400">
                  Aura Fashions
                </div>
              )}

              {/* Discount badge */}
              {discount > 0 && (
                <span className="absolute left-4 top-4 rounded-sm bg-black px-3 py-1.5 text-[10px] font-bold tracking-wide text-white">
                  {discount}% OFF
                </span>
              )}

              {/* Image zoom button */}
              <button
                type="button"
                onClick={() => setShowZoom(true)}
                disabled={!selectedImage}
                aria-label="Zoom product image"
                className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-900 transition hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ZoomIn size={19} />
              </button>

              {/* Mobile image counter */}
              {mediaItems.length > 1 && (
                <div className="absolute bottom-4 left-4 rounded bg-black/60 px-3 py-1.5 text-xs text-white lg:hidden">
                  {Math.max(
                    mediaItems.findIndex((item) => item.url === selectedImage) +
                      1,
                    1,
                  )}{" "}
                  / {mediaItems.length}
                </div>
              )}
            </div>
          </div>

          {/* ==================================================
              11.4. RIGHT SECTION - PRODUCT INFORMATION
          ================================================== */}

          <div className="flex min-w-0 flex-col py-1 lg:py-2">
            {/* Brand */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              {product.brand && (
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                  {product.brand}
                </span>
              )}
            </div>

            {/* Category */}
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-gray-500">
              {product.category_detail?.title || "Collection"}
            </p>

            {/* Product title */}
            <h1 className="break-words text-3xl font-bold leading-tight tracking-tight text-[#171717] sm:text-4xl">
              {product.title}
            </h1>

            {/* Product rating and reviews */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div
                className="flex items-center gap-0.5 text-base"
                aria-label={`${rating.toFixed(1)} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={
                      star <= Math.round(rating)
                        ? "text-black"
                        : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                ))}
              </div>

              <span className="text-xs font-semibold text-gray-800">
                {rating.toFixed(1)}
              </span>

              <span className="text-xs text-gray-500">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>

            {/* Product price and discount */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {selectedVariant ? (
                <>
                  <strong className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {formatPrice(currentPrice)}
                  </strong>

                  {mrp > currentPrice && (
                    <>
                      <del className="text-sm text-gray-400">
                        {formatPrice(mrp)}
                      </del>

                      {discount > 0 && (
                        <span className="rounded-sm bg-black px-2 py-1 text-[10px] font-bold text-white">
                          {discount}% OFF
                        </span>
                      )}
                    </>
                  )}
                </>
              ) : (
                <span className="text-sm text-gray-500">Price unavailable</span>
              )}
            </div>

            {/* Product description */}
            {product.description && (
              <p className="mt-5 whitespace-pre-line break-words text-[13px] leading-7 text-gray-600">
                {product.description}
              </p>
            )}

            {/* Section divider */}
            <div className="my-6 h-px w-full bg-gray-200" />

            {/* ==================================================
                11.5. PRODUCT VARIANT SELECTION
            ================================================== */}

            {variantGroups.length > 0 ? (
              <div className="flex flex-col gap-6">
                {variantGroups.map(([type, options]) => (
                  <div key={type} className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                      <span>
                        {type}:{" "}
                        <strong className="font-semibold text-gray-900">
                          {selectedVariant?.type === type
                            ? selectedVariant.value
                            : "Select option"}
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {options.map((variant) => {
                        const available = isVariantAvailable(variant);
                        const active = String(variant.id) === selectedVariantId;

                        return (
                          <button
                            type="button"
                            key={variant.id}
                            className={`relative flex min-h-10 min-w-[43px] items-center justify-center overflow-hidden rounded border px-4 py-2 text-xs font-medium transition ${
                              active
                                ? "border-black bg-black text-white"
                                : available
                                  ? "border-gray-300 bg-white text-gray-800 hover:border-black"
                                  : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                            }`}
                            onClick={() => handleVariantSelect(variant)}
                            disabled={!available}
                            aria-pressed={active}
                            title={
                              available
                                ? `${variant.value} — ${formatPrice(
                                    variant.price,
                                  )}`
                                : `${variant.value} is out of stock`
                            }
                          >
                            {variant.value || `Option ${variant.id}`}

                            {!available && (
                              <span className="pointer-events-none absolute left-1 right-1 top-1/2 h-px -rotate-[25deg] bg-gray-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No options have been configured for this product.
              </p>
            )}

            {/* ==================================================
                11.6. STOCK AVAILABILITY
            ================================================== */}

            {selectedVariant && (
              <p
                className={`mt-4 text-xs font-medium ${
                  isAvailable ? "text-green-700" : "text-red-600"
                }`}
              >
                {isAvailable
                  ? stock <= 5
                    ? `Only ${stock} left in stock`
                    : "In stock and ready to ship"
                  : "Currently unavailable"}
              </p>
            )}

            {/* ==================================================
                11.7. PURCHASE ACTIONS
            ================================================== */}

            <div className="mt-5 grid grid-cols-[minmax(105px,auto)_minmax(0,1fr)_minmax(0,1fr)_52px] items-stretch gap-2 max-[420px]:grid-cols-[minmax(0,1fr)_48px]">
              {/* Quantity selector */}
              <div className="col-span-1 flex min-h-12 items-center justify-between rounded border border-gray-300 bg-white max-[420px]:col-span-2 max-[420px]:w-[125px]">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                  disabled={!isAvailable || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-full min-h-11 w-8 items-center justify-center text-gray-800 transition hover:text-black disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <Minus size={15} />
                </button>

                <input
                  type="number"
                  min="1"
                  max={stock || 1}
                  value={quantity}
                  disabled={!isAvailable}
                  aria-label="Product quantity"
                  onChange={(event) => {
                    const value = Number(event.target.value);

                    if (Number.isInteger(value) && value >= 1) {
                      setQuantity(Math.min(value, stock || 1));
                    }
                  }}
                  className="w-9 min-w-0 border-0 bg-transparent p-0 text-center text-sm font-semibold text-gray-900 outline-none disabled:text-gray-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.min(stock, current + 1))
                  }
                  disabled={!isAvailable || quantity >= stock}
                  aria-label="Increase quantity"
                  className="flex h-full min-h-11 w-8 items-center justify-center text-gray-800 transition hover:text-black disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Add to cart / Go to cart */}
              <button
                type="button"
                onClick={isVariantInCart ? handleGoToCart : handleAddToCart}
                disabled={
                  addingToCart ||
                  (!isVariantInCart &&
                    (!selectedVariant || !isAvailable || quantity > stock))
                }
                className="col-span-1 flex min-h-12 min-w-0 items-center justify-center gap-2 rounded border border-black bg-black px-2 py-3 text-xs font-semibold text-white transition hover:border-black hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300 max-[420px]:col-span-1"
              >
                <ShoppingBag size={18} className="shrink-0" />

                <span className="truncate">
                  {addingToCart
                    ? "Adding..."
                    : isVariantInCart
                      ? "Go to Cart"
                      : !isAvailable
                        ? "Out of stock"
                        : "Add to Cart"}
                </span>
              </button>

              {/* Buy now */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={
                  buyingNow ||
                  addingToCart ||
                  !selectedVariant ||
                  !isAvailable ||
                  quantity > stock
                }
                className="col-span-1 min-h-12 rounded bg-black px-2 py-3 text-xs font-semibold text-white transition hover:bg-white hover:text-black hover:border disabled:cursor-not-allowed disabled:opacity-50 max-[420px]:col-span-1"
              >
                {buyingNow ? "Processing..." : "Buy now"}
              </button>

              {/* Wishlist */}
              <button
                type="button"
                onClick={handleWishlist}
                disabled={updatingWishlist}
                aria-label={
                  wishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
                aria-pressed={wishlisted}
                className={`flex min-h-12 items-center justify-center rounded border border-gray-300 bg-white transition hover:border-gray-500 disabled:cursor-wait disabled:opacity-50 max-[420px]:col-start-2 max-[420px]:row-start-2 ${
                  wishlisted ? "text-rose-600" : "text-gray-800"
                }`}
              >
                <Heart size={21} fill={wishlisted ? "currentColor" : "none"} />
              </button>
            </div>

            {/* ==================================================
                11.8. STORE BENEFITS
            ================================================== */}

            <div className="mt-7 grid grid-cols-3 gap-3 border-t border-gray-200 pt-5 max-[420px]:grid-cols-1">
              <div className="flex min-w-0 justify-center gap-2">
                <Truck size={18} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-sm font-semibold text-gray-800">
                    Free shipping
                  </strong>
                </div>
              </div>

              <div className="flex min-w-0 justify-center gap-2">
                <RotateCcw size={18} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-sm font-semibold text-gray-800">
                    Easy returns
                  </strong>
                </div>
              </div>

              <div className="flex min-w-0 justify-center gap-2">
                <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-sm font-semibold text-gray-800">
                    Secure payment
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* ========================================================
    11.9. PRODUCT REVIEWS CAROUSEL
======================================================== */}

        <section className="mt-14 border-t border-gray-200 pt-9 sm:mt-16 sm:pt-12">
          {/* Reviews heading */}
          <div className="mb-6  items-center justify-between gap-4">
            <div>


              <h2 className="text-xl font-bold tracking-tight text-[#171717] sm:text-2xl text-center">
                Customer Reviews
              </h2>

              <p className="mt-1 text-xs text-gray-500 text-center">
                {reviewCount} {reviewCount === 1 ? "review" : "reviews"} for
                this product
              </p>
            </div>

            {/* Carousel navigation buttons */}
            {reviews.length > 1 && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollReviews(-1)}
                  aria-label="Previous reviews"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 transition hover:border-black hover:bg-black hover:text-white"
                >
                  <ArrowLeft size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => scrollReviews(1)}
                  aria-label="Next reviews"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 transition hover:border-black hover:bg-black hover:text-white"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </div>

          {/* Reviews */}
          {reviews.length > 0 ? (
            <div
              ref={reviewsContainerRef}
              className="
        flex gap-4 overflow-x-auto pb-4
        snap-x snap-mandatory
        scroll-smooth
        [scrollbar-width:none]
        [&::-webkit-scrollbar]:hidden
        touch-pan-x
      "
            >
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="
            flex w-[85%] min-w-[85%] snap-start flex-col
            rounded-lg border border-gray-200 bg-white p-5
            sm:w-[48%] sm:min-w-[48%]
            lg:w-[32%] lg:min-w-[32%]
          "
                >
                  {/* Rating and date */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={
                            star <= Number(review.rating)
                              ? "text-black"
                              : "text-gray-300"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    <span className="text-[10px] text-gray-400">
                      {review.created_at
                        ? new Date(review.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : ""}
                    </span>
                  </div>

                  {/* Review text */}
                  <p className="mb-5 min-h-[65px] flex-1 whitespace-pre-line break-words text-sm leading-6 text-gray-600">
                    {review.review || "No written review."}
                  </p>

                  {/* Customer information */}
                  <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold uppercase text-gray-700">
                      {(review.username || "C").charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {review.username || "Customer"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-400">
                        Verified customer review
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 px-5 py-12 text-center">
              <p className="text-sm font-medium text-gray-700">
                No reviews yet
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Be the first to share your experience with this product.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================
          12. IMAGE ZOOM MODAL
      ======================================================== */}

      {showZoom && selectedImage && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onClick={() => setShowZoom(false)}
        >
          {/* Close modal button */}
          <button
            type="button"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-3xl text-white transition hover:bg-white/10"
            onClick={() => setShowZoom(false)}
            aria-label="Close image preview"
          >
            ×
          </button>

          {/* Zoomed product image */}
          <img
            src={selectedImage}
            alt={product.title}
            className="max-h-[88vh] max-w-[95vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* ========================================================
          13. TOAST NOTIFICATIONS
      ======================================================== */}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </main>
  );
}
