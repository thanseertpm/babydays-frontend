import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  House,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Confirm from "../components/Confirm";
import Toggle from "../components/Toggle";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import Toast from "../components/Toast";

const MENU_ITEMS = [
  { id: "orders", label: "My Orders", icon: Package },
  { id: "reviews", label: "My Reviews", icon: Star },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "account", label: "Account", icon: ShieldCheck },
];

const PAGE_TITLES = {
  orders: {
    title: "My Orders",
    description: "Track and review your purchases.",
  },
  reviews: {
    title: "My Reviews",
    description: "Your feedback on products from Aura Fashions.",
  },
  profile: {
    title: "My Profile",
    description: "View your personal information.",
  },
  addresses: {
    title: "My Addresses",
    description: "Your saved delivery addresses.",
  },
  account: {
    title: "Account Settings",
    description: "Manage your account information.",
  },
};

const ENDPOINTS = {
  orders: "/user/orders/",
  addresses: "/user/addresses/",
  reviews: "/user/reviews/my/",
};

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function getList(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function getOrderNumber(order) {
  return (
    order.order_number ??
    order.order_id ??
    order.custom_order_id ??
    order.id ??
    "Order"
  );
}

function getOrderTotal(order) {
  return (
    order.total ?? order.total_amount ?? order.grand_total ?? order.amount ?? 0
  );
}

function getStatus(order) {
  return order.status ?? order.order_status ?? "Processing";
}

function getAddressLines(address) {
  return [
    address.full_name ?? address.name,
    address.phone ?? address.mobile,
    address.address_line1 ?? address.address_line_1 ?? address.line1,
    address.address_line2 ?? address.address_line_2 ?? address.line2,
    [
      address.city,
      address.state,
      address.postal_code ?? address.pincode ?? address.zip_code,
    ]
      .filter(Boolean)
      .join(", "),
    address.country,
  ].filter(Boolean);
}

function StatusBadge({ status }) {
  const normalized = String(status).toLowerCase().replaceAll("_", " ");

  let statusClass = "bg-amber-50 text-amber-800";

  if (
    ["delivered", "completed", "paid", "success"].some((value) =>
      normalized.includes(value),
    )
  ) {
    statusClass = "bg-green-50 text-green-700";
  } else if (
    ["cancelled", "failed", "refunded", "rejected"].some((value) =>
      normalized.includes(value),
    )
  ) {
    statusClass = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1.5 text-[10px] font-bold capitalize ${statusClass}`}
    >
      {normalized}
    </span>
  );
}

const emptyAddress = {
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  landmark: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  address_type: "home",
  is_default: false,
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    Object.values(error?.response?.data || {})
      .flat()
      .find((value) => typeof value === "string") ||
    "Something went wrong. Please try again."
  );
}

function getAccountErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.detail === "string") return data.detail;

  if (data && typeof data === "object") {
    for (const [field, value] of Object.entries(data)) {
      const message = Array.isArray(value)
        ? value.find((item) => typeof item === "string")
        : typeof value === "string"
          ? value
          : null;

      if (message) {
        return field === "non_field_errors" ? message : message;
      }
    }
  }

  return "Something went wrong. Please try again.";
}

const focusStyles =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#111]";

const primaryButtonStyles =
  "inline-flex min-h-[43px] items-center justify-center gap-2 rounded-md border border-[#111] bg-[#111] px-4 py-3 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonStyles =
  "inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-md border border-[#e8e8e8] bg-white px-3 py-2 text-xs font-medium text-[#444] transition-colors hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-50";

const panelStyles =
  "min-w-0 rounded-xl border border-[#e8e8e8] bg-white p-[clamp(17px,3vw,28px)] mt-2";

function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("orders");
  const [loggingOut, setLoggingOut] = useState(false);

  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [addresses, setAddresses] = useState([]);

  const [loadedTabs, setLoadedTabs] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [pageError, setPageError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [toast, setToast] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const [updatingReviewId, setUpdatingReviewId] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderDateFilter, setOrderDateFilter] = useState("all");

  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);

  const [orderPagination, setOrderPagination] = useState({
    count: 0,
    page_size: 16,
    next: null,
    previous: null,
  });

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

  const username = user?.username ?? user?.name ?? "Customer";
  const email = user?.email ?? "";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "?";

  const loadTabData = useCallback(
    async (tab, force = false) => {
      if (!["reviews", "addresses"].includes(tab)) return;
      if (loadedTabs[tab] && !force) return;

      setLoadingTab(true);
      setPageError("");

      try {
        const response = await api.get(ENDPOINTS[tab]);
        const payload = unwrapResponse(response);

        if (tab === "reviews") {
          setReviews(getList(payload, ["reviews"]));
        } else if (tab === "addresses") {
          setAddresses(getList(payload, ["addresses"]));
        }

        setLoadedTabs((current) => ({
          ...current,
          [tab]: true,
        }));
      } catch (error) {
        showToast(
          error.response?.data?.message ??
            error.response?.data?.detail ??
            `Unable to load your ${tab}. Please try again.`,
          "error",
        );
      } finally {
        setLoadingTab(false);
      }
    },
    [loadedTabs, showToast],
  );
  useEffect(() => {
    if (authLoading || !user || activeTab === "orders") return;

    loadTabData(activeTab);
  }, [activeTab, authLoading, user, loadTabData, refreshKey]);

  useEffect(() => {
    if (authLoading || !user || activeTab !== "orders") return;

    let cancelled = false;

    const fetchOrders = async () => {
      setLoadingTab(true);
      setPageError("");

      try {
        const response = await api.get(ENDPOINTS.orders, {
          params: {
            status: orderStatusFilter,
            date: orderDateFilter,
            page: orderPage,
            page_size: 16,
          },
        });

        const payload = unwrapResponse(response);

        if (!cancelled) {
          setOrders(payload?.results || []);

          setOrderPagination({
            count: payload?.count || 0,
            page_size: payload?.page_size || 16,
            next: payload?.next || null,
            previous: payload?.previous || null,
          });

          setLoadedTabs((current) => ({
            ...current,
            orders: true,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          showToast(
            error.response?.data?.message ??
              error.response?.data?.detail ??
              "Unable to load your orders. Please try again.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTab(false);
        }
      }
    };

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    authLoading,
    user,
    orderStatusFilter,
    orderDateFilter,
    orderPage,
    refreshKey,
    showToast,
  ]);

  const resetAddressForm = () => {
    setAddressForm(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const startAddAddress = () => {
    setPageError("");

    setAddressForm({
      ...emptyAddress,
      is_default: addresses.length === 0,
    });

    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  const startEditAddress = (address) => {
    setPageError("");
    setAddressForm({
      ...emptyAddress,
      ...address,
    });

    setEditingAddressId(address.id);
    setShowAddressForm(true);
  };

  const handleAddressField = (event) => {
    const { name, value, type, checked } = event.target;

    setAddressForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const refreshAddresses = async () => {
    const response = await api.get("/user/addresses/");
    const payload = unwrapResponse(response);
    const list = getList(payload, ["addresses"]);

    setAddresses(list);
    setLoadedTabs((current) => ({
      ...current,
      addresses: true,
    }));

    return list;
  };

  const handleSaveAddress = async (event) => {
    event.preventDefault();

    setPageError("");
    setSavingAddress(true);

    try {
      const payload = {
        ...addressForm,
        is_default: addressForm.is_default || addresses.length === 0,
      };

      if (editingAddressId) {
        await api.patch(`/user/addresses/${editingAddressId}/`, payload);
      } else {
        await api.post("/user/addresses/", payload);
      }

      await refreshAddresses();
      resetAddressForm();
      showToast(
        editingAddressId
          ? "Address updated successfully."
          : "Address added successfully.",
        "success",
      );
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (address) => {
    setPageError("");

    try {
      await api.post(`/user/addresses/${address.id}/`);
      await refreshAddresses();
      showToast("Default address updated successfully.", "success");
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  };

  // Open the confirmation modal.
  const handleDeleteAddress = (address) => {
    setSelectedAddress(address);
  };

  // Close the confirmation modal.
  const cancelDeleteAddress = () => {
    if (deletingAddressId !== null) return;
    setSelectedAddress(null);
  };

  // Delete only after confirmation.
  const confirmDeleteAddress = async () => {
    if (!selectedAddress) return;

    const addressId = selectedAddress.id;

    setPageError("");
    setDeletingAddressId(addressId);

    try {
      await api.delete(`/user/addresses/${addressId}/`);

      await refreshAddresses();

      if (editingAddressId === addressId) {
        resetAddressForm();
      }

      setSelectedAddress(null);
      showToast("Address removed successfully.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeletingAddressId(null);
    }
  };
  const totalPages = Math.max(
    1,
    Math.ceil(orderPagination.count / orderPagination.page_size),
  );

  const startOrder =
    orderPagination.count === 0
      ? 0
      : (orderPage - 1) * orderPagination.page_size + 1;

  const endOrder = Math.min(
    orderPage * orderPagination.page_size,
    orderPagination.count,
  );

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Unable to log out. Please try again.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  function handleRefresh() {
    setLoadedTabs((current) => ({ ...current, [activeTab]: false }));
    setRefreshKey((current) => current + 1);
  }

  const handleUpdateReview = async (reviewId, reviewData) => {
    setUpdatingReviewId(reviewId);

    try {
      const response = await api.patch(
        `/user/reviews/${reviewId}/`,
        reviewData,
      );

      const updatedReview = unwrapResponse(response);

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId ? { ...review, ...updatedReview } : review,
        ),
      );

      showToast("Review updated successfully.", "success");
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), "error");
      return false;
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const handleDeleteReview = (review) => {
    setSelectedReview(review);
  };

  const cancelDeleteReview = () => {
    if (deletingReviewId !== null) return;
    setSelectedReview(null);
  };

  const confirmDeleteReview = async () => {
    if (!selectedReview) return;

    const reviewId = selectedReview.id;

    setDeletingReviewId(reviewId);

    try {
      await api.delete(`/user/reviews/${reviewId}/`);

      setReviews((current) =>
        current.filter((review) => review.id !== reviewId),
      );

      setSelectedReview(null);
      showToast("Review deleted successfully.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeletingReviewId(null);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-[70vh] w-full items-center justify-center gap-3 bg-[#fafafa] px-4 text-sm text-[#737373]">
        <span className="h-[19px] w-[19px] shrink-0 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-[#171717] motion-reduce:animate-none" />
        Loading your account...
      </main>
    );
  }

  if (!user) return null;

  const page = PAGE_TITLES[activeTab];

  return (
    <main className="box-border min-h-[70vh] w-full bg-[#fafafa] px-4 py-6 text-[#171717] sm:px-11 sm:py-[26px] lg:py-[clamp(24px,4vw,54px)]">
      <div className="w-full">
        {/* Welcome header */}

        <div className="mb-[22px] flex items-center justify-between gap-3 sm:mb-[30px] sm:gap-6">
          <div className="min-w-0">
            <p className="mb-[9px] text-[11px] font-bold tracking-[1.8px] text-[#737373]">
              YOUR AURA FASHIONS ACCOUNT
            </p>

            <h1 className="text-[23px] font-bold leading-tight tracking-[-0.7px] sm:text-[27px] sm:tracking-[-1.1px] lg:text-[clamp(25px,3vw,35px)]">
              Welcome back, {username}
            </h1>

            <p className="mt-2.5 text-xs leading-relaxed text-[#737373] sm:text-sm">
              Manage your orders, profile, and delivery information.
            </p>
          </div>

          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#171717] text-[17px] font-semibold text-white sm:h-[58px] sm:w-[58px] sm:text-2xl"
            aria-hidden="true"
          >
            {avatarLetter}
          </div>
        </div>

        {/* Main layout */}

        <div className="grid min-w-0 grid-cols-1 items-start gap-[18px] min-[761px]:grid-cols-[225px_minmax(0,1fr)] min-[1001px]:grid-cols-[255px_minmax(0,1fr)] min-[1001px]:gap-6">
          {/* Sidebar */}

          <aside className="min-w-0 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white">
            <div className="flex items-center gap-3 border-b border-[#e8e8e8] px-[15px] py-[15px] min-[761px]:px-[18px] min-[761px]:py-[18px] min-[1001px]:px-[18px] min-[1001px]:py-[22px]">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#e3e3e3] bg-[#f3f3f3] text-[19px] font-bold uppercase text-[#171717]">
                {avatarLetter}
              </div>

              <div className="flex min-w-0 flex-col gap-[5px]">
                <strong className="truncate text-sm font-bold text-[#171717]">
                  {username}
                </strong>
                <span
                  className="truncate text-[11px] text-[#737373]"
                  title={email}
                >
                  {email || "Aura Fashions customer"}
                </span>
              </div>
            </div>

            <div className="px-[15px] pb-[9px] pt-[15px] text-[10px] font-bold tracking-[1.4px] text-[#8a8a8a] min-[761px]:px-[18px] min-[761px]:pb-[10px] min-[761px]:pt-[22px]">
              MY ACCOUNT
            </div>

            <nav
              className="grid grid-cols-2 gap-1.5 px-2 pb-3 min-[761px]:flex min-[761px]:flex-col min-[761px]:gap-1 min-[761px]:px-[10px] min-[761px]:pb-[18px]"
              aria-label="Account navigation"
            >
              {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={`flex min-h-[43px] min-w-0 items-center gap-2 rounded-lg border px-2 py-2.5 text-left transition-colors duration-200 min-[481px]:gap-2.5 min-[481px]:px-3 min-[761px]:min-h-[46px] min-[761px]:gap-3 min-[761px]:px-[13px] ${
                    activeTab === id
                      ? "border-[#eaeaea] bg-[#f4f4f4] text-[#111]"
                      : "border-transparent bg-transparent text-[#555] hover:bg-[#f6f6f6] hover:text-[#111]"
                  } ${focusStyles}`}
                  onClick={() => {
                    setPageError("");
                    setActiveTab(id);
                  }}
                  aria-current={activeTab === id ? "page" : undefined}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="h-4 w-4 shrink-0 min-[481px]:h-[18px] min-[481px]:w-[18px]"
                  />

                  <span
                    className={`min-w-0 flex-1 truncate text-[11px] min-[481px]:text-xs min-[761px]:text-[13px] ${
                      activeTab === id ? "font-bold" : "font-medium"
                    }`}
                  >
                    {label}
                  </span>

                  <ChevronRight
                    className={`hidden shrink-0 text-[#999] min-[761px]:block ${
                      activeTab === id ? "opacity-100" : "opacity-0"
                    }`}
                    size={16}
                  />
                </button>
              ))}
            </nav>

            <div className="grid grid-cols-2 gap-2 border-t border-[#e8e8e8] p-2.5 min-[761px]:flex min-[761px]:flex-col min-[761px]:gap-[5px] min-[761px]:px-[10px] min-[761px]:py-3">
              <Link
                to="/collections"
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[10px] font-semibold text-[#555] no-underline transition-colors hover:bg-[#f5f5f5] hover:text-[#111] min-[481px]:text-[11px] min-[761px]:justify-start min-[761px]:gap-[11px] min-[761px]:px-[13px] min-[761px]:text-xs ${focusStyles}`}
              >
                <ClipboardList size={18} className="shrink-0" />
                <span className="flex-1 min-[761px]:flex-none">
                  Continue shopping
                </span>
                <ArrowRight size={16} className="hidden min-[761px]:block" />
              </Link>

              <button
                type="button"
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[10px] font-semibold text-[#b42318] transition-colors hover:bg-[#fff1f0] disabled:cursor-not-allowed disabled:opacity-60 min-[481px]:text-[11px] min-[761px]:justify-start min-[761px]:px-[13px] min-[761px]:text-xs ${focusStyles}`}
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut size={18} className="shrink-0" />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </aside>

          {/* Main content */}

          <section className="min-w-0">
            <div className="mb-[17px] flex items-center justify-between gap-4 border-b border-[#e8e8e8] px-0 pb-[18px] pt-1 min-[761px]:mb-[22px]">
              <div className="min-w-0">
                <h2 className="text-[21px] font-bold tracking-[-0.7px] text-[#171717] sm:text-[23px] lg:text-[clamp(21px,2.2vw,26px)]">
                  {page.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#737373] sm:text-[13px]">
                  {page.description}
                </p>
              </div>

              {["orders", "reviews", "addresses"].includes(activeTab) && (
                <button
                  type="button"
                  className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg border border-[#e8e8e8] bg-white text-[#333] transition-colors hover:border-[#cfcfcf] hover:bg-[#f7f7f7] disabled:cursor-wait disabled:opacity-60 ${focusStyles}`}
                  onClick={handleRefresh}
                  disabled={loadingTab}
                  aria-label="Refresh section"
                  title="Refresh"
                >
                  <RefreshCw
                    size={17}
                    className={
                      loadingTab
                        ? "animate-spin motion-reduce:animate-none"
                        : ""
                    }
                  />
                </button>
              )}
            </div>

            {pageError && (
              <div
                className="mb-[18px] flex items-center justify-between gap-4 rounded-lg border border-[#f1c7c4] bg-[#fff7f6] px-4 py-3.5 text-xs leading-relaxed text-[#9e241b]"
                role="alert"
              >
                <span className="min-w-0">{pageError}</span>
                <button
                  type="button"
                  className="shrink-0 py-1 font-bold underline"
                  onClick={handleRefresh}
                >
                  Try again
                </button>
              </div>
            )}

            {loadingTab && !loadedTabs[activeTab] ? (
              <div
                className={`${panelStyles} flex min-h-[180px] items-center justify-center gap-3 text-[13px] text-[#737373]`}
              >
                <span className="h-[19px] w-[19px] shrink-0 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-[#171717] motion-reduce:animate-none" />
                Loading {page.title.toLowerCase()}...
              </div>
            ) : (
              <>
                {activeTab === "orders" && (
                  <OrdersPanel
                    orders={orders}
                    statusFilter={orderStatusFilter}
                    setStatusFilter={setOrderStatusFilter}
                    dateFilter={orderDateFilter}
                    setDateFilter={setOrderDateFilter}
                    orderPage={orderPage}
                    setOrderPage={setOrderPage}
                    orderPagination={orderPagination}
                    totalPages={totalPages}
                    startOrder={startOrder}
                    endOrder={endOrder}
                    loadingTab={loadingTab}
                  />
                )}

                {activeTab === "reviews" && (
                  <ReviewsPanel
                    reviews={reviews}
                    onUpdate={handleUpdateReview}
                    onDelete={handleDeleteReview}
                    updatingReviewId={updatingReviewId}
                    deletingReviewId={deletingReviewId}
                  />
                )}

                {activeTab === "profile" && <ProfilePanel user={user} />}

                {activeTab === "addresses" && (
                  <AddressesPanel
                    addresses={addresses}
                    showAddressForm={showAddressForm}
                    addressForm={addressForm}
                    editingAddressId={editingAddressId}
                    savingAddress={savingAddress}
                    deletingAddressId={deletingAddressId}
                    onAdd={startAddAddress}
                    onEdit={startEditAddress}
                    onDelete={handleDeleteAddress}
                    onSetDefault={handleSetDefaultAddress}
                    onFieldChange={handleAddressField}
                    onSave={handleSaveAddress}
                    onCancel={resetAddressForm}
                  />
                )}

                {activeTab === "account" && (
                  <AccountPanel user={user} showToast={showToast} />
                )}
              </>
            )}
          </section>
        </div>
      </div>
      <Toast
        message={toast?.message}
        type={toast?.type}
        duration={toast?.duration}
        onClose={hideToast}
      />
      <Confirm
        open={Boolean(selectedReview)}
        title="Delete Review"
        message={
          selectedReview
            ? `Are you sure you want to delete your review for "${selectedReview.product_title || "this product"}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete Review"
        onConfirm={confirmDeleteReview}
        onCancel={cancelDeleteReview}
        loading={deletingReviewId !== null}
        danger={true}
      />

      <Confirm
        open={Boolean(selectedAddress)}
        title="Remove Address"
        message={
          selectedAddress
            ? `Are you sure you want to remove the address saved for "${selectedAddress.full_name}"? This action cannot be undone.`
            : ""
        }
        confirmText="Remove Address"
        onConfirm={confirmDeleteAddress}
        onCancel={cancelDeleteAddress}
        loading={deletingAddressId !== null}
        danger={true}
      />
    </main>
  );
}

function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#e8e8e8] bg-white px-4 py-8 text-center min-[481px]:min-h-[320px] min-[481px]:px-5">
      <div className="mb-[18px] grid h-16 w-16 place-items-center rounded-full bg-[#f4f4f4] text-[#303030]">
        <Icon size={30} />
      </div>
      <h3 className="text-lg font-bold tracking-[-0.3px]">{title}</h3>
      <p className="mb-5 mt-[9px] max-w-[360px] text-[13px] leading-[1.7] text-[#737373]">
        {description}
      </p>
      {children}
    </div>
  );
}

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

function OrdersPanel({
  orders,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  orderPage,
  setOrderPage,
  orderPagination,
  totalPages,
  startOrder,
  endOrder,
  loadingTab,
}) {
  const filteredOrders = orders;

  if (!orders.length && statusFilter === "all" && dateFilter === "all") {
    return (
      <EmptyState
        icon={Package}
        title="No orders yet"
        description="Your purchases will appear here after you place an order."
      >
        <Link to="/collections" className={primaryButtonStyles}>
          Explore collection <ArrowRight size={16} />
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* STATUS FILTER */}

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold tracking-wide text-[#333]">
            ORDER STATUS
          </h3>

          <span className="text-[11px] text-[#888]">
            {filteredOrders.length} orders
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {ORDER_STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value);
                  setOrderPage(1);
                }}
                className={`min-h-[36px] shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#e8e8e8] bg-white text-[#555] hover:border-[#aaa] hover:text-[#111]"
                }`}
                aria-pressed={active}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* DATE FILTER */}

        <div className="mb-3 mt-5 flex items-center gap-2">
          <CalendarDays size={15} className="text-[#777]" />

          <h3 className="text-xs font-bold tracking-wide text-[#333]">
            ORDER DATE
          </h3>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {ORDER_DATE_FILTERS.map((filter) => {
            const active = dateFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setDateFilter(filter.value);
                  setOrderPage(1);
                }}
                className={`min-h-[34px] shrink-0 rounded-md border px-3 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-[#dedede] bg-[#f2f2f2] text-[#111] font-bold"
                    : "border-[#e8e8e8] bg-white text-[#666] hover:bg-[#f7f7f7]"
                }`}
                aria-pressed={active}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTERED ORDER LIST */}

      {filteredOrders.length === 0 ? (
        <div className="flex min-h-[230px] flex-col items-center justify-center rounded-xl border border-[#e8e8e8] bg-white px-4 py-8 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f4f4f4] text-[#555]">
            <Package size={26} />
          </div>

          <h3 className="text-base font-bold text-[#222]">
            No matching orders
          </h3>

          <p className="mt-2 max-w-[320px] text-xs leading-relaxed text-[#888]">
            No orders match the selected status and date filters.
          </p>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setDateFilter("all");
              setOrderPage(1);
            }}
            className="mt-4 text-xs font-bold text-[#171717] underline underline-offset-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {filteredOrders.map((order, index) => {
            const orderNumber = getOrderNumber(order);

            const itemCount =
              order.item_count ??
              order.items_count ??
              order.items?.length ??
              null;

            return (
              <article
                className="min-w-0 rounded-xl border border-[#e8e8e8] bg-white p-[14px] transition-all duration-200 hover:border-[#d5d5d5] hover:shadow-[0_4px_18px_rgba(0,0,0,0.03)] min-[481px]:p-[18px] min-[1001px]:p-[21px]"
                key={order.id ?? orderNumber ?? index}
              >
                <div className="flex flex-wrap items-center gap-2.5 min-[481px]:gap-[13px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                    <span className="text-[10px] font-semibold tracking-[0.7px] text-[#737373]">
                      ORDER NUMBER
                    </span>

                    <strong className="break-words text-[13px] font-bold">
                      {orderNumber}
                    </strong>
                  </div>
                  <div>
                    <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[9px] bg-[#f3f3f3] text-[#222]">
                      <Package size={21} />
                    </div>

                    <StatusBadge status={getStatus(order)} />
                  </div>
                </div>

                <div className="mt-[19px] flex flex-wrap gap-3 border-y border-[#f0f0f0] py-3.5 min-[481px]:gap-5">
                  <div className="inline-flex items-center gap-[7px] text-[11px] text-[#737373]">
                    <CalendarDays size={16} className="shrink-0 text-[#777]" />

                    <span>
                      Placed {formatDate(order.created_at ?? order.order_date)}
                    </span>
                  </div>

                  {itemCount !== null && (
                    <div className="inline-flex items-center gap-[7px] text-[11px] text-[#737373]">
                      <ClipboardList
                        size={16}
                        className="shrink-0 text-[#777]"
                      />

                      <span>
                        {itemCount} item{Number(itemCount) === 1 ? "" : "s"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-4">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-[10px] font-semibold tracking-[0.7px] text-[#737373]">
                      ORDER TOTAL
                    </span>

                    <strong className="text-sm font-bold min-[481px]:text-base">
                      {formatPrice(getOrderTotal(order))}
                    </strong>
                  </div>

                  <Link
                    to={{
                      pathname: "/orders",
                      search: `?order_number=${encodeURIComponent(orderNumber)}`,
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-[#111] no-underline hover:underline min-[481px]:gap-[7px] min-[481px]:text-xs ${focusStyles}`}
                  >
                    View details <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#eeece8] pt-5">
        <p className="text-[11px] text-[#77746e]">
          Showing{" "}
          <span className="font-semibold text-[#292824]">
            {startOrder} – {endOrder}
          </span>
          {" of "}
          <span className="font-semibold text-[#292824]">
            {orderPagination.count}
          </span>{" "}
          orders
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!orderPagination.previous || loadingTab}
            onClick={() => setOrderPage((current) => Math.max(1, current - 1))}
            className="min-h-[36px] border border-[#e5e2dc] px-4 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span className="px-2 text-xs text-[#55524d]">
            {orderPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={!orderPagination.next || loadingTab}
            onClick={() => setOrderPage((current) => current + 1)}
            className="min-h-[36px] border border-[#876c4b] bg-[#876c4b] px-4 text-xs text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewsPanel({
  reviews = [],
  onUpdate,
  onDelete,
  updatingReviewId,
  deletingReviewId,
}) {
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");

  const startEditing = (review) => {
    setEditingReviewId(review.id);
    setEditRating(Number(review.rating));
    setEditText(review.review ?? "");
  };

  const cancelEditing = () => {
    setEditingReviewId(null);
    setEditRating(5);
    setEditText("");
  };

  const saveReview = async (reviewId) => {
    const trimmedReview = editText.trim();

    if (!trimmedReview) return;

    const success = await onUpdate(reviewId, {
      rating: editRating,
      review: trimmedReview,
    });

    if (success) {
      cancelEditing();
    }
  };

  if (!reviews.length) {
    return (
      <EmptyState
        icon={Star}
        title="No reviews yet"
        description="Once you review a delivered product, your feedback will appear here."
      >
        <Link to="/collections" className={primaryButtonStyles}>
          Explore collection <ArrowRight size={16} />
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[14px] min-[768px]:grid-cols-2">
      {reviews.map((review) => {
        const isEditing = editingReviewId === review.id;
        const isUpdating = updatingReviewId === review.id;
        const isDeleting = deletingReviewId === review.id;

        return (
          <article
            className="rounded-xl border border-[#e8e8e8] bg-white p-[14px] min-[481px]:p-[21px]"
            key={review.id}
          >
            {/* Review header */}

            <div className="flex flex-col justify-between gap-3 min-[481px]:flex-row min-[481px]:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {review.product_image ? (
                  <img
                    src={review.product_image}
                    alt={review.product_title || "Product"}
                    className="h-[76px] w-[68px] shrink-0 rounded-lg border border-[#eeeeee] bg-[#f8f8f8] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-[76px] w-[68px] shrink-0 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#aaa]">
                    <Package size={24} />
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="break-words text-sm font-bold text-[#222]">
                    {review.product_title || "Product"}
                  </h3>

                  <span className="mt-[7px] block text-[11px] text-[#737373]">
                    Reviewed on {formatDate(review.created_at)}
                  </span>

                  {review.modified_at &&
                    review.modified_at !== review.created_at && (
                      <span className="mt-1 block text-[10px] text-[#999]">
                        Last updated {formatDate(review.modified_at)}
                      </span>
                    )}
                </div>
              </div>

              {!isEditing && (
                <div
                  className="flex shrink-0 gap-[3px] text-[#d69a18]"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={16}
                      fill={
                        index < Number(review.rating) ? "currentColor" : "none"
                      }
                      strokeWidth={1.8}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Review content / edit form */}

            {isEditing ? (
              <div className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#555]">
                    Your rating
                  </label>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, index) => {
                      const rating = index + 1;

                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setEditRating(rating)}
                          className="rounded p-1 text-[#d69a18] transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
                          aria-label={`Rate ${rating} out of 5`}
                          aria-pressed={editRating === rating}
                        >
                          <Star
                            size={23}
                            fill={
                              rating <= editRating ? "currentColor" : "none"
                            }
                          />
                        </button>
                      );
                    })}

                    <span className="ml-2 text-xs font-semibold text-[#555]">
                      {editRating}/5
                    </span>
                  </div>
                </div>

                <label className="flex flex-col gap-2 text-xs font-semibold text-[#555]">
                  Your review
                  <textarea
                    value={editText}
                    onChange={(event) =>
                      setEditText(event.target.value.slice(0, 2000))
                    }
                    rows={4}
                    maxLength={2000}
                    placeholder="Write your product experience..."
                    className="w-full resize-y rounded-lg border border-[#dedede] bg-white px-3 py-3 text-[13px] font-normal leading-relaxed text-[#333] outline-none transition-colors placeholder:text-[#aaa] focus:border-[#222]"
                  />
                  <span className="text-right text-[10px] font-normal text-[#999]">
                    {editText.length}/2000 characters
                  </span>
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className={secondaryButtonStyles}
                    onClick={cancelEditing}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={primaryButtonStyles}
                    onClick={() => saveReview(review.id)}
                    disabled={
                      isUpdating ||
                      !editText.trim() ||
                      editRating < 1 ||
                      editRating > 5
                    }
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-[17px] break-words whitespace-pre-wrap text-[13px] leading-[1.8] text-[#555]">
                  {review.review}
                </p>

                {/* Review actions */}

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#f0f0f0] pt-3">
                  <button
                    type="button"
                    className={secondaryButtonStyles}
                    onClick={() => startEditing(review)}
                    disabled={isDeleting || updatingReviewId !== null}
                  >
                    <Pencil size={14} />
                    Edit review
                  </button>

                  <button
                    type="button"
                    className={`${secondaryButtonStyles} text-[#b42318]`}
                    onClick={() => onDelete(review)}
                    disabled={isDeleting || updatingReviewId !== null}
                  >
                    <Trash2 size={14} />
                    Delete review
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ProfilePanel({ user }) {
  const username = user.username ?? user.name ?? "—";

  const fields = [
    { label: "Username", value: username, icon: CircleUserRound },
    { label: "Email address", value: user.email ?? "—", icon: Mail },
    { label: "First name", value: user.first_name || "—", icon: UserRound },
    { label: "Last name", value: user.last_name || "—", icon: UserRound },
  ];

  return (
    <div className={panelStyles}>
      <div className="flex items-center gap-[15px] border-b border-[#e8e8e8] pb-6">
        <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full bg-[#171717] text-2xl font-bold text-white">
          {(username.trim().charAt(0) || "?").toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold">{username}</h3>
          <p className="mt-1.5 text-xs text-[#737373]">
            Your Aura Fashions profile
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 py-6 min-[481px]:grid-cols-2 min-[481px]:gap-6">
        {fields.map(({ label, value, icon: Icon }) => (
          <div className="flex min-w-0 flex-col gap-2.5" key={label}>
            <span className="flex items-center gap-2 text-xs text-[#737373]">
              <Icon size={16} className="shrink-0" />
              {label}
            </span>
            <strong className="break-words text-[13px] font-semibold text-[#222]">
              {value}
            </strong>
          </div>
        ))}
      </div>

      <p className="mt-2 border-t border-[#f0f0f0] pt-4 text-[11px] leading-[1.7] text-[#737373]">
        To edit your profile, connect this section to your profile update API.
      </p>
    </div>
  );
}

function AddressesPanel({
  addresses,
  showAddressForm,
  addressForm,
  editingAddressId,
  savingAddress,
  deletingAddressId,
  onAdd,
  onEdit,
  onDelete,
  onSetDefault,
  onFieldChange,
  onSave,
  onCancel,
}) {
  const inputStyles =
    "h-[43px] w-full min-w-0 rounded-[7px] border border-[#dedede] bg-white px-3 text-[13px] text-[#222] outline-none transition-colors focus:border-[#222]";

  const labelStyles =
    "flex min-w-0 flex-col gap-[7px] text-xs font-semibold text-[#555]";

  return (
    <div className="w-full">
      <div className="mb-[22px] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="mb-1 text-lg font-semibold text-[#202020]">
            Saved addresses
          </h3>
          <p className="text-[13px] text-[#888]">
            Manage your delivery addresses.
          </p>
        </div>

        {!showAddressForm && (
          <button type="button" className={primaryButtonStyles} onClick={onAdd}>
            <Plus size={17} />
            Add address
          </button>
        )}
      </div>

      {addresses.length === 0 && !showAddressForm ? (
        <EmptyState
          icon={House}
          title="No saved addresses"
          description="Add an address to make your future purchases easier."
        >
          <button type="button" className={primaryButtonStyles} onClick={onAdd}>
            <Plus size={16} />
            Add your first address
          </button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-[14px]">
          {addresses.map((address) => {
            const lines = getAddressLines(address);

            const label =
              address.address_type === "home"
                ? "Home"
                : address.address_type === "work"
                  ? "Work"
                  : address.label || "Other address";

            return (
              <article
                className="rounded-xl border border-[#e8e8e8] bg-white p-[14px] min-[481px]:p-5"
                key={address.id}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[10px] bg-[#f5f3ef] text-[#292929]">
                    <MapPin size={20} />
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <h3 className="text-[15px] font-bold capitalize text-[#222]">
                      {label}
                    </h3>

                    {address.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ee] px-2 py-1 text-[10px] font-bold text-[#18743a]">
                        <BadgeCheck size={14} />
                        Default address
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-[5px] min-[601px]:ml-[54px]">
                  {lines.map((line, index) => (
                    <p
                      className="break-words text-xs leading-[1.65] text-[#555]"
                      key={`${line}-${index}`}
                    >
                      {line}
                    </p>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-[#eee] pt-3">
                  {!address.is_default && (
                    <button
                      type="button"
                      className={secondaryButtonStyles}
                      onClick={() => onSetDefault(address)}
                    >
                      <BadgeCheck size={15} />
                      Set default
                    </button>
                  )}

                  <button
                    type="button"
                    className={secondaryButtonStyles}
                    onClick={() => onEdit(address)}
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className={`${secondaryButtonStyles} text-[#c03939]`}
                    disabled={deletingAddressId === address.id}
                    onClick={() => onDelete(address)}
                  >
                    <Trash2 size={15} />
                    {deletingAddressId === address.id
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showAddressForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingAddress) {
              onCancel();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-modal-title"
            className="my-auto flex max-h-[calc(100dvh-24px)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-[#eaeaea] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.20)] sm:max-h-[calc(100dvh-40px)]"
          >
            {/* Header */}

            <div className="flex shrink-0 items-center justify-between border-b border-[#ededed] bg-[#fcfcfb] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e9e5df] bg-white text-[#34312c]">
                  <MapPin size={19} />
                </div>

                <div>
                  <h3
                    id="address-modal-title"
                    className="text-[16px] font-bold tracking-[-0.3px] text-[#202020] sm:text-[17px]"
                  >
                    {editingAddressId
                      ? "Edit delivery address"
                      : "Add delivery address"}
                  </h3>

                  <p className="mt-0.5 text-[11px] text-[#858585] sm:text-xs">
                    Enter your details for a smooth delivery experience.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCancel}
                disabled={savingAddress}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent text-[#777] transition-all hover:border-[#e8e8e8] hover:bg-white hover:text-[#171717] disabled:opacity-50"
                aria-label="Close address modal"
              >
                <X size={19} />
              </button>
            </div>

            {/* Form body */}

            <form
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-5"
              onSubmit={onSave}
            >
              <div className="space-y-4">
                {/* Personal details - 3 columns */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelStyles}>
                    Full name *
                    <input
                      className={inputStyles}
                      name="full_name"
                      value={addressForm.full_name}
                      onChange={onFieldChange}
                      required
                      maxLength={150}
                      autoComplete="name"
                    />
                  </label>

                  <label className={labelStyles}>
                    Phone number *
                    <input
                      className={inputStyles}
                      name="phone"
                      type="tel"
                      value={addressForm.phone}
                      onChange={onFieldChange}
                      required
                      maxLength={13}
                      autoComplete="tel"
                    />
                  </label>

                  <label className={labelStyles}>
                    Country *
                    <input
                      className={inputStyles}
                      name="country"
                      value={addressForm.country}
                      onChange={onFieldChange}
                      required
                      maxLength={100}
                      autoComplete="country-name"
                    />
                  </label>
                </div>

                {/* Address lines - 2 columns */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={labelStyles}>
                    Address line 1 *
                    <textarea
                      className={`${inputStyles} min-h-[75px] resize-y`}
                      name="address_line1"
                      value={addressForm.address_line1}
                      onChange={onFieldChange}
                      required
                      maxLength={255}
                      autoComplete="address-line1"
                      rows={2}
                    />
                  </label>

                  <label className={labelStyles}>
                    Address line 2
                    <textarea
                      className={`${inputStyles} min-h-[75px] resize-y`}
                      name="address_line2"
                      value={addressForm.address_line2}
                      onChange={onFieldChange}
                      maxLength={255}
                      autoComplete="address-line2"
                      rows={2}
                    />
                  </label>
                </div>

                {/* Landmark, City, State - 3 columns */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelStyles}>
                    Landmark
                    <input
                      className={inputStyles}
                      name="landmark"
                      value={addressForm.landmark}
                      onChange={onFieldChange}
                      maxLength={150}
                    />
                  </label>

                  <label className={labelStyles}>
                    City *
                    <input
                      className={inputStyles}
                      name="city"
                      value={addressForm.city}
                      onChange={onFieldChange}
                      required
                      maxLength={100}
                      autoComplete="address-level2"
                    />
                  </label>

                  <label className={labelStyles}>
                    State *
                    <input
                      className={inputStyles}
                      name="state"
                      value={addressForm.state}
                      onChange={onFieldChange}
                      required
                      maxLength={100}
                      autoComplete="address-level1"
                    />
                  </label>
                </div>

                {/* PIN, Address type and default */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelStyles}>
                    PIN code *
                    <input
                      className={inputStyles}
                      name="postal_code"
                      type="tel"
                      value={addressForm.postal_code}
                      onChange={onFieldChange}
                      required
                      maxLength={6}
                      autoComplete="postal-code"
                    />
                  </label>

                  <label className={labelStyles}>
                    Address type
                    <select
                      className={inputStyles}
                      name="address_type"
                      value={addressForm.address_type}
                      onChange={onFieldChange}
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <div className="flex items-center pt-5">
                    <Toggle
                      name="is_default"
                      checked={Boolean(addressForm.is_default)}
                      onChange={onFieldChange}
                      label="Set as default address"
                    />
                  </div>
                </div>
              </div>

              {/* Footer actions */}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ededed] pt-4">
                <p className="text-[11px] text-[#929292]">* Required fields</p>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    className={secondaryButtonStyles}
                    onClick={onCancel}
                    disabled={savingAddress}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={primaryButtonStyles}
                    disabled={savingAddress}
                  >
                    {savingAddress
                      ? "Saving..."
                      : editingAddressId
                        ? "Update address"
                        : "Save address"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountPanel({ user, showToast }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordMethod, setPasswordMethod] = useState("current");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const inputStyles =
    "h-[44px] w-full rounded-lg border border-[#dedede] bg-white px-3.5 text-[13px] text-[#222] outline-none transition-colors placeholder:text-[#aaa] focus:border-[#222] disabled:cursor-not-allowed disabled:bg-[#f7f7f7]";

  const labelStyles = "flex flex-col gap-2 text-xs font-semibold text-[#555]";

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const resetModal = () => {
    setShowPasswordModal(false);
    setPasswordMethod("current");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);

    clearFeedback();
  };

  const switchMethod = (method) => {
    setPasswordMethod(method);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);

    clearFeedback();
  };

  const validateNewPassword = () => {
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return false;
    }

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return false;
    }

    return true;
  };

  // Change password using the current password.

  const handleChangePassword = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!validateNewPassword()) return;

    setChangingPassword(true);

    try {
      const response = await api.post("/accounts/password/change/", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      showToast(
        response?.data?.message || "Password changed successfully.",
        "success",
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);
    } catch (err) {
      showToast(getAccountErrorMessage(err), "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // Send OTP to the registered email address.

  const handleSendOtp = async () => {
    clearFeedback();
    setSendingOtp(true);

    try {
      const response = await api.post("/accounts/otp/send/", {
        email: user.email,
        purpose: "reset",
      });

      setOtp("");
      setOtpSent(true);
      setOtpVerified(false);

      showToast(
        response?.data?.message || "Verification OTP sent to your email.",
        "success",
      );
    } catch (err) {
      showToast(getAccountErrorMessage(err), "error");
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify the email OTP.

  const handleVerifyOtp = async () => {
    clearFeedback();

    if (!/^\d{6}$/.test(otp)) {
      showToast("Enter the valid 6-digit OTP sent to your email.", "error");
      return;
    }

    setVerifyingOtp(true);

    try {
      const response = await api.post("/accounts/otp/verify/", {
        email: user.email,
        otp,
        purpose: "reset",
      });

      setOtpVerified(true);

      showToast(
        response?.data?.message || "OTP verified successfully.",
        "success",
      );
    } catch (err) {
      setOtpVerified(false);
      showToast(getAccountErrorMessage(err), "error");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Reset password after OTP verification.

  const handleOtpPasswordReset = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!otpVerified) {
      showToast("Please verify your email OTP first.", "error");
      return;
    }

    if (!validateNewPassword()) return;

    setResettingPassword(true);

    try {
      const response = await api.post("/accounts/password/reset/", {
        email: user.email,
        otp,
        password: newPassword,
        confirm_password: confirmPassword,
      });

      showToast(
        response?.data?.message || "Password reset successfully.",
        "success",
      );

      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast(getAccountErrorMessage(err), "error");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <>
      {/* Account information */}

      <div className={panelStyles}>
        <div className="flex items-center gap-[13px] border-b border-[#e8e8e8] pb-[22px]">
          <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[9px] bg-[#f3f3f3] text-[#222]">
            <ShieldCheck size={21} />
          </div>

          <div className="min-w-0">
            <h3 className="text-[15px] font-bold">Account information</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#737373]">
              View your account details and manage your sign-in security.
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col gap-2 border-b border-[#f0f0f0] py-[17px] min-[481px]:flex-row min-[481px]:items-center min-[481px]:justify-between min-[481px]:gap-[18px]">
            <span className="text-xs text-[#737373]">Username</span>
            <strong className="break-words text-xs font-semibold text-[#222] min-[481px]:max-w-[65%] min-[481px]:text-right">
              {user.username ?? user.name ?? "—"}
            </strong>
          </div>

          <div className="flex flex-col gap-2 border-b border-[#f0f0f0] py-[17px] min-[481px]:flex-row min-[481px]:items-center min-[481px]:justify-between min-[481px]:gap-[18px]">
            <span className="text-xs text-[#737373]">Email address</span>
            <strong className="break-words text-xs font-semibold text-[#222] min-[481px]:max-w-[65%] min-[481px]:text-right">
              {user.email ?? "—"}
            </strong>
          </div>

          <div className="flex flex-col gap-2 py-[17px] min-[481px]:flex-row min-[481px]:items-center min-[481px]:justify-between min-[481px]:gap-[18px]">
            <span className="text-xs text-[#737373]">Account status</span>
            <strong className="inline-flex items-center gap-[5px] text-xs font-semibold text-[#18743a]">
              <BadgeCheck size={16} />
              Active session
            </strong>
          </div>
        </div>
      </div>

      {/* Password settings */}

      <div className={panelStyles}>
        <div className="flex flex-col gap-4 min-[481px]:flex-row min-[481px]:items-center min-[481px]:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[9px] bg-[#f3f3f3] text-[#222]">
              <LockKeyhole size={20} />
            </div>

            <div>
              <h3 className="text-[15px] font-bold">Password & security</h3>
              <p className="mt-1.5 text-xs text-[#737373]">
                Keep your account password secure.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={primaryButtonStyles}
            onClick={() => {
              clearFeedback();
              setShowPasswordModal(true);
            }}
          >
            <LockKeyhole size={16} />
            Change password
          </button>
        </div>
      </div>

      {/* Change password modal */}

      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-[2px] sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              resetModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            className="my-auto w-full max-w-[480px] overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.18)]"
          >
            {/* Modal header */}

            <div className="flex items-center justify-between gap-3 border-b border-[#e8e8e8] px-5 py-4 sm:px-6">
              <div>
                <h3
                  id="password-modal-title"
                  className="text-[17px] font-bold text-[#171717]"
                >
                  Change password
                </h3>
                <p className="mt-1 text-xs text-[#737373]">
                  Choose how you want to verify your account.
                </p>
              </div>

              <button
                type="button"
                onClick={resetModal}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#666] transition-colors hover:bg-[#f3f3f3] hover:text-[#111]"
                aria-label="Close password modal"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {/* Switchable options */}

              <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-[#f4f4f4] p-1">
                <button
                  type="button"
                  onClick={() => switchMethod("current")}
                  className={`flex min-h-[42px] items-center justify-center gap-2 rounded-md px-2 text-xs font-semibold transition-colors ${
                    passwordMethod === "current"
                      ? "bg-white text-[#111] shadow-sm"
                      : "text-[#666] hover:text-[#111]"
                  }`}
                >
                  <LockKeyhole size={15} />
                  Current password
                </button>

                <button
                  type="button"
                  onClick={() => switchMethod("otp")}
                  className={`flex min-h-[42px] items-center justify-center gap-2 rounded-md px-2 text-xs font-semibold transition-colors ${
                    passwordMethod === "otp"
                      ? "bg-white text-[#111] shadow-sm"
                      : "text-[#666] hover:text-[#111]"
                  }`}
                >
                  <Mail size={15} />
                  Email OTP
                </button>
              </div>

              {/* Error feedback */}

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-[#f1c7c4] bg-[#fff7f6] px-3.5 py-3 text-xs leading-relaxed text-[#9e241b]"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-[#cce8d4] bg-[#f1faf4] px-3.5 py-3 text-xs leading-relaxed text-[#18743a]"
                >
                  {message}
                </div>
              )}

              {/* Current password method */}

              {passwordMethod === "current" && (
                <form
                  onSubmit={handleChangePassword}
                  className="flex flex-col gap-4"
                >
                  <label className={labelStyles}>
                    Current password
                    <input
                      className={inputStyles}
                      type="text"
                      value={currentPassword}
                      onChange={(event) => {
                        setCurrentPassword(event.target.value);
                        clearFeedback();
                      }}
                      required
                      autoComplete="current-password"
                      placeholder="Enter current password"
                    />
                  </label>

                  <label className={labelStyles}>
                    New password
                    <input
                      className={inputStyles}
                      type="text"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        clearFeedback();
                      }}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Enter new password"
                    />
                  </label>

                  <label className={labelStyles}>
                    Confirm new password
                    <input
                      className={inputStyles}
                      type="text"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        clearFeedback();
                      }}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                    />
                  </label>

                  <button
                    type="submit"
                    className={`${primaryButtonStyles} mt-1 w-full`}
                    disabled={
                      changingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                  >
                    {changingPassword
                      ? "Updating password..."
                      : "Update password"}
                  </button>
                </form>
              )}

              {/* Email OTP method */}

              {passwordMethod === "otp" && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-lg border border-[#eee] bg-[#fafafa] p-3.5">
                    <span className="block text-[10px] font-bold tracking-[0.8px] text-[#888]">
                      REGISTERED EMAIL
                    </span>
                    <strong className="mt-1.5 block break-all text-xs text-[#222]">
                      {user.email}
                    </strong>
                  </div>

                  {!otpSent ? (
                    <button
                      type="button"
                      className={`${primaryButtonStyles} w-full`}
                      onClick={handleSendOtp}
                      disabled={sendingOtp || !user.email}
                    >
                      <Mail size={16} />
                      {sendingOtp ? "Sending OTP..." : "Send verification OTP"}
                    </button>
                  ) : (
                    <>
                      <label className={labelStyles}>
                        Six-digit OTP
                        <input
                          className={inputStyles}
                          value={otp}
                          onChange={(event) => {
                            setOtp(
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                            );
                            setOtpVerified(false);
                            clearFeedback();
                          }}
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          required
                          placeholder="Enter OTP"
                          autoComplete="one-time-code"
                        />
                      </label>

                      {!otpVerified ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className={`${primaryButtonStyles} flex-1`}
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || otp.length !== 6}
                          >
                            {verifyingOtp ? "Verifying..." : "Verify OTP"}
                          </button>

                          <button
                            type="button"
                            className="min-h-[43px] px-2 text-xs font-semibold text-[#555] underline underline-offset-4 hover:text-[#111] disabled:opacity-50"
                            onClick={handleSendOtp}
                            disabled={sendingOtp}
                          >
                            {sendingOtp ? "Sending..." : "Resend OTP"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-[#f1faf4] px-3 py-2.5 text-xs font-semibold text-[#18743a]">
                          <BadgeCheck size={17} />
                          Email verified successfully
                        </div>
                      )}

                      {otpVerified && (
                        <form
                          onSubmit={handleOtpPasswordReset}
                          className="flex flex-col gap-4 border-t border-[#eee] pt-4"
                        >
                          <label className={labelStyles}>
                            New password
                            <input
                              className={inputStyles}
                              type="password"
                              value={newPassword}
                              onChange={(event) => {
                                setNewPassword(event.target.value);
                                clearFeedback();
                              }}
                              required
                              minLength={8}
                              autoComplete="new-password"
                              placeholder="Enter new password"
                            />
                          </label>

                          <label className={labelStyles}>
                            Confirm new password
                            <input
                              className={inputStyles}
                              type="password"
                              value={confirmPassword}
                              onChange={(event) => {
                                setConfirmPassword(event.target.value);
                                clearFeedback();
                              }}
                              required
                              minLength={8}
                              autoComplete="new-password"
                              placeholder="Confirm new password"
                            />
                          </label>

                          <button
                            type="submit"
                            className={`${primaryButtonStyles} w-full`}
                            disabled={
                              resettingPassword ||
                              !newPassword ||
                              !confirmPassword
                            }
                          >
                            {resettingPassword
                              ? "Resetting password..."
                              : "Reset password"}
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
