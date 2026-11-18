import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Toast from "../components/Toast";
import { useCart } from "../context/CartContext";
import api, { refreshCSRFToken } from "../services/api";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price ?? 0));

export default function CartPage() {
  const { cartItems, cartLoading, updateCartQuantity, removeCartItem } =
    useCart();

  const navigate = useNavigate();

  const [updatingItems, setUpdatingItems] = useState({});
  const [removingItems, setRemovingItems] = useState({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [showUnavailableModal, setShowUnavailableModal] = useState(false);

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

  // Product helpers
  const getProduct = (item) =>
    item.product_detail ??
    item.product ??
    item.variant_detail?.product_detail ??
    item.variant_detail?.product ??
    item.variant?.product_detail ??
    item.variant?.product ??
    {};

  const getTitle = (item) => {
    const product = getProduct(item);

    return product.title ?? item.product_title ?? item.title ?? "Aura product";
  };

  const getVariant = (item) => item.variant_detail ?? item.variant ?? {};

  const getVariantLabel = (item) => {
    if (item.variant_label) {
      return item.variant_label;
    }

    const variant = getVariant(item);

    const type = variant.variant_type ?? variant.type ?? "";
    const value = variant.variant_value ?? variant.value ?? "";

    return [type, value].filter(Boolean).join(" : ");
  };

  const getUnitMrp = (item) => Number(item.mrp ?? 0);

  const getUnitPrice = (item) => Number(item.price ?? 0);

  const getItemTotal = (item) =>
    Number(item.item_total ?? getUnitPrice(item) * Number(item.quantity ?? 1));

  // Check stock and availability
  const isItemUnavailable = (item) => {
    const stock = Number(item.stock ?? 0);
    const quantity = Number(item.quantity ?? 1);

    return (
      stock <= 0 ||
      quantity > stock ||
      item.is_available === false ||
      item.variant_is_available === false ||
      item.product_is_active === false
    );
  };

  const availableCartItems = cartItems.filter(
    (item) => !isItemUnavailable(item),
  );

  const unavailableCartItems = cartItems.filter(isItemUnavailable);

  const hasUnavailableItems = unavailableCartItems.length > 0;
  const hasAvailableItems = availableCartItems.length > 0;

  // Quantity update
  const handleQuantityChange = async (item, nextQuantity) => {
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return;
    }

    setUpdatingItems((current) => ({
      ...current,
      [item.id]: true,
    }));

    try {
      await updateCartQuantity(item.id, nextQuantity);

      showToast("Cart quantity updated successfully.", "success");
    } catch (err) {
      showToast(
        err.response?.data?.message ??
          err.response?.data?.detail ??
          "Unable to update the quantity. Please try again.",
        "error",
      );
    } finally {
      setUpdatingItems((current) => ({
        ...current,
        [item.id]: false,
      }));
    }
  };

  // Remove cart item
  const handleRemove = async (itemId) => {
    setRemovingItems((current) => ({
      ...current,
      [itemId]: true,
    }));

    try {
      await removeCartItem(itemId);

      showToast("Removed from cart successfully.", "success");
    } catch (err) {
      showToast(
        err.response?.data?.message ??
          err.response?.data?.detail ??
          "Unable to remove this item. Please try again.",
        "error",
      );
    } finally {
      setRemovingItems((current) => ({
        ...current,
        [itemId]: false,
      }));
    }
  };

  // Checkout
  const handleCheckout = async () => {
    if (!cartItems.length) {
      return;
    }

    if (hasUnavailableItems) {
      setShowUnavailableModal(true);
      return;
    }

    if (!hasAvailableItems) {
      showToast("There are no available products to checkout.", "error");
      return;
    }

    setCheckoutLoading(true);

    try {
      const response = await api.post("/user/checkout-sessions/", {
        mode: "cart",
      });

      const session = response.data.data;

      if (!session?.id) {
        throw new Error("Unable to start checkout.");
      }

      navigate(`/checkout?session_id=${encodeURIComponent(session.id)}`);
    } catch (err) {
      showToast(
        err.response?.data?.message ??
          err.response?.data?.detail ??
          err.message ??
          "Unable to start checkout.",
        "error",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Loading state
  if (cartLoading && cartItems.length === 0) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-16 text-[#24211f] sm:px-8">
        <p className="text-center text-sm text-[#77716c]">
          Loading your cart...
        </p>

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

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-white px-4 py-12 text-center text-[#24211f]">
        <ShoppingCart
          size={48}
          strokeWidth={1.3}
          className="mb-6 text-[#8b7564]"
        />

        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Your Cart is empty
        </h1>

        <p className="mt-3 mb-7 text-sm text-[#77716c]">
          Discover something beautiful from Aura Fashions.
        </p>

        <Link
          to="/collections"
          className="flex min-h-12 min-w-48 items-center justify-center bg-[#282421] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#594536]"
        >
          Continue Shopping
        </Link>

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

  const subtotal = availableCartItems.reduce(
    (total, item) => total + getItemTotal(item),
    0,
  );

  return (
    <main className="min-h-[70vh] bg-white px-4 py-8 text-[#24211f] sm:px-8 lg:px-[42px]">
      <div className="">
        {/* Heading */}
        <div className="mb-6 flex flex-col gap-4 border-b border-[#e9e5e1] pb-6 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl  title-font">
              Shopping Cart
            </h1>

            <p className="mt-2 text-sm text-[#77716c]">
              {cartItems.length} product
              {cartItems.length !== 1 ? "s" : ""} in your cart
            </p>
          </div>
        </div>

        {/* Out of stock notice */}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          {/* Cart items */}
          <section className="min-w-0" aria-label="Cart items">
            {cartItems.map((item) => {
              const product = getProduct(item);
              const title = getTitle(item);

              const categorySlug = item.category_slug;
              const productSlug = item.product_slug;

              const productPath =
                categorySlug && productSlug
                  ? `/${categorySlug}/${productSlug}`
                  : "/products";

              const image = item.main_image ?? "";
              const variantLabel = getVariantLabel(item);
              const quantity = Number(item.quantity ?? 1);

              const isUpdating = Boolean(updatingItems[item.id]);
              const isRemoving = Boolean(removingItems[item.id]);
              const isUnavailable = isItemUnavailable(item);

              return (
                <article
                  key={item.id}
                  className="grid grid-cols-[95px_minmax(0,1fr)] items-start gap-4 border-b border-[#e9e5e1] py-5 first:pt-0 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-5 sm:py-6 lg:grid-cols-[135px_minmax(0,1fr)_auto]"
                >
                  {/* Product image */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f6f3f0]">
                    <Link
                      to={productPath}
                      aria-label={`View ${title}`}
                      className="block h-full w-full"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={title}
                          className={`h-full w-full object-cover ${
                            isUnavailable ? "opacity-50" : ""
                          }`}
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-center text-xs text-[#9a8878]">
                          Aura Fashions
                        </div>
                      )}
                    </Link>

                    {/* Out of stock badge */}
                    {isUnavailable && (
                      <div className="absolute inset-x-0 bottom-0 bg-red-600/95 px-2 py-2 text-center text-[10px] font-bold tracking-wider text-white sm:text-xs">
                        OUT OF STOCK
                      </div>
                    )}
                  </div>

                  {/* Product details */}
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium leading-relaxed sm:text-base">
                      {title}
                    </h2>

                    {product.brand && (
                      <p className="mt-1 text-xs text-[#77716c]">
                        {product.brand}
                      </p>
                    )}

                    {variantLabel && (
                      <p className="mt-1 text-xs text-[#77716c]">
                        {variantLabel}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold sm:text-base">
                        {formatPrice(getUnitPrice(item))}
                      </p>

                      <p className="text-xs font-medium text-gray-400 line-through sm:text-sm">
                        {formatPrice(getUnitMrp(item))}
                      </p>
                    </div>

                    {/* Availability text */}
                    {isUnavailable && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        This product is currently unavailable.
                      </p>
                    )}

                    {/* Quantity and remove actions */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-5">
                      {!isUnavailable && (
                        <div className="inline-flex h-9 items-center justify-between border border-[#ded8d2]">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${title}`}
                            disabled={isUpdating || isRemoving || quantity <= 1}
                            onClick={() =>
                              handleQuantityChange(item, quantity - 1)
                            }
                            className="grid h-8 w-8 place-items-center text-[#282421] transition hover:bg-[#f6f3f0] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>

                          <span
                            aria-live="polite"
                            className="min-w-7 text-center text-xs"
                          >
                            {quantity}
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase quantity of ${title}`}
                            disabled={isUpdating || isRemoving || quantity >= Number(item.stock ?? 0)}
                            onClick={() =>
                              handleQuantityChange(item, quantity + 1)
                            }
                            className="grid h-8 w-8 place-items-center text-[#282421] transition hover:bg-[#f6f3f0] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isRemoving || isUpdating}
                        onClick={() => handleRemove(item.id)}
                        className="inline-flex items-center gap-1.5 py-1 text-xs text-[#76675d] transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                        {isRemoving ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>

                  {/* Item total */}
                  {!isUnavailable && (
                    <div className="col-start-2 row-start-2 text-sm font-semibold sm:col-start-3 sm:row-start-1 sm:pt-1">
                      {isUpdating
                        ? "Updating..."
                        : formatPrice(getItemTotal(item))}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          {/* Order summary */}
          <aside className="border border-[#e9e5e1] bg-[#fcfbfa] p-5 sm:p-6 lg:sticky lg:top-6">
            <h2 className="mb-6 text-xl font-medium">Order Summary</h2>

            <div className="my-4 flex items-start justify-between gap-4 text-sm">
              <span>
                Subtotal 
              </span>

              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>


            <div className="my-4 flex items-start justify-between gap-4 text-sm">
              <span>Shipping</span>
              <span className="max-w-[150px] text-right text-[#77716c]">
                Calculated at checkout
              </span>
            </div>

            <div className="my-5 h-px bg-[#e4ded8]" />

            <div className="flex items-center justify-between gap-4 text-base">
              <strong>Total</strong>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading || !cartItems.length}
              className="mt-7 flex min-h-12 w-full items-center justify-center bg-[#282421] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#594536] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutLoading
                ? "Preparing checkout..."
                : "Proceed to checkout"}
            </button>

            <Link
              to="/collections"
              className="mt-4 block text-center text-xs text-[#5f4a3b] underline underline-offset-4 transition hover:text-black"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
      {/* Unavailable products popup */}
      {showUnavailableModal && hasUnavailableItems && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => setShowUnavailableModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unavailable-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="unavailable-title"
                  className="text-xl font-semibold text-[#282421]"
                >
                  Unavailable products
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-[#77716c]">
                  Some products in your cart are out of stock or have
                  insufficient stock. Remove them to continue checkout.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUnavailableModal(false)}
                aria-label="Close popup"
                className="text-[#77716c] transition hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 divide-y divide-[#e9e5e1]">
              {unavailableCartItems.map((item) => {
                const stock = Number(item.stock ?? 0);
                const quantity = Number(item.quantity ?? 1);
                const isRemoving = Boolean(removingItems[item.id]);

                const reason =
                  stock <= 0
                    ? "Currently out of stock"
                    : quantity > stock
                      ? `Only ${stock} available, but ${quantity} are in your cart`
                      : "This product is currently unavailable";

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-4 first:pt-0"
                  >
                    <div className="h-20 w-16 shrink-0 overflow-hidden bg-[#f6f3f0]">
                      {item.main_image ? (
                        <img
                          src={item.main_image}
                          alt={item.product_title ?? "Product"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-[10px] text-[#9a8878]">
                          Aura
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#282421]">
                        {item.product_title ?? "Aura product"}
                      </p>

                      {item.variant_label && (
                        <p className="mt-1 text-xs text-[#77716c]">
                          {item.variant_label}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-red-600">{reason}</p>
                    </div>

                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => handleRemove(item.id)}
                      className="shrink-0 text-xs font-semibold text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </button>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Toast */}
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
