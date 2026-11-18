import { useCallback, useEffect, useState } from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Gift,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";

import api from "../../services/api";
import Confirm from "../Confirm";
import Toast from "../Toast";

const ADMIN_ENDPOINTS = {
  coupons: "/admin/controls/coupons/",
  couponDetail: (id) => `/admin/controls/coupons/${id}/`,
};

const PAGE_SIZE = 12;

const getCouponList = (response) => {
  const data = response?.data?.data;

  return {
    results: data?.results || [],
    count: data?.count ?? 0,
    pageSize: data?.page_size ?? PAGE_SIZE,
  };
};

// Convert an ISO date into a datetime-local input value.
const toLocalDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
};

// Convert datetime-local into an ISO date for Django.
const toISODateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPrice = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

const getInitialForm = () => ({
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_amount: "0",
  max_discount: "",
  start_date: "",
  end_date: "",
  usage_limit: "",
  usage_limit_per_user: "1",
  first_order_only: false,
  is_active: true,
  is_public: true,
});

const getCouponStatus = (coupon) => {
  if (!coupon.is_active) {
    return {
      label: "Inactive",
      className: "bg-gray-100 text-gray-600",
    };
  }

  const now = Date.now();
  const start = new Date(coupon.start_date).getTime();
  const end = new Date(coupon.end_date).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return {
      label: "Invalid dates",
      className: "bg-red-50 text-red-600",
    };
  }

  if (now < start) {
    return {
      label: "Scheduled",
      className: "bg-blue-50 text-blue-700",
    };
  }

  if (now > end) {
    return {
      label: "Expired",
      className: "bg-red-50 text-red-600",
    };
  }

  return {
    label: "Active",
    className: "bg-green-50 text-green-700",
  };
};

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Search and sorting
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form
  const [form, setForm] = useState(getInitialForm);

  // Confirmation and toast
  const [selectedCoupon, setSelectedCoupon] = useState(null);
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

  // Fetch coupons
  const fetchCoupons = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get(ADMIN_ENDPOINTS.coupons, {
        params: {
          search: debouncedSearch,
          sort: sortBy,
          page,
        },
      });

      const data = getCouponList(response);

      setCoupons(data.results);
      setCount(data.count);
      setPageSize(data.pageSize);
    } catch (error) {
      setCoupons([]);
      setCount(0);

      showToast(
        error.response?.data?.message || "Failed to load coupons.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sortBy, page, showToast]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const startItem = count === 0 ? 0 : (page - 1) * pageSize + 1;

  const endItem = Math.min(page * pageSize, count);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Reset form
  const resetForm = () => {
    setForm(getInitialForm());
    setEditingId(null);
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (coupon) => {
    setEditingId(coupon.id);

    setForm({
      code: coupon.code || "",
      name: coupon.name || "",
      description: coupon.description || "",
      discount_type: coupon.discount_type || "percentage",
      discount_value: String(coupon.discount_value ?? ""),
      min_order_amount: String(coupon.min_order_amount ?? "0"),
      max_discount:
        coupon.max_discount === null || coupon.max_discount === undefined
          ? ""
          : String(coupon.max_discount),
      start_date: toLocalDateTime(coupon.start_date),
      end_date: toLocalDateTime(coupon.end_date),
      usage_limit:
        coupon.usage_limit === null || coupon.usage_limit === undefined
          ? ""
          : String(coupon.usage_limit),
      usage_limit_per_user: String(coupon.usage_limit_per_user ?? "1"),
      first_order_only: Boolean(coupon.first_order_only),
      is_active: Boolean(coupon.is_active),
      is_public: Boolean(coupon.is_public),
    });

    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    resetForm();
  };

  // Input handler
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Create or update coupon
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.code.trim()) {
      showToast("Please enter a coupon code.", "error");
      return;
    }

    if (!form.name.trim()) {
      showToast("Please enter a coupon name.", "error");
      return;
    }

    if (!form.discount_value || Number(form.discount_value) <= 0) {
      showToast("Discount value must be greater than zero.", "error");
      return;
    }

    if (
      form.discount_type === "percentage" &&
      Number(form.discount_value) > 100
    ) {
      showToast("Percentage discount cannot exceed 100%.", "error");
      return;
    }

    if (!form.start_date || !form.end_date) {
      showToast("Please select the coupon validity period.", "error");
      return;
    }

    const startDate = new Date(form.start_date);
    const endDate = new Date(form.end_date);

    if (endDate <= startDate) {
      showToast("End date must be after the start date.", "error");
      return;
    }

    if (Number(form.min_order_amount) < 0) {
      showToast("Minimum order amount cannot be negative.", "error");
      return;
    }

    if (form.max_discount && Number(form.max_discount) <= 0) {
      showToast("Maximum discount must be greater than zero.", "error");
      return;
    }

    if (
      form.usage_limit &&
      (!Number.isInteger(Number(form.usage_limit)) ||
        Number(form.usage_limit) < 1)
    ) {
      showToast("Usage limit must be at least 1.", "error");
      return;
    }

    if (
      !Number.isInteger(Number(form.usage_limit_per_user)) ||
      Number(form.usage_limit_per_user) < 1
    ) {
      showToast("Per-user usage limit must be at least 1.", "error");
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount || 0),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      start_date: toISODateTime(form.start_date),
      end_date: toISODateTime(form.end_date),
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      usage_limit_per_user: Number(form.usage_limit_per_user),
      first_order_only: form.first_order_only,
      is_active: form.is_active,
      is_public: form.is_public,
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(ADMIN_ENDPOINTS.couponDetail(editingId), payload);

        showToast("Coupon updated successfully.");
      } else {
        await api.post(ADMIN_ENDPOINTS.coupons, payload);

        showToast("Coupon created successfully.");
      }

      const wasEditing = Boolean(editingId);

      setShowModal(false);
      resetForm();

      if (!wasEditing && page !== 1) {
        setPage(1);
      } else {
        await fetchCoupons();
      }
    } catch (error) {
      const errorData = error.response?.data;

      const errors = errorData?.data;

      const message =
        errorData?.message ||
        errors?.code?.[0] ||
        errors?.name?.[0] ||
        errors?.discount_value?.[0] ||
        errors?.start_date?.[0] ||
        errors?.end_date?.[0] ||
        "Failed to save coupon.";

      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (coupon) => {
    setTogglingId(coupon.id);

    try {
      await api.patch(ADMIN_ENDPOINTS.couponDetail(coupon.id), {
        is_active: !coupon.is_active,
      });

      showToast(
        coupon.is_active
          ? "Coupon deactivated successfully."
          : "Coupon activated successfully.",
      );

      await fetchCoupons();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to update coupon status.",
        "error",
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Delete confirmation
  const handleDelete = (coupon) => {
    setSelectedCoupon(coupon);
  };

  const cancelDelete = () => {
    if (deletingId !== null) return;

    setSelectedCoupon(null);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedCoupon) return;

    const couponId = selectedCoupon.id;

    setDeletingId(couponId);

    try {
      await api.delete(ADMIN_ENDPOINTS.couponDetail(couponId));

      setSelectedCoupon(null);

      showToast("Coupon deleted successfully.");

      if (coupons.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchCoupons();
      }
    } catch (error) {
      showToast(
        error.response?.data?.message ||
          "Unable to delete this coupon. Used coupons cannot be deleted.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Copy coupon code
  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast("Coupon code copied.");
    } catch {
      showToast("Unable to copy coupon code.", "error");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Coupon Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your store discount coupons.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          <Plus size={18} />
          Add Coupon
        </button>
      </div>

      {/* Search and sorting */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search coupon code or name..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            className="w-full appearance-none min-w-[210px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100 sm:w-auto"
          >
            <option value="created_desc">Created Date (Newest)</option>
            <option value="created_asc">Created Date (Oldest)</option>
            <option value="code_asc">Coupon Code (A - Z)</option>
            <option value="code_desc">Coupon Code (Z - A)</option>
            <option value="name_asc">Coupon Name (A - Z)</option>
            <option value="name_desc">Coupon Name (Z - A)</option>
            <option value="discount_asc">Discount (Low to High)</option>
            <option value="discount_desc">Discount (High to Low)</option>
            <option value="id_asc">ID (Low to High)</option>
            <option value="id_desc">ID (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Coupon list */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900">Coupons</h2>

          <p className="text-xs text-gray-500">
            Showing {startItem} - {endItem} of {count} coupons
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <LoaderCircle size={22} className="animate-spin" />
              Loading coupons...
            </div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-2xl bg-gray-100 p-5">
              <Gift size={34} className="text-gray-400" />
            </div>

            <h3 className="text-base font-semibold text-gray-800">
              {search ? "No coupons found" : "No coupons available"}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-gray-500">
              {search
                ? "Try searching with a different coupon code or name."
                : "Create your first coupon to offer discounts to customers."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
              >
                <Plus size={17} />
                Add Coupon
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Coupon cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {coupons.map((coupon) => {
                const couponStatus = getCouponStatus(coupon);

                const discountLabel =
                  coupon.discount_type === "percentage"
                    ? `${Number(coupon.discount_value)}% OFF`
                    : `${formatPrice(coupon.discount_value)} OFF`;

                const totalUsed = Number(coupon.total_used || 0);

                const usageLimit =
                  coupon.usage_limit === null ||
                  coupon.usage_limit === undefined
                    ? null
                    : Number(coupon.usage_limit);

                const remainingUses =
                  coupon.remaining_uses === null ||
                  coupon.remaining_uses === undefined
                    ? null
                    : Number(coupon.remaining_uses);

                return (
                  <div
                    key={coupon.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-md"
                  >
                    {/* Card header */}
                    <div className="border-b border-dashed border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Tag size={16} className="shrink-0 text-gray-500" />
                            <h3 className="truncate text-base font-bold tracking-wide text-gray-900">
                              {coupon.code}
                            </h3>
                          </div>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {coupon.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => copyCode(coupon.code)}
                          className="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                          title="Copy coupon code"
                        >
                          <Copy size={15} />
                        </button>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-2xl font-extrabold text-gray-900">
                            {discountLabel}
                          </p>

                          {coupon.discount_type === "percentage" &&
                            coupon.max_discount && (
                              <p className="mt-1 text-xs text-gray-500">
                                Maximum discount:{" "}
                                {formatPrice(coupon.max_discount)}
                              </p>
                            )}
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${couponStatus.className}`}
                        >
                          {couponStatus.label}
                        </span>
                      </div>
                    </div>

                    {/* Card details */}
                    <div className="space-y-3 p-4">
                      {coupon.description && (
                        <p className="line-clamp-2 text-sm text-gray-600">
                          {coupon.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-500">Minimum order</span>
                        <span className="font-semibold text-gray-800">
                          {formatPrice(coupon.min_order_amount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-500">Total usage</span>
                        <span className="font-semibold text-gray-800">
                          {totalUsed}
                          {usageLimit !== null
                            ? ` / ${usageLimit}`
                            : " / Unlimited"}
                        </span>
                      </div>

                      {usageLimit !== null && (
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-gray-500">Remaining uses</span>
                          <span className="font-semibold text-gray-800">
                            {remainingUses ?? 0}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-500">Per customer</span>
                        <span className="font-semibold text-gray-800">
                          {coupon.usage_limit_per_user} use(s)
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-500">First order only</span>
                        <span className="font-semibold text-gray-800">
                          {coupon.first_order_only ? "Yes" : "No"}
                        </span>
                      </div>

                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <div className="flex items-start gap-2 text-xs text-gray-500">
                          <CalendarDays size={15} className="mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-700">Starts</p>
                            <p>{formatDate(coupon.start_date)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-xs text-gray-500">
                          <Clock size={15} className="mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-700">Ends</p>
                            <p>{formatDate(coupon.end_date)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Visibility */}
                      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {coupon.is_public ? "Public" : "Private"}
                        </span>

                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {coupon.is_active ? "Enabled" : "Disabled"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 border-t border-gray-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(coupon)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={togglingId === coupon.id}
                          onClick={() => handleToggleStatus(coupon)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          {togglingId === coupon.id ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : coupon.is_active ? (
                            <ToggleRight size={17} />
                          ) : (
                            <ToggleLeft size={17} />
                          )}

                          {coupon.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(coupon)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-100 px-3 py-2.5 text-red-600 transition hover:bg-red-50"
                          title="Delete coupon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {totalUsed > 0 && (
                        <p className="text-[11px] text-amber-700">
                          This coupon has usage history and cannot be deleted.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-7 flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Coupon" : "Create Coupon"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingId
                    ? "Update your coupon settings."
                    : "Configure a new discount coupon for your store."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
                {/* Basic details */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Coupon Code *
                      </label>

                      <input
                        type="text"
                        name="code"
                        value={form.code}
                        onChange={handleChange}
                        placeholder="e.g. SAVE10"
                        maxLength={50}
                        autoCapitalize="characters"
                        required
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Coupon Name *
                      </label>

                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Festival Discount"
                        maxLength={150}
                        required
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Describe this coupon..."
                      className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                    />
                  </div>
                </section>

                {/* Discount */}
                <section className="space-y-4 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900">
                    Discount Configuration
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Discount Type *
                      </label>

                      <select
                        name="discount_type"
                        value={form.discount_type}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Discount Value *
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          name="discount_value"
                          value={form.discount_value}
                          onChange={handleChange}
                          min="0.01"
                          max={
                            form.discount_type === "percentage"
                              ? "100"
                              : undefined
                          }
                          step="0.01"
                          placeholder="Enter discount"
                          required
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                          {form.discount_type === "percentage" ? "%" : "₹"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Minimum Order Amount (₹)
                      </label>

                      <input
                        type="number"
                        name="min_order_amount"
                        value={form.min_order_amount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>

                    {form.discount_type === "percentage" && (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Maximum Discount (₹)
                        </label>

                        <input
                          type="number"
                          name="max_discount"
                          value={form.max_discount}
                          onChange={handleChange}
                          min="0.01"
                          step="0.01"
                          placeholder="Leave empty for no limit"
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* Validity */}
                <section className="space-y-4 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900">
                    Coupon Validity
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Start Date & Time *
                      </label>

                      <input
                        type="datetime-local"
                        name="start_date"
                        value={form.start_date}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        End Date & Time *
                      </label>

                      <input
                        type="datetime-local"
                        name="end_date"
                        value={form.end_date}
                        onChange={handleChange}
                        min={form.start_date || undefined}
                        required
                        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Usage limits */}
                <section className="space-y-4 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900">
                    Usage Restrictions
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Total Usage Limit
                      </label>

                      <input
                        type="number"
                        name="usage_limit"
                        value={form.usage_limit}
                        onChange={handleChange}
                        min="1"
                        step="1"
                        placeholder="Unlimited"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />

                      <p className="mt-1 text-xs text-gray-400">
                        Leave empty for unlimited total usage.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Usage Limit Per Customer *
                      </label>

                      <input
                        type="number"
                        name="usage_limit_per_user"
                        value={form.usage_limit_per_user}
                        onChange={handleChange}
                        min="1"
                        step="1"
                        required
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
                    <input
                      type="checkbox"
                      name="first_order_only"
                      checked={form.first_order_only}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 accent-gray-900"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-gray-800">
                        First order only
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Allow only customers placing their first order to use
                        this coupon.
                      </span>
                    </span>
                  </label>
                </section>

                {/* Status and visibility */}
                <section className="space-y-4 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-bold text-gray-900">
                    Status & Visibility
                  </h3>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 accent-gray-900"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-gray-800">
                        Active Coupon
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Enable or disable coupon redemption.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
                    <input
                      type="checkbox"
                      name="is_public"
                      checked={form.is_public}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 accent-gray-900"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-gray-800">
                        Public Coupon
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Make this coupon available in public coupon listings.
                      </span>
                    </span>
                  </label>
                </section>
              </div>

              {/* Modal footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingId ? "Update Coupon" : "Create Coupon"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <Confirm
        open={Boolean(selectedCoupon)}
        title="Delete Coupon"
        message={
          selectedCoupon
            ? `Are you sure you want to delete "${selectedCoupon.code}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete Coupon"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={deletingId !== null}
        danger={true}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default CouponManagement;
