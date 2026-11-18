import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  LoaderCircle,
  MapPin,
  Package,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

/* =========================================================
   API ENDPOINTS
   ========================================================= */

const ORDER_ENDPOINTS = {
  orders: "/admin/controls/orders/",

  orderManage: (orderNumber) =>
    `/admin/controls/orders/${encodeURIComponent(orderNumber)}/manage/`,
};

const PAGE_SIZE = 10;

/* =========================================================
   CONSTANTS
   ========================================================= */

const ORDER_STATUS_FILTERS = [
  { label: "All Orders", value: "all" },
  { label: "Placed", value: "placed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Return Requested", value: "return_requested" },
  { label: "Returned", value: "returned" },
];

const ORDER_DATE_FILTERS = [
  { label: "All Time", value: "all" },
  { label: "This Year", value: "year" },
  { label: "This Month", value: "month" },
  { label: "This Week", value: "week" },
  { label: "Today", value: "day" },
];

const PAYMENT_MODE_FILTERS = [
  { label: "All Payment Modes", value: "all" },
  { label: "Cash on Delivery", value: "cod" },
  { label: "Prepaid", value: "prepaid" },
];

const ORDER_SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Highest Amount", value: "total_high" },
  { label: "Lowest Amount", value: "total_low" },
];

const orderStatusStyles = {
  placed: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  return_requested: "bg-amber-50 text-amber-700",
  returned: "bg-purple-50 text-purple-700",
};

const inputClass =
  "w-full appearance-none rounded-lg border border-[#eae8e0] bg-white px-3.5 py-2.5 text-sm text-[#28271f] outline-none transition placeholder:text-[#aaa69a] focus:border-[#8c704d] focus:ring-2 focus:ring-[#8c704d]/10";

const panelClass =
  "rounded-xl border border-[#eae8e0] bg-white p-4 shadow-sm sm:p-5 lg:p-6";

const tableHeadClass =
  "whitespace-nowrap bg-[#f7f6f2] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#858276]";

const tableCellClass =
  "whitespace-nowrap border-b border-[#f0eee8] px-4 py-3.5 text-sm text-[#555247]";

/* =========================================================
   HELPERS
   ========================================================= */

function readOrders(response) {
  const payload = response?.data?.data ?? response?.data ?? {};

  return {
    results: Array.isArray(payload.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [],

    count: Number(payload.count ?? payload.length ?? 0),

    statusCounts: payload.status_counts ?? {},
  };
}

function getError(error) {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.detail) return data.detail;

  if (data && typeof data === "object") {
    return Object.values(data)
      .flat()
      .map((value) =>
        typeof value === "string" ? value : JSON.stringify(value),
      )
      .join(" ");
  }

  return error.message || "Something went wrong.";
}

function money(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";

  return new Date(value).toLocaleString(
    "en-IN",
    includeTime
      ? undefined
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
  );
}

/* =========================================================
   PAGINATION
   ========================================================= */

