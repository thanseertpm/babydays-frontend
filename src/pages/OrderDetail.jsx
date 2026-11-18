import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Download,
  LoaderCircle,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Toast from "../components/Toast";
import api from "../services/api";

/* =========================================
   HELPERS
========================================= */

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price || 0));

const formatDate = (date) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (status = "") =>
  status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getStatusStyle = (status) => {
  const styles = {
    placed: "bg-blue-50 text-blue-700 border-blue-200",
    shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    return_requested: "bg-amber-50 text-amber-700 border-amber-200",
    returned: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return styles[status] || "bg-gray-50 text-gray-700 border-gray-200";
};

const getPaymentStatusStyle = (status) => {
  if (status === "paid") {
    return "bg-green-50 text-green-700";
  }

  if (status === "failed") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
};

const ORDER_TRACKING_FLOWS = {
  normal: [
    { status: "placed", label: "Order Placed", icon: Package },
    { status: "shipped", label: "Shipped", icon: Truck },
    { status: "delivered", label: "Delivered", icon: CheckCircle2 },
  ],

  cancelled: [
    { status: "placed", label: "Order Placed", icon: Package },
    { status: "cancelled", label: "Cancelled", icon: XCircle },
  ],

  returned: [
    { status: "placed", label: "Order Placed", icon: Package },
    { status: "shipped", label: "Shipped", icon: Truck },
    { status: "delivered", label: "Delivered", icon: CheckCircle2 },
    {
      status: "return_requested",
      label: "Return Requested",
      icon: RotateCcw,
    },
    { status: "returned", label: "Returned", icon: CheckCircle2 },
  ],
};

const getOrderTrackingFlow = (order) => {
  if (order.status === "cancelled") {
    return ORDER_TRACKING_FLOWS.cancelled;
  }

  if (order.status === "return_requested" || order.status === "returned") {
    return ORDER_TRACKING_FLOWS.returned;
  }

  return ORDER_TRACKING_FLOWS.normal;
};

const getOrderTrackingDate = (status, order) => {
  const dates = {
    placed: order.created_at,
    shipped: order.shipped_at,
    delivered: order.delivered_at,
    cancelled: order.cancelled_at,
    return_requested: order.return_requested_at,
    returned: order.returned_at,
  };

  return dates[status] || null;
};

/* =========================================
   ORDER DETAIL
========================================= */

const OrderDetail = () => {
  const [searchParams] = useSearchParams();

  // Order number is used instead of order ID.
  const orderNumber = searchParams.get("order_number");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({
      show: true,
      message,
      type,
    });
  };

  /* =========================================
     FETCH ORDER
  ========================================= */

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) {
      setPageError("Order number is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPageError("");

      const response = await api.get(
        `/user/orders/${encodeURIComponent(orderNumber)}/`,
      );

      setOrder(getPayload(response));
    } catch (error) {
      console.error("Order fetch error:", error);

      setPageError(
        error?.response?.data?.message ||
          "Unable to load order details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* =========================================
     CANCEL ORDER
  ========================================= */

  const handleCancelOrder = async () => {
    if (!order?.can_cancel || actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      await api.post(`/user/orders/${encodeURIComponent(orderNumber)}/cancel/`);

      showToast("Your order has been cancelled successfully.");

      await fetchOrder();
    } catch (error) {
      console.error("Cancel order error:", error);

      showToast(
        error?.response?.data?.message || "Unable to cancel this order.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================
     RETURN REQUEST
  ========================================= */

  const handleReturnRequest = async (event) => {
    event.preventDefault();

    if (!order?.can_return || actionLoading) return;

    const reason = returnReason.trim();

    if (!reason) {
      showToast("Please enter a reason for returning the order.", "error");
      return;
    }

    if (reason.length > 1000) {
      showToast("Return reason cannot exceed 1000 characters.", "error");
      return;
    }

    try {
      setActionLoading(true);

      await api.post(
        `/user/orders/${encodeURIComponent(orderNumber)}/return/`,
        {
          reason,
        },
      );

      setShowReturnForm(false);
      setReturnReason("");

      showToast("Your return request has been submitted.");

      await fetchOrder();
    } catch (error) {
      console.error("Return request error:", error);

      showToast(
        error?.response?.data?.message ||
          "Unable to submit your return request.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================
     PRODUCT REVIEW
  ========================================= */

  const openReviewForm = (item) => {
    setSelectedReviewItem(item);
    setReviewRating(5);
    setReviewText("");
  };

  const closeReviewForm = () => {
    if (actionLoading) return;

    setSelectedReviewItem(null);
    setReviewRating(5);
    setReviewText("");
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!selectedReviewItem || actionLoading) return;

    const review = reviewText.trim();

    if (!review) {
      showToast("Please write your review.", "error");
      return;
    }

    if (review.length > 2000) {
      showToast("Review cannot exceed 2000 characters.", "error");
      return;
    }

    try {
      setActionLoading(true);

      await api.post(
        `/user/orders/${encodeURIComponent(orderNumber)}/items/${selectedReviewItem.id}/review/`,
        {
          rating: reviewRating,
          review,
        },
      );

      showToast("Your review has been submitted successfully.");

      closeReviewForm();
      await fetchOrder();
    } catch (error) {
      console.error("Review submission error:", error);

      showToast(
        error?.response?.data?.message || "Unable to submit your review.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================
     INVOICE DOWNLOAD
  ========================================= */

  const handleDownloadInvoice = async () => {
    if (!orderNumber || invoiceLoading) return;

    try {
      setInvoiceLoading(true);

      const response = await api.get(
        `/user/orders/${encodeURIComponent(orderNumber)}/invoice/`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `Invoice-${orderNumber}.pdf`;

      document.body.appendChild(link);
      link.click();

      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      showToast("Invoice downloaded successfully.");
    } catch (error) {
      console.error("Invoice download error:", error);

      let message = "Unable to download invoice. Please try again.";

      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text());

          message = errorData.message || message;
        } catch {
          // Keep the default error message.
        }
      } else {
        message = error.response?.data?.message || message;
      }

      showToast(message, "error");
    } finally {
      setInvoiceLoading(false);
    }
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-black" />
          <p className="text-sm text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (pageError || !order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <Package className="mb-4 h-12 w-12 text-gray-300" />

        <h2 className="text-xl font-semibold text-gray-900">
          Unable to load order
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {pageError || "Order details could not be found."}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={fetchOrder}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Try Again
          </button>

          <Link
            to="/dashboard"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.delivery_address || {};

  const returnStatus = order.return_status || "none";

  const hasReturnStatus = returnStatus !== "none";

  const trackingSteps = getOrderTrackingFlow(order);

  const currentTrackingIndex = trackingSteps.findIndex(
    (step) => step.status === order.status,
  );

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-11">
      <div className="">
        {/* HEADER */}

        <div className="mb-7">
          <Link
            to="/dashboard"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black"
          >
            <ArrowLeft size={17} />
            Back to My Orders
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Order Details
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Order #{order.order_number}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* DOWNLOAD INVOICE */}

              {order.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  disabled={invoiceLoading}
                  className="flex items-center gap-1"
                >
                  {invoiceLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Download Invoice
                    </>
                  )}
                </button>
              )}

              {/* EXISTING ORDER ACTIONS */}

              {(order.can_cancel || order.can_return) && (
                <div className="rounded-xl border border-none bg-white">
                  <div className="flex flex-wrap gap-3">
                    {order.can_cancel && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleCancelOrder}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Cancel Order
                      </button>
                    )}

                    {order.can_return && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setShowReturnForm(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                      >
                        <RotateCcw size={16} />
                        Request Return
                      </button>
                    )}
                  </div>

                  {order.can_return && order.return_deadline && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={14} />
                      Return request deadline:{" "}
                      {formatDate(order.return_deadline)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ORDER TRACKING */}

        {/* ORDER INFORMATION */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2.5">
                <CalendarDays className="h-5 w-5 text-gray-700" />
              </div>

              <div>
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2.5">
                <Truck className="h-5 w-5 text-gray-700" />
              </div>

              <div>
                <p className="text-xs text-gray-500">Delivery Date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
  {order.status === "cancelled"
    ? "Order cancelled"
    : order.delivered_at
      ? formatDate(order.delivered_at)
      : "Not delivered yet"}
</p>
              </div>
            </div>
          </div>
        </div>

        {/* ORDER ITEMS */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <ShoppingBag className="h-5 w-5 text-gray-700" />

            <h2 className="font-semibold text-gray-900">
              Ordered Products ({items.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                No products found for this order.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.product_title}
                    </h3>

                    {item.variant_label && (
                      <p className="mt-1 text-sm text-gray-500">
                        {item.variant_label}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {formatPrice(item.unit_price)} × {item.quantity}
                    </p>

                    {/* PRODUCT REVIEW */}

                    
{order.can_review && (
  item.has_reviewed ? (
    <div className="mt-3 flex items-center gap-2">


      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={15}
            className={
              star <= item.review_rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }
          />
        ))}
      </div>


    </div>
  ) : (
    <button
      type="button"
      onClick={() => openReviewForm(item)}
      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 transition hover:text-black"
    >
      <Star size={14} />
      Write a Review
    </button>
  )
)}

                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-500">Item Total</p>

                    <p className="mt-1 font-bold text-gray-900">
                      {formatPrice(item.line_total)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DELIVERY ADDRESS */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-700" />

            <h2 className="font-semibold text-gray-900">Delivery Address</h2>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            {address.full_name && (
              <p className="font-semibold text-gray-900">{address.full_name}</p>
            )}

            {address.name && (
              <p className="font-semibold text-gray-900">{address.name}</p>
            )}

            {address.phone && <p>{address.phone}</p>}
            {address.address_line_1 && <p>{address.address_line_1}</p>}
            {address.address_line_2 && <p>{address.address_line_2}</p>}

            <p>
              {[
                address.city,
                address.state,
                address.postal_code || address.pincode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>

            {address.country && <p>{address.country}</p>}
          </div>
        </div>

        {/* RETURN INFORMATION */}

        {hasReturnStatus && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />

              <h2 className="font-semibold text-gray-900">
                Return Information
              </h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-gray-500">Return Status</span>

                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {formatStatus(returnStatus)}
                </span>
              </div>

              {order.return_requested_at && (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Requested On</span>
                  <span className="text-right text-gray-900">
                    {formatDate(order.return_requested_at)}
                  </span>
                </div>
              )}

              {order.return_reason && (
                <div>
                  <p className="mb-1 text-gray-500">Your Reason</p>
                  <p className="text-gray-800">{order.return_reason}</p>
                </div>
              )}

              {order.return_admin_note && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 font-semibold text-gray-700">
                    Admin Response
                  </p>

                  <p className="text-gray-600">{order.return_admin_note}</p>
                </div>
              )}

              {returnStatus === "pending" && (
                <p className="flex items-center gap-2 text-amber-700">
                  <Clock size={15} />
                  Your return request is awaiting admin review.
                </p>
              )}

              {returnStatus === "approved" && (
                <p className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 size={15} />
                  Your return request has been approved.
                </p>
              )}

              {returnStatus === "rejected" && (
                <p className="flex items-center gap-2 text-red-700">
                  <XCircle size={15} />
                  Your return request has been rejected.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ORDER SUMMARY */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3 text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>

            <div className="flex justify-between gap-3 text-gray-600">
              <span>Shipping Fee</span>
              <span>{formatPrice(order.shipping_fee)}</span>
            </div>
            {Number(order.coupon_discount ?? 0) > 0 && (
              <>
                <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        Coupon applied
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {order.coupon_code}
                      </p>

                      {/* {order.coupon_name && (
                        <p className="mt-1 text-xs text-gray-600">
                          {order.coupon_name}
                        </p>
                      )} */}

                      {order.discount_type && (
                        <p className="mt-1 text-xs text-gray-500">
                          {order.discount_type === "percentage"
                            ? `${Number(order.discount_value)}% discount`
                            : `${formatPrice(order.discount_value)} discount`}
                        </p>
                      )}
                    </div>

                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  </div>
                </div>

                <div className="flex justify-between gap-3 font-medium text-green-700">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(order.coupon_discount)}</span>
                </div>
              </>
            )}

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between gap-3 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-1 text-gray-600">
              <span>Payment Method</span>
              <span className="font-medium text-gray-900">
                {formatStatus(order.payment_method)}
              </span>
            </div>
          </div>
        </div>
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Order Tracking
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Follow your order journey.
              </p>
            </div>

            <Truck className="h-6 w-6 text-gray-400" />
          </div>

          {/* TIMELINE */}

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-[500px] items-start">
              {trackingSteps.map((step, index) => {
                const Icon = step.icon;

                const completed = index <= currentTrackingIndex;
                const isCurrent = index === currentTrackingIndex;

                const stepDate = getOrderTrackingDate(step.status, order);

                const isCancelled = step.status === "cancelled";

                return (
                  <div
                    key={step.status}
                    className="relative flex flex-1 flex-col items-center text-center"
                  >
                    {/* CONNECTING LINE */}

                    {index !== trackingSteps.length - 1 && (
                      <div
                        className={`absolute left-1/2 top-5 h-[2px] w-full ${
                          index < currentTrackingIndex
                            ? "bg-black"
                            : "bg-gray-200"
                        }`}
                      />
                    )}

                    {/* STATUS ICON */}

                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        isCancelled && completed
                          ? "border-red-500 bg-red-500 text-white"
                          : completed
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white text-gray-400"
                      }`}
                    >
                      {completed && !isCurrent ? (
                        <Check size={18} />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>

                    {/* STATUS LABEL */}

                    <p
                      className={`mt-3 max-w-[110px] text-xs font-semibold sm:text-sm ${
                        completed
                          ? isCancelled
                            ? "text-red-600"
                            : "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>

                    {/* STATUS DATE */}

                    <p className="mt-1 max-w-[120px] text-[10px] leading-4 text-gray-400 sm:text-xs">
                      {stepDate ? formatDate(stepDate) : "Awaiting"}
                    </p>

                    {/* CURRENT STATUS */}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RETURN STATUS MESSAGE */}

          {order.status === "return_requested" && (
            <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <Clock size={16} />
                Return request is under review
              </div>

              <p className="mt-1 text-xs text-amber-600">
                Your return request has been submitted and is awaiting admin
                approval.
              </p>

              {order.return_admin_note && (
                <p className="mt-2 text-xs text-gray-600">
                  Admin response: {order.return_admin_note}
                </p>
              )}
            </div>
          )}

          {order.return_status === "approved" &&
            order.status !== "returned" && (
              <div className="mt-5 rounded-lg border border-green-100 bg-green-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                  <CheckCircle2 size={16} />
                  Return request approved
                </div>

                <p className="mt-1 text-xs text-green-600">
                  Your return request has been approved. The returned product is
                  awaiting processing.
                </p>
              </div>
            )}

          {order.return_status === "rejected" && (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <XCircle size={16} />
                Return request rejected
              </div>

              {order.return_admin_note && (
                <p className="mt-1 text-xs text-red-600">
                  {order.return_admin_note}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ORDER ACTIONS */}

        {/* RETURN FORM */}

        
{/* RETURN REQUEST MODAL */}

{showReturnForm && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-6 backdrop-blur-sm"
    onMouseDown={(event) => {
      if (
        event.target === event.currentTarget &&
        !actionLoading
      ) {
        setShowReturnForm(false);
      }
    }}
  >
    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
      {/* MODAL HEADER */}

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gray-100 p-2">
            <RotateCcw size={19} className="text-gray-700" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            Request a Return
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowReturnForm(false)}
          disabled={actionLoading}
          className="rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-black disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* PRODUCT / ORDER INFORMATION */}

      <p className="mb-4 text-sm leading-relaxed text-gray-500">
        Please provide a reason for returning your order.
        Your request will be submitted for review.
      </p>

      {/* RETURN FORM */}

      <form onSubmit={handleReturnRequest}>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Reason for Return
        </label>

        <textarea
          value={returnReason}
          onChange={(event) => setReturnReason(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Please explain why you want to return this order..."
          className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
          required
        />

        <p className="mt-1 text-right text-xs text-gray-400">
          {returnReason.length}/1000
        </p>

        {/* MODAL ACTIONS */}

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={actionLoading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {actionLoading && (
              <LoaderCircle size={16} className="animate-spin" />
            )}

            Submit Return Request
          </button>

          <button
            type="button"
            onClick={() => setShowReturnForm(false)}
            disabled={actionLoading}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}


        {/* REVIEW MODAL */}

        {selectedReviewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Write a Review
                </h2>

                <button
                  type="button"
                  onClick={closeReviewForm}
                  disabled={actionLoading}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="mb-4 text-sm font-medium text-gray-700">
                {selectedReviewItem.product_title}
              </p>

              <form onSubmit={handleReviewSubmit}>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Your Rating
                </label>

                <div className="mb-5 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setReviewRating(rating)}
                      className="transition hover:scale-110"
                      aria-label={`Rate ${rating} out of 5`}
                    >
                      <Star
                        size={27}
                        className={
                          rating <= reviewRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }
                      />
                    </button>
                  ))}
                </div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Your Review
                </label>

                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Share your experience with this product..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  required
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {reviewText.length}/2000
                </p>

                <div className="mt-5 flex gap-3">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    Submit Review
                  </button>

                  <button
                    type="button"
                    onClick={closeReviewForm}
                    disabled={actionLoading}
                    className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FOOTER */}

        <div className="flex flex-wrap items-center justify-center gap-2 py-4 text-center text-xs text-gray-400">
          <ShieldCheck size={15} />
          Your order information is securely associated with your account.
        </div>
      </div>

      {/* TOAST */}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast((previous) => ({
              ...previous,
              show: false,
            }))
          }
        />
      )}
    </div>
  );
};

export default OrderDetail;
