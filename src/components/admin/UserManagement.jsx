import { useCallback, useEffect, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Search,
  ShieldBan,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

import Confirm from "../Confirm";
import Toast from "../Toast";
import api, { refreshCSRFToken } from "../../services/api";

// API endpoints
const ADMIN_ENDPOINTS = {
  users: "/admin/controls/users/",
  blockUser: (id) => `/admin/controls/users/${id}/block/`,
};

const DEFAULT_PAGE_SIZE = 10;

// Extract users from API response.
const getUsersFromResponse = (response) => {
  return response?.data?.data?.results || [];
};

// Statistics card
const StatCard = ({ title, value, icon: Icon, description }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="mt-2 text-2xl font-semibold text-gray-900">{value}</h3>
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      </div>

      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100">
        <Icon size={21} className="text-gray-600" />
      </div>
    </div>
  </div>
);

const UserManagement = () => {
  // Users returned by the current backend page.
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  // Backend search.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Backend status filter.
  const [statusFilter, setStatusFilter] = useState("all");

  // Frontend sorting (default: newest joined first).
  const [sortBy, setSortBy] = useState("joined_desc");

  // Backend pagination.
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Global statistics returned by backend.
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    blocked: 0,
  });

  // Refresh after block/unblock.
  const [refreshKey, setRefreshKey] = useState(0);

  // Confirmation.
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Toast.
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

  // Debounce search to avoid an API request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users using backend search, status filtering and pagination.
  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      setLoading(true);

      try {
        const response = await api.get(ADMIN_ENDPOINTS.users, {
          params: {
            search: debouncedSearch,
            status: statusFilter,
            sort: sortBy,
            page,
          },
          signal: controller.signal,
        });

        const data = response?.data?.data;

        setUsers(getUsersFromResponse(response));

        setTotalCount(data?.count ?? 0);

        setPageSize(data?.page_size ?? DEFAULT_PAGE_SIZE);

        setStats({
          total: data?.status_counts?.total ?? 0,
          active: data?.status_counts?.active ?? 0,
          blocked: data?.status_counts?.blocked ?? 0,
        });
      } catch (error) {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          return;
        }

        setUsers([]);
        setTotalCount(0);

        showToast(
          error.response?.data?.message || "Failed to load users.",
          "error",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, statusFilter, sortBy, page, refreshKey, showToast]);

  // Total pages are calculated using backend pagination metadata.
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Sort users on the frontend.
  const sortedUsers = [...users].sort((a, b) => {
    switch (sortBy) {
      case "username_asc":
        return (a.username || "").localeCompare(b.username || "", undefined, {
          sensitivity: "base",
        });

      case "username_desc":
        return (b.username || "").localeCompare(a.username || "", undefined, {
          sensitivity: "base",
        });

      case "id_asc":
        return Number(a.id) - Number(b.id);

      case "id_desc":
        return Number(b.id) - Number(a.id);

      case "joined_asc":
        return (
          new Date(a.date_joined).getTime() - new Date(b.date_joined).getTime()
        );

      case "joined_desc":
      default:
        return (
          new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime()
        );
    }
  });

  // Display range.
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;

  const endItem = Math.min(page * pageSize, totalCount);

  // Change status filter.
  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Open confirmation.
  const toggleUserStatus = (user) => {
    setSelectedUser(user);
  };

  const cancelAction = () => {
    if (actionLoading) return;

    setSelectedUser(null);
  };

  // Block / unblock user.
  const confirmUserStatus = async () => {
    if (!selectedUser || actionLoading) return;

    const user = selectedUser;
    const isCurrentlyActive = user.is_active;

    setActionLoading(true);

    try {
      await api.patch(ADMIN_ENDPOINTS.blockUser(user.id), {
        is_blocked: isCurrentlyActive,
      });

      setSelectedUser(null);

      showToast(
        `${user.username} has been ${
          isCurrentlyActive ? "blocked" : "unblocked"
        } successfully.`,
        "success",
      );

      // If filtering by status, return to page one because
      // the current page may no longer contain any results.
      if (statusFilter !== "all") {
        setPage(1);
      }

      // Fetch updated backend data and statistics.
      setRefreshKey((current) => current + 1);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Unable to update user status.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          description="All registered users"
        />

        <StatCard
          title="Active Users"
          value={stats.active}
          icon={UserCheck}
          description="Currently active accounts"
        />

        <StatCard
          title="Blocked Users"
          value={stats.blocked}
          icon={UserX}
          description="Currently blocked accounts"
        />
      </div>

      {/* Search and filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search username, email or ID..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* Status filter */}
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Status filter */}
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => handleStatusFilter(event.target.value)}
              className="w-max appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            >
              <option value="all">All Users</option>
              <option value="active">Active Users</option>
              <option value="blocked">Blocked Users</option>
            </select>

            {/* Sort filter */}
            {/* Sort filter */}
            <select
              id="sortUsers"
              value={sortBy}
              onChange={(event) => handleSortChange(event.target.value)}
              className="appearance-none w-full min-w-[190px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 sm:w-auto"
            >
              <option value="joined_desc">Joined Date (Newest First)</option>

              <option value="joined_asc">Joined Date (Oldest First)</option>

              <option value="username_asc">Alphabetical (A - Z)</option>

              <option value="username_desc">Alphabetical (Z - A)</option>

              <option value="id_asc">ID (Low to High)</option>

              <option value="id_desc">ID (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* User table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-1 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900">Registered Users</h2>

          <p className="text-xs text-gray-500">
            Showing {startItem} - {endItem} of {totalCount} users
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  User ID
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Username
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Joined Date
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-sm text-gray-500"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center">
                    <Users size={30} className="mx-auto mb-2 text-gray-300" />

                    <p className="text-sm font-medium text-gray-600">
                      No users found
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Try changing your search or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm text-gray-600">
                      #{user.id}
                    </td>
                    {/* Username */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold uppercase text-gray-600">
                          {user.username?.charAt(0) || "U"}
                        </div>

                        <span className="text-sm font-medium text-gray-900">
                          {user.username}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={15} className="shrink-0 text-gray-400" />
                        {user.email}
                      </div>
                    </td>

                    {/* Joined date */}
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {user.date_joined
                        ? new Date(user.date_joined).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          user.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.is_active ? "bg-green-500" : "bg-red-500"
                          }`}
                        />

                        {user.is_active ? "Active" : "Blocked"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(user)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                          user.is_active
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {user.is_active ? (
                          <>
                            <ShieldBan size={15} />
                            Block
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={15} />
                            Unblock
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Backend pagination */}
        {!loading && totalCount > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Block / unblock confirmation */}
      <Confirm
        open={Boolean(selectedUser)}
        title={selectedUser?.is_active ? "Block User" : "Unblock User"}
        message={
          selectedUser
            ? `Are you sure you want to ${
                selectedUser.is_active ? "block" : "unblock"
              } ${selectedUser.username}?`
            : ""
        }
        confirmText={selectedUser?.is_active ? "Block User" : "Unblock User"}
        onConfirm={confirmUserStatus}
        onCancel={cancelAction}
        loading={actionLoading}
        danger={Boolean(selectedUser?.is_active)}
      />

      {/* Toast notification */}
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

export default UserManagement;
