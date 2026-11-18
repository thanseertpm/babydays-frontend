
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const RETURN_ENDPOINTS = {
  returns: "/admin/controls/returns/",

  manage: (orderNumber) =>
    `/admin/controls/returns/${encodeURIComponent(orderNumber)}/manage/`,
};

const PAGE_SIZE = 10;

const RETURN_FILTERS = [
  { label: "All Returns", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const returnStyles = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function readReturns(response) {
  const payload = response?.data?.data ?? response?.data ?? {};

  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    count: Number(payload.count ?? 0),
    statusCounts: payload.status_counts ?? {},
  };
}

export default function ReturnManagement() {
  const [returns, setReturns] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedReturn, setSelectedReturn] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadReturns = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(RETURN_ENDPOINTS.returns, {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: search.trim(),
          return_status: statusFilter,
        },
      });

      const result = readReturns(response);

      setReturns(result.results);
      setTotal(result.count);
      setStatusCounts(result.statusCounts);
    } catch (err) {
      console.error("Failed to load returns:", err);

      setReturns([]);
      setTotal(0);
      setStatusCounts({});
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  function openReturnDetails(returnOrder) {
    setSelectedReturn(returnOrder);
    setAdminNote(returnOrder.return_admin_note || "");
    setActionError("");
  }

  function closeReturnDetails() {
    if (saving) return;

    setSelectedReturn(null);
    setAdminNote("");
    setActionError("");
  }

  async function handleReturnAction(action) {
    if (!selectedReturn || saving) return;

    setSaving(true);
    setActionError("");

    try {
      const response = await api.patch(
        RETURN_ENDPOINTS.manage(selectedReturn.order_number),
        {
          action,
          return_admin_note: adminNote,
        },
      );

      const updatedReturn =
        response?.data?.data ?? response?.data;

      setSelectedReturn(updatedReturn);

      await loadReturns();

      // Close after a successful decision or receipt confirmation.
      setSelectedReturn(null);
      setAdminNote("");
    } catch (err) {
      setActionError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Return Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review customer return requests and manage returned products.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReturns}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={17} />
            {error}
          </div>

          <button type="button" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATUS CARDS */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Returns",
            value: Object.values(statusCounts).reduce(
              (sum, value) => sum + Number(value),
              0,
            ),
          },
          {
            label: "Pending",
            value: statusCounts.pending ?? 0,
          },
          {
            label: "Approved",
            value: statusCounts.approved ?? 0,
          },
          {
            label: "Rejected",
            value: statusCounts.rejected ?? 0,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* SEARCH */}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search order, customer, phone or return reason..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#8c704d]"
            />
          </div>
        </div>

        {/* FILTERS */}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {RETURN_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;

            const count =
              filter.value === "all"
                ? Object.values(statusCounts).reduce(
                    (sum, value) => sum + Number(value),
                    0,
                  )
                : Number(statusCounts[filter.value] ?? 0);

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(1);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-[#8c704d] bg-[#8c704d] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#8c704d]"
                }`}
              >
                {filter.label}

                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RETURNS TABLE */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Return Requests</h2>

          <p className="text-xs text-gray-500">
            {total} requests
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Order",
                  "Customer",
                  "Return Reason",
                  "Requested On",
                  "Return Status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <LoaderCircle
                      size={25}
                      className="mx-auto animate-spin text-[#8c704d]"
                    />
                    <p className="mt-3 text-sm text-gray-500">
                      Loading return requests...
                    </p>
                  </td>
                </tr>
              ) : returns.length ? (
                returns.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.order_number}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        ID: #{item.id}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-gray-800">
                        {item.full_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.customer?.email || "—"}
                      </p>
                    </td>

                    <td className="max-w-[230px] px-4 py-4">
                      <p className="truncate text-sm text-gray-600">
                        {item.return_reason || "No reason provided"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500">
                      {formatDate(item.return_requested_at)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          returnStyles[item.return_status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.status === "returned"
                          ? "Received"
                          : item.return_status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => openReturnDetails(item)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#e5dfd3] px-3 py-2 text-xs font-bold text-[#8c704d] hover:bg-[#f8f5ef]"
                      >
                        <Eye size={14} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-14 text-center text-sm text-gray-500"
                  >
                    No return requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[#eae8e0] px-3 py-2 text-sm text-[#555247] transition hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-40"
         >
              <ChevronLeft size={17} />Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#eae8e0] px-3 py-2 text-sm text-[#555247] transition hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-40"
         >Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* RETURN DETAILS MODAL */}

      {selectedReturn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px]">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#8c704d]">
                  RETURN REQUEST
                </p>

                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  {selectedReturn.order_number}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReturnDetails}
                disabled={saving}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* CUSTOMER */}

              <section className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-3 text-sm font-bold text-gray-900">
                  Customer Information
                </h3>

                <p className="text-sm font-semibold text-gray-800">
                  {selectedReturn.full_name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {selectedReturn.customer?.email || "—"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {selectedReturn.phone}
                </p>
              </section>

              {/* REQUEST DETAILS */}

              <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex items-center gap-2">
                  <RotateCcw size={17} className="text-amber-700" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Customer Return Reason
                  </h3>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {selectedReturn.return_reason || "No reason provided."}
                </p>

                <p className="mt-3 text-xs text-gray-500">
                  Requested on: {formatDate(selectedReturn.return_requested_at)}
                </p>
              </section>

              {/* ORDERED ITEMS */}

              <section>
                <h3 className="mb-3 text-sm font-bold text-gray-900">
                  Returned Order Items
                </h3>

                <div className="space-y-3">
                  {(selectedReturn.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                    >
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_title}
                          className="h-14 w-14 rounded-lg border border-gray-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100">
                          <Package size={20} className="text-gray-400" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {item.product_title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.variant_label || "No variant"} · Qty:{" "}
                          {item.quantity}
                        </p>
                      </div>

                      <p className="text-sm font-bold text-gray-800">
                        {money(item.line_total)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm font-semibold text-gray-600">
                    Order Total
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {money(selectedReturn.total)}
                  </span>
                </div>
              </section>

              {/* CURRENT STATUS */}

              <section className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Return Status
                </h3>

                <p className="mt-2 text-sm capitalize text-gray-600">
                  {selectedReturn.status === "returned"
                    ? "Product received and return completed"
                    : selectedReturn.return_status}
                </p>
              </section>

              {/* ADMIN NOTE */}

              <section>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Admin Note
                </label>

                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  disabled={
                    saving ||
                    selectedReturn.return_status === "rejected" ||
                    selectedReturn.status === "returned"
                  }
                  placeholder="Enter approval, rejection or inspection notes..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#8c704d] disabled:bg-gray-50"
                />
              </section>

              {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={closeReturnDetails}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600"
              >
                Close
              </button>

              <div className="flex flex-wrap gap-2">
                {selectedReturn.return_status === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleReturnAction("reject")}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleReturnAction("approve")}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      {saving ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      Approve
                    </button>
                  </>
                )}

                {selectedReturn.return_status === "approved" &&
                  selectedReturn.status !== "returned" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleReturnAction("received")}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8c704d] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#765d3e] disabled:opacity-50"
                    >
                      {saving ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <Package size={15} />
                      )}
                      Mark as Received
                    </button>
                  )}

                {selectedReturn.status === "returned" && (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
                    <CheckCircle2 size={16} />
                    Return Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