function Pagination({ page, total, onPageChange, loading = false }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mt-7 flex flex-col gap-4 border-t border-[#eae8e0] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#858276]">
        Showing {startItem} - {endItem} of {total} orders
      </p>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-[#eae8e0] px-3 py-2 text-sm text-[#555247] transition hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={17} />
          Previous
        </button>

        <span className="text-xs text-[#858276]">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-[#eae8e0] px-3 py-2 text-sm text-[#555247] transition hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   ORDER STATUS TRANSITIONS
   ========================================================= */

function getAdminOrderStatusOptions(order) {
  const statusOptions = {
    placed: [
      { value: "placed", label: "Placed" },
      { value: "shipped", label: "Shipped" },
      { value: "cancelled", label: "Cancelled" },
    ],

    shipped: [
      { value: "shipped", label: "Shipped" },
      { value: "delivered", label: "Delivered" },
    ],

    delivered: [{ value: "delivered", label: "Delivered" }],

    cancelled: [{ value: "cancelled", label: "Cancelled" }],

    return_requested: [
      { value: "return_requested", label: "Return Requested" },
    ],

    returned: [{ value: "returned", label: "Returned" }],
  };

  return (
    statusOptions[order.status] || [
      {
        value: order.status,
        label: order.status_label || order.status,
      },
    ]
  );
}

/* =========================================================
   MAIN ORDER MANAGEMENT COMPONENT
   ========================================================= */

export default function OrderManagement() {
  /* DATA */

  const [ordersSort, setOrdersSort] = useState("newest");
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderStatusCounts, setOrderStatusCounts] = useState({});

  /* LOADING */

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);

  /* SEARCH AND FILTERS */

  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersStatus, setOrdersStatus] = useState("all");
  const [ordersDate, setOrdersDate] = useState("all");
  const [ordersPaymentMode, setOrdersPaymentMode] = useState("all");

  /* PAGINATION */

  const [ordersPage, setOrdersPage] = useState(1);

  /* MODAL */

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  /* FORM */

  const [orderForm, setOrderForm] = useState({
    status: "placed",
  });

  /* FEEDBACK */

  const [orderError, setOrderError] = useState("");
  const [error, setError] = useState("");

  /* =======================================================
     LOAD ORDERS
     ======================================================= */

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setError("");

    try {
      const params = {
        page: ordersPage,
        page_size: PAGE_SIZE,
        search: ordersSearch.trim(),
        date_range: ordersDate,
        sort: ordersSort,
        payment_mode: ordersPaymentMode,
      };

      if (ordersStatus !== "all") {
        params.status = ordersStatus;
      }

      const response = await api.get(ORDER_ENDPOINTS.orders, {
        params,
      });

      const result = readOrders(response);

      setOrders(result.results);
      setOrdersTotal(result.count);
      setOrderStatusCounts(result.statusCounts);
    } catch (err) {
      console.error("Failed to load orders:", err);

      setOrders([]);
      setOrdersTotal(0);
      setOrderStatusCounts({});

      setError(getError(err));
    } finally {
      setOrdersLoading(false);
    }
  }, [
    ordersPage,
    ordersSearch,
    ordersDate,
    ordersStatus,
    ordersSort,
    ordersPaymentMode,
  ]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /* =======================================================
     ORDER MODAL
     ======================================================= */

  function openOrderManage(order) {
    setSelectedOrder(order);

    setOrderForm({
      status: order.status || "placed",
    });

    setOrderError("");
    setOrderModalOpen(true);
  }

  function closeOrderManage() {
    if (orderSaving) return;

    setOrderModalOpen(false);
    setSelectedOrder(null);
    setOrderError("");
  }

  function updateOrderForm(field, value) {
    setOrderForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  /* =======================================================
     ORDER STATUS LOCKING
     ======================================================= */

  const lockedOrderStatuses = [
    "delivered",
    "cancelled",
    "return_requested",
    "returned",
  ];

  const isOrderStatusLocked =
    selectedOrder && lockedOrderStatuses.includes(selectedOrder.status);

  const hasOrderStatusChanged =
    selectedOrder && orderForm.status !== selectedOrder.status;

  /* =======================================================
     SAVE ORDER CHANGES
     ======================================================= */

  async function saveOrderChanges() {
    if (
      !selectedOrder ||
      orderSaving ||
      !hasOrderStatusChanged ||
      isOrderStatusLocked
    ) {
      return;
    }

    setOrderSaving(true);
    setOrderError("");

    try {
      const response = await api.patch(
        ORDER_ENDPOINTS.orderManage(selectedOrder.order_number),
        {
          status: orderForm.status,
        },
      );

      await loadOrders();

      // Close modal after successful update
      setOrderModalOpen(false);
      setSelectedOrder(null);
      setOrderError("");
    } catch (err) {
      setOrderError(getError(err) || "Unable to update this order.");
    } finally {
      setOrderSaving(false);
    }
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <section className="space-y-5">
      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={ordersLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={ordersLoading ? "animate-spin" : ""}
          />
          {ordersLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="rounded p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* FILTER PANEL */}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa69a]"
            />

            <input
              type="search"
              value={ordersSearch}
              onChange={(event) => {
                setOrdersSearch(event.target.value);
                setOrdersPage(1);
              }}
              placeholder="Search order number, customer, email or phone..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={ordersDate}
            onChange={(event) => {
              setOrdersDate(event.target.value);
              setOrdersPage(1);
            }}
            className={`${inputClass} sm:w-48`}
          >
            {ORDER_DATE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          <select
            value={ordersSort}
            onChange={(event) => {
              setOrdersSort(event.target.value);
              setOrdersPage(1);
            }}
            className={`${inputClass} sm:w-48`}
          >
            {ORDER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={ordersPaymentMode}
            onChange={(event) => {
              setOrdersPaymentMode(event.target.value);
              setOrdersPage(1);
            }}
            className={`${inputClass} sm:w-52`}
          >
            {PAYMENT_MODE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* STATUS FILTERS */}

        <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2">
          {ORDER_STATUS_FILTERS.map((tab) => {
            const count =
              tab.value === "all"
                ? Object.values(orderStatusCounts).reduce(
                    (total, value) => total + Number(value),
                    0,
                  )
                : Number(orderStatusCounts[tab.value] ?? 0);

            const active = ordersStatus === tab.value;

            return (
              <button
                type="button"
                key={tab.value}
                onClick={() => {
                  setOrdersStatus(tab.value);
                  setOrdersPage(1);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition ${
                  active
                    ? "border-[#8c704d] bg-[#8c704d] text-white"
                    : "border-[#eae8e0] bg-white text-[#858276] hover:border-[#8c704d] hover:text-[#8c704d]"
                }`}
              >
                {tab.label}

                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#f7f6f2] text-[#858276]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ORDERS TABLE */}

      <section className={panelClass}>
        <div className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900">Orders</h2>

          <p className="text-xs text-gray-500">
            Showing {ordersTotal === 0 ? 0 : (ordersPage - 1) * PAGE_SIZE + 1}
            {" - "}
            {Math.min(ordersPage * PAGE_SIZE, ordersTotal)}
            {" of "}
            {ordersTotal} orders
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr>
                {[
                  "Order",
                  "Customer",
                  "Items",
                  "Total",
                  "Payment",
                  "Status",
                  "Order Date",
                  "Action",
                ].map((heading) => (
                  <th key={heading} className={tableHeadClass}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {ordersLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <LoaderCircle
                      size={24}
                      className="mx-auto animate-spin text-[#8c704d]"
                    />

                    <p className="mt-3 text-sm text-[#858276]">
                      Loading orders...
                    </p>
                  </td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-[#faf9f6]">
                    <td className={tableCellClass}>
                      <strong className="block text-[#28271f]">
                        {order.order_number}
                      </strong>

                      <span className="mt-1 block text-[10px] text-[#aaa69a]">
                        ID: #{order.id}
                      </span>
                    </td>

                    <td className={tableCellClass}>
                      <strong className="block text-[#28271f]">
                        {order.full_name}
                      </strong>

                      <span className="mt-1 block text-xs text-[#858276]">
                        {order.customer?.email || "—"}
                      </span>

                      <span className="mt-1 block text-xs text-[#858276]">
                        {order.phone}
                      </span>
                    </td>

                    <td className={tableCellClass}>
                      {order.item_count ??
                        order.items?.reduce(
                          (total, item) => total + Number(item.quantity || 0),
                          0,
                        ) ??
                        0}{" "}
                      items
                    </td>

                    <td className={tableCellClass}>
                      <strong className="text-[#28271f]">
                        {money(order.total)}
                      </strong>
                    </td>

                    <td className={tableCellClass}>
                      <span className="block text-xs text-[#555247]">
                        {order.payment_method_label || order.payment_method}
                      </span>

                      <span className="mt-1 block text-[10px] text-[#858276]">
                        {order.payment_status_label || order.payment_status}
                      </span>
                    </td>

                    <td className={tableCellClass}>
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          orderStatusStyles[order.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.status_label || order.status}
                      </span>
                    </td>

                    <td className={tableCellClass}>
                      {formatDate(order.created_at)}
                    </td>

                    <td className={tableCellClass}>
                      <button
                        type="button"
                        onClick={() => openOrderManage(order)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#e5dfd3] bg-white px-3.5 py-2 text-xs font-bold text-[#8c704d] transition hover:border-[#8c704d] hover:bg-[#f8f5ef]"
                      >
                        <Eye size={14} />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-[#858276]"
                  >
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={ordersPage}
          total={ordersTotal}
          onPageChange={setOrdersPage}
          loading={ordersLoading}
        />
      </section>

      {/* =================================================
          MANAGE ORDER MODAL
          ================================================= */}

      {orderModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderManage();
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-[#eae8e0] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#8c704d]">
                  ORDER MANAGEMENT
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#28271f]">
                  {selectedOrder.order_number}
                </h2>

                <p className="mt-1 text-xs text-[#858276]">
                  Manage order fulfilment and delivery status.
                </p>
              </div>

              <button
                type="button"
                disabled={orderSaving}
                onClick={closeOrderManage}
                className="rounded-lg p-2 text-[#858276] transition hover:bg-[#f5f4f0] hover:text-black disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY */}

            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
              {/* CUSTOMER + ORDER INFORMATION */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#eae8e0] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <UserRound size={17} className="text-[#8c704d]" />

                    <h3 className="text-sm font-bold text-[#28271f]">
                      Customer Details
                    </h3>
                  </div>

                  <p className="text-sm font-semibold text-[#28271f]">
                    {selectedOrder.full_name}
                  </p>

                  <p className="mt-1 text-xs text-[#858276]">
                    {selectedOrder.customer?.email || "—"}
                  </p>

                  <p className="mt-1 text-xs text-[#858276]">
                    {selectedOrder.phone}
                  </p>
                </div>

                <div className="rounded-xl border border-[#eae8e0] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShoppingBag size={17} className="text-[#8c704d]" />

                    <h3 className="text-sm font-bold text-[#28271f]">
                      Order Information
                    </h3>
                  </div>

                  <p className="text-xs text-[#858276]">Order date</p>

                  <p className="mt-1 text-sm font-semibold text-[#28271f]">
                    {formatDate(selectedOrder.created_at, true)}
                  </p>

                  <p className="mt-3 text-xs text-[#858276]">
                    Current order status
                  </p>

                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      orderStatusStyles[selectedOrder.status] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedOrder.status_label || selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* DELIVERY ADDRESS */}

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <MapPin size={17} className="text-[#8c704d]" />

                  <h3 className="text-sm font-bold text-[#28271f]">
                    Delivery Address
                  </h3>
                </div>

                <div className="rounded-xl border border-[#eae8e0] bg-[#faf9f6] p-4">
                  {[
                    selectedOrder.delivery_address?.address_line1,
                    selectedOrder.delivery_address?.address_line2,
                    selectedOrder.delivery_address?.landmark,
                    [
                      selectedOrder.delivery_address?.city,
                      selectedOrder.delivery_address?.state,
                      selectedOrder.delivery_address?.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", "),
                    selectedOrder.delivery_address?.country,
                  ]
                    .filter(Boolean)
                    .map((line, index) => (
                      <p
                        key={index}
                        className="text-xs leading-6 text-[#555247]"
                      >
                        {line}
                      </p>
                    ))}
                </div>
              </section>

              {/* ORDERED PRODUCTS */}

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Package size={17} className="text-[#8c704d]" />

                  <h3 className="text-sm font-bold text-[#28271f]">
                    Ordered Products
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#eae8e0]">
                  <table className="w-full min-w-[550px] text-left">
                    <thead className="bg-[#faf9f6]">
                      <tr>
                        {["Product", "Variant", "Price", "Qty", "Total"].map(
                          (heading) => (
                            <th
                              key={heading}
                              className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#858276]"
                            >
                              {heading}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedOrder.items || []).map((item) => (
                        <tr key={item.id} className="border-t border-[#eae8e0]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={item.product_title}
                                  className="h-12 w-12 rounded-lg border border-[#eae8e0] object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f5f4f0]">
                                  <Package
                                    size={18}
                                    className="text-[#aaa69a]"
                                  />
                                </div>
                              )}

                              <span className="max-w-[180px] text-xs font-semibold text-[#28271f]">
                                {item.product_title}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-xs text-[#858276]">
                            {item.variant_label || "—"}
                          </td>

                          <td className="px-4 py-3 text-xs text-[#555247]">
                            {money(item.unit_price)}
                          </td>

                          <td className="px-4 py-3 text-xs text-[#555247]">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-3 text-xs font-bold text-[#28271f]">
                            {money(item.line_total)}
                          </td>
                        </tr>
                      ))}

                      {!selectedOrder.items?.length && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-xs text-[#858276]"
                          >
                            No order items available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* PRICE SUMMARY */}

              <section className="rounded-xl border border-[#eae8e0] p-4">
                <h3 className="mb-4 text-sm font-bold text-[#28271f]">
                  Price Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#858276]">Subtotal</span>

                    <strong className="text-[#28271f]">
                      {money(selectedOrder.subtotal)}
                    </strong>
                  </div>

                  {Number(selectedOrder.coupon_discount) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#858276]">
                        Coupon discount
                        {selectedOrder.coupon_code
                          ? ` (${selectedOrder.coupon_code})`
                          : ""}
                      </span>

                      <strong className="text-green-700">
                        -{money(selectedOrder.coupon_discount)}
                      </strong>
                    </div>
                  )}

                  <div className="flex justify-between text-xs">
                    <span className="text-[#858276]">Shipping fee</span>

                    <strong className="text-[#28271f]">
                      {money(selectedOrder.shipping_fee)}
                    </strong>
                  </div>

                  <div className="border-t border-dashed border-[#eae8e0] pt-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-[#28271f]">
                        Total
                      </span>

                      <strong className="text-lg text-[#28271f]">
                        {money(selectedOrder.total)}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* PAYMENT INFORMATION */}

              <section className="rounded-xl border border-[#eae8e0] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard size={17} className="text-[#8c704d]" />

                  <h3 className="text-sm font-bold text-[#28271f]">
                    Payment Information
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-[#858276]">Payment method</p>

                    <p className="mt-1 text-sm font-semibold text-[#28271f]">
                      {selectedOrder.payment_method_label ||
                        selectedOrder.payment_method}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[#858276]">Payment status</p>

                    <p className="mt-1 text-sm font-semibold capitalize text-[#28271f]">
                      {selectedOrder.payment_status_label ||
                        selectedOrder.payment_status}
                    </p>
                  </div>
                </div>
              </section>

              {/* ORDER STATUS MANAGEMENT */}

              <section className="rounded-xl border border-[#eae8e0] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Truck size={17} className="text-[#8c704d]" />

                  <h3 className="text-sm font-bold text-[#28271f]">
                    Order Status Management
                  </h3>
                </div>

                <label className="mb-2 block text-xs font-semibold text-[#555247]">
                  Update order status
                </label>

                <select
                  value={orderForm.status}
                  onChange={(event) =>
                    updateOrderForm("status", event.target.value)
                  }
                  disabled={orderSaving || isOrderStatusLocked}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f7f6f2] disabled:text-[#858276]`}
                >
                  {getAdminOrderStatusOptions(selectedOrder).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {isOrderStatusLocked ? (
                  <p className="mt-2 text-xs text-[#858276]">
                    {selectedOrder.status === "delivered"
                      ? "This order has been delivered. Order status can no longer be changed here."
                      : selectedOrder.status === "cancelled"
                        ? "This order has been cancelled. Order status can no longer be changed."
                        : "This order is being handled through Return Management. Manage the return request there."}
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] text-[#aaa69a]">
                    Update the order as it moves from placed to shipped and
                    delivered.
                  </p>
                )}

                {selectedOrder.delivered_at && (
                  <p className="mt-3 text-xs text-[#858276]">
                    Delivered on: {formatDate(selectedOrder.delivered_at, true)}
                  </p>
                )}

                {selectedOrder.cancelled_at && (
                  <p className="mt-2 text-xs text-red-600">
                    Cancelled on: {formatDate(selectedOrder.cancelled_at, true)}
                  </p>
                )}
              </section>

              {/* MODAL ERROR */}

              {orderError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {orderError}
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-[#eae8e0] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
              <button
                type="button"
                onClick={closeOrderManage}
                disabled={orderSaving}
                className="rounded-lg border border-[#e5dfd3] bg-white px-5 py-2.5 text-xs font-bold text-[#858276] transition hover:bg-[#f5f4f0] disabled:opacity-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={saveOrderChanges}
                disabled={
                  orderSaving || !hasOrderStatusChanged || isOrderStatusLocked
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8c704d] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#765d3e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {orderSaving ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
