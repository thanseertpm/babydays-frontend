import { Heart, LoaderCircle, ShoppingCartPlus, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Toast from "./Toast";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

export default function ProductCard({
  product,
  isWishlisted = false,
  onToggleWishlist,
  onAddToCart,
  cartLoading = false,
  wishlistLoading = false,
  disabled = false,
}) {
  if (!product) return null;

  const {
    title = "Product",
    image = "",
    price = 0,
    originalPrice = 0,
    discount = 0,
    rating = 0,
    badge = "NEW",
    slug = "",
    categorySlug = "",
    variantLabel = "",
  } = product;

  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, loading: authLoading } = useAuth();

  const [toast, setToast] = useState(null);

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

  const productUrl =
    categorySlug && slug ? `/${categorySlug}/${slug}` : "/products";

  const numericPrice = Number(price) || 0;
  const numericOriginalPrice = Number(originalPrice) || 0;
  const numericRating = Number(rating) || 0;

  const actualDiscount =
    Number(discount) ||
    (numericOriginalPrice > numericPrice
      ? Math.round(
          ((numericOriginalPrice - numericPrice) / numericOriginalPrice) * 100,
        )
      : 0);

  const hasDiscount = numericOriginalPrice > numericPrice;
  const isCartDisabled = disabled || cartLoading;

  const requireAuthentication = (action) => {
    if (authLoading) {
      showToast("Please wait while we verify your account.", "error");
      return false;
    }

    if (!isAuthenticated) {
      navigate("/auth", {
        state: {
          from: {
            pathname: productUrl,
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

  const handleWishlist = async () => {
    if (!requireAuthentication({ type: "wishlist" })) {
      return;
    }

    try {
      await onToggleWishlist?.(product);

      showToast(
        isWishlisted
          ? `${title} removed from wishlist.`
          : `${title} added to wishlist.`,
        "success",
      );
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Unable to update your wishlist.",
        "error",
      );
    }
  };

  const handleAddToCart = async () => {
    if (
      !requireAuthentication({
        type: "add_to_cart",
        variantId: product.variant_id,
        quantity: 1,
      })
    ) {
      return;
    }

    try {
      await onAddToCart?.(product);
      showToast(`${title} added to cart.`, "success");
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Unable to add this item to your cart.",
        "error",
      );
    }
  };

  return (
    <article
      className="
    group w-full min-w-0 overflow-hidden
    rounded-xl border border-[#eae6df]
    bg-white text-[#222]
    shadow-[0_2px_8px_rgba(0,0,0,0.025)]
    transition-all duration-300
    hover:shadow-xl
  "
    >
      {/* Product image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f6f6f5]">
        <Link
          to={productUrl}
          className="absolute inset-0 block"
          aria-label={`View ${title}`}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="
                h-full w-full object-cover
                transition-transform duration-500 ease-out
                group-hover:scale-[1.04]
                motion-reduce:transition-none
              "
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f3f2ef]">
              <span className="font-serif text-2xl tracking-[4px] text-[#9b8a76]">
                AURA
              </span>
            </div>
          )}
        </Link>

        {/* Discount / New badge */}

        {disabled && (
          <span
            className="
      absolute bottom-12 left-1/2 z-[4]
      -translate-x-1/2
      whitespace-nowrap
      rounded-md bg-black/80
      px-4 py-2
      text-[10px] font-bold tracking-[1.5px]
      text-white
      sm:bottom-14 sm:px-5 sm:py-2.5 sm:text-xs
    "
          >
            OUT OF STOCK
          </span>
        )}

        <span
          className="
    absolute left-2 top-2 z-[2]
    inline-flex min-h-6 items-center justify-center
    rounded-full bg-[#ef6b35]
    px-2.5 py-1
    text-[9px] font-bold tracking-wide text-white
    sm:left-3 sm:top-3 sm:min-h-[27px]
    sm:px-3 sm:text-[10px]
  "
        >
          {actualDiscount > 0 ? `${actualDiscount}% OFF` : badge}
        </span>

        {/* Wishlist */}
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={
            isWishlisted
              ? `Remove ${title} from wishlist`
              : `Add ${title} to wishlist`
          }
          aria-pressed={isWishlisted}
          className={`
            absolute right-2 top-2 z-[3]
            grid h-8 w-8 place-items-center
            rounded-full bg-white/90
            shadow-sm backdrop-blur-sm
            transition-all duration-200
            hover:scale-110 hover:bg-white
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-[#876c4b]
            focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            sm:right-3 sm:top-3 sm:h-9 sm:w-9
            ${isWishlisted ? "text-[#e34d5a]" : "text-[#444]"}
          `}
        >
          <Heart
            size={18}
            strokeWidth={1.8}
            fill={isWishlisted ? "currentColor" : "none"}
            className="sm:h-[19px] sm:w-[19px]"
          />
        </button>

        {/* Rating badge */}
        <div
          className="
            absolute bottom-2 left-2 z-[3]
            inline-flex min-h-6 items-center gap-1
            rounded-[5px] bg-white
            px-2 py-1
            text-[11px] font-semibold text-[#252525]
            shadow-[0_2px_8px_rgba(0,0,0,0.10)]
            sm:bottom-3 sm:left-3 sm:min-h-[27px]
            sm:gap-[5px] sm:px-[9px] sm:text-xs
          "
        >
          <span>{numericRating.toFixed(1)}</span>
          <Star
            size={12}
            fill="currentColor"
            className="shrink-0 text-[#e5aa32] sm:h-[13px] sm:w-[13px]"
          />
        </div>
      </div>

      {/* Product details */}
      <div className="px-3 pb-3 pt-3 sm:px-3.5 sm:pb-4">
        {/* Product title */}
        <Link
          to={productUrl}
          className="
            block text-inherit no-underline
            outline-none
            focus-visible:underline
            focus-visible:decoration-[#876c4b]
            focus-visible:underline-offset-2
          "
        >
          <h3
            className="
              mb-2 line-clamp-2 min-h-[38px]
              text-[13px] font-semibold leading-[1.45]
              text-[#242424]
              sm:min-h-[42px] sm:text-[14px]
              lg:text-[15px]
            "
          >
            {title}
          </h3>
          
        </Link>

        {/* Price and cart */}
        <div className="mb-2 flex w-full items-center justify-between gap-2">
          
          <div className="">
            {variantLabel && (
              <p className="mb-0.5 text-[11px] font-medium text-[#876c4b] sm:text-xs">
                {variantLabel}
              </p>
            )}
            <div  className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <span
              className="
                whitespace-nowrap text-[14px] font-bold
                tracking-[-0.2px] text-[#222]
                sm:text-[15px]
              "
            >
              {formatPrice(numericPrice)}
            </span>
            

            {hasDiscount && (
              <span className="whitespace-nowrap text-[11px] font-normal text-[#999] line-through sm:text-xs">
                {formatPrice(numericOriginalPrice)}
              </span>
            )}
            </div>

            
          </div>

          {/* Add to cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isCartDisabled}
            aria-label={`Add ${title} to cart`}
            className="
              relative flex h-9 w-9 shrink-0 items-center justify-center
              rounded-full bg-[#080808] text-white
              transition-all duration-200
              hover:-translate-y-0.5 hover:bg-white hover:border hover:border-black
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[#876c4b]
              focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50
              sm:h-[42px] sm:w-[42px]
              motion-reduce:transform-none
              motion-reduce:transition-none
              text-white hover:text-black
              
            "
          >
            {cartLoading ? (
              <LoaderCircle
                size={19}
                strokeWidth={2}
                className="animate-spin text-white"
              />
            ) : (
              <ShoppingCartPlus size={18} strokeWidth={1.9} />
            )}
          </button>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </article>
  );
}
