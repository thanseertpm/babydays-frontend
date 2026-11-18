import { Heart, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price ?? 0));

export default function Wishlist() {
  const { wishlistItems = [], wishlistLoading } = useWishlist();
  const { removeWishlistItem, addToCart } = useCart();

  const [removingItems, setRemovingItems] = useState({});
  const [addingItems, setAddingItems] = useState({});
  const [messages, setMessages] = useState({});

  const handleRemove = async (item) => {
    setMessages((current) => ({
      ...current,
      [item.id]: "",
    }));

    setRemovingItems((current) => ({
      ...current,
      [item.id]: true,
    }));

    try {
      await removeWishlistItem(item.id);
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [item.id]:
          error.response?.data?.message ??
          error.response?.data?.detail ??
          "Unable to remove this product. Please try again.",
      }));
    } finally {
      setRemovingItems((current) => ({
        ...current,
        [item.id]: false,
      }));
    }
  };

  const handleAddToCart = async (item) => {
    setMessages((current) => ({
      ...current,
      [item.id]: "",
    }));

    if (!item.variant_id) {
      setMessages((current) => ({
        ...current,
        [item.id]: "No product variant is available.",
      }));
      return;
    }

    if (Number(item.stock ?? 0) <= 0) {
      setMessages((current) => ({
        ...current,
        [item.id]: "This product is currently out of stock.",
      }));
      return;
    }

    setAddingItems((current) => ({
      ...current,
      [item.id]: true,
    }));

    try {
      // Step 1: Add product to cart.
      await addToCart(item.variant_id, 1);

      // Step 2: Remove from wishlist after cart succeeds.
      await removeWishlistItem(item.id);

      setMessages((current) => ({
        ...current,
        [item.id]: "Added to cart and removed from wishlist.",
      }));
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [item.id]:
          error.response?.data?.message ??
          error.response?.data?.detail ??
          "Unable to complete this action. Please try again.",
      }));
    } finally {
      setAddingItems((current) => ({
        ...current,
        [item.id]: false,
      }));
    }
  };

  // Loading state
  if (wishlistLoading && wishlistItems.length === 0) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-16 text-[#282421] sm:px-6 lg:px-10">
        <p className="py-10 text-center text-sm text-[#77716c]">
          Loading your wishlist...
        </p>
      </main>
    );
  }

  // Empty wishlist
  if (wishlistItems.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-white px-4 py-10 text-[#282421]">
        <div className="flex min-h-[55vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
          <Heart size={48} strokeWidth={1.3} className="mb-6 text-[#8b7564]" />

          <h1 className="text-[clamp(25px,4vw,34px)] font-medium">
            Your wishlist is empty
          </h1>

          <p className="mt-3 mb-7 max-w-[430px] text-sm leading-8 text-[#77716c]">
            Save your favourite pieces from Aura Fashions and find them here
            whenever you return.
          </p>

          <Link
            to="/collections"
            className="inline-flex min-h-12 min-w-[190px] items-center justify-center bg-[#282421] px-5 py-3 text-[13px] text-white transition-colors duration-200 hover:bg-[#594536] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8b7564]"
          >
            Explore Collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-8 text-[#24211f] sm:px-8 lg:px-[42px]">
      <div className="w-full">
        {/* Heading */}
        <header className="mb-7 flex flex-col items-start justify-between gap-4 border-b border-[#e9e5e1] pb-5 sm:mb-9 sm:flex-row sm:items-end sm:gap-6 sm:pb-6">
          <div>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl  title-font">
              Wishlist
            </h1>

            <p className="mt-2 text-sm text-[#77716c]">
              {wishlistItems.length} saved product
              {wishlistItems.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Link
            to="/collections"
            className="shrink-0 text-[13px] text-[#5f4a3b] underline underline-offset-4 transition-colors hover:text-[#282421] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8b7564]"
          >
            Continue Shopping
          </Link>
        </header>

        {/* Wishlist Products */}
        <section
          className="grid grid-cols-2 items-stretch gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 xl:grid-cols-5 2xl:grid-cols-6"
          aria-label="Wishlist products"
        >
          {wishlistItems.map((item) => {
            const title = item.product_title ?? "Aura product";

            const categorySlug = item.category_slug;
            const productSlug = item.product_slug;

            const productPath =
              categorySlug && productSlug
                ? `/${categorySlug}/${productSlug}`
                : "/products";

            const image = item.main_image;
            const price = item.price;
            const stock = Number(item.stock ?? 0);
            const inStock = stock > 0;
            const hasVariant = Boolean(item.variant_id);
            const variantLabel = item.variant_label ?? "";

            const isRemoving = Boolean(removingItems[item.id]);
            const isAdding = Boolean(addingItems[item.id]);

            return (
              <article
                className="flex h-full min-w-0 flex-col bg-gray-50"
                key={item.id}
              >
                {/* Product Image */}
                <div className="group relative aspect-[1/1] w-full overflow-hidden bg-[#f6f3f0]">
                  <Link
                    to={productPath}
                    aria-label={`View ${title}`}
                    className="block h-full w-full"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        loading="lazy"
                        className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center p-3 text-center text-[13px] text-[#9a8878]">
                        Aura Fashions
                      </div>
                    )}
                  </Link>

                  {/* Remove Wishlist Button */}
                  <button
                    type="button"
                    className="absolute top-2 right-2 z-10 grid h-[34px] w-[34px] place-items-center rounded-full bg-white text-[#7d5149] shadow-[0_2px_10px_rgb(0_0_0/7%)] transition-all duration-200 hover:scale-105 hover:bg-[#7d5149] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8b7564] sm:top-3 sm:right-3 sm:h-[38px] sm:w-[38px]"
                    aria-label={`Remove ${title} from wishlist`}
                    title="Remove from wishlist"
                    disabled={isRemoving}
                    onClick={() => handleRemove(item)}
                  >
                    <Heart size={19} fill="currentColor" />
                  </button>

                  {/* Out of Stock Badge */}
                  {!inStock && (
                    <span className="absolute bottom-2 left-2 z-[1] bg-white/95 px-2 py-1.5 text-[10px] font-medium text-[#7b302d] sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-2 sm:text-[11px]">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Product Information */}

                <div className="flex min-w-0 flex-1 flex-col px-1 pt-3 sm:px-1.5 sm:pt-4">
                  {/* Product Title */}
                  <h2 className="line-clamp-2 min-h-[42px] text-[13px] leading-[1.6] font-semibold tracking-[-0.2px] text-[#282421] [overflow-wrap:anywhere] sm:text-[15px]">
                    {title}
                  </h2>

                  {/* Variant */}
                  <div className="flex justify-between">
                    {variantLabel && (
                      <p className="mt-1.5 w-fit max-w-full rounded-md bg-[#f5f2ef] px-2 py-1 text-[10px] font-medium text-[#74685e] [overflow-wrap:anywhere] sm:text-xs">
                        {variantLabel}
                      </p>
                    )}
                    {item.mrp != null &&
                      price != null &&
                      Number(item.mrp) > Number(price) && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center rounded-md bg-[#edf5ed] px-2 py-1 text-[10px] font-semibold tracking-wide text-[#39734a] sm:text-[11px]">
                            {Math.round(
                              ((Number(item.mrp) - Number(price)) /
                                Number(item.mrp)) *
                                100,
                            )}
                            % OFF
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Price */}
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[15px] font-bold tracking-[-0.3px] text-[#282421] sm:text-[17px]">
                      {price != null ? formatPrice(price) : "Price unavailable"}
                    </span>

                    {item.mrp != null &&
                      price != null &&
                      Number(item.mrp) > Number(price) && (
                        <span className="text-[11px] text-[#99918a] line-through sm:text-xs">
                          {formatPrice(item.mrp)}
                        </span>
                      )}
                  </div>

                  {/* Discount */}

                  {/* Feedback */}
                  {messages[item.id] && (
                    <p
                      className="mt-2 rounded-md border border-[#e8ded3] bg-[#faf7f3] px-2.5 py-2 text-[11px] leading-relaxed text-[#6b5847] sm:text-xs"
                      role="status"
                    >
                      {messages[item.id]}
                    </p>
                  )}

                  {/* Add to Cart */}
                  {/* Add to Cart */}
                  <button
                    type="button"
                    className={`mt-4 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md px-2.5 py-2.5 text-[11px] font-semibold tracking-wide text-white transition-all duration-200 sm:min-h-[45px] sm:text-xs ${
                      !inStock || !hasVariant
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-[#282421] shadow-sm hover:bg-[#594536] hover:shadow-md active:scale-[0.98]"
                    } disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#8b7564]`}
                    disabled={isAdding || isRemoving || !inStock || !hasVariant}
                    onClick={() => handleAddToCart(item)}
                  >
                    <ShoppingCart size={16} className="shrink-0" />

                    <span className="truncate">
                      {isAdding
                        ? "Adding to Cart..."
                        : !inStock
                          ? "Out of Stock"
                          : !hasVariant
                            ? "Variant Unavailable"
                            : "Add to Cart"}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
