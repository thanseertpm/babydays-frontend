import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  FolderKanban,
  IndianRupee,
  Package,
  PackageX,
  ShoppingBag,
  RefreshCw,
  Users,
} from "lucide-react";

import api, { refreshCSRFToken } from "../../services/api";

// Dashboard API endpoints
const DASHBOARD_ENDPOINTS = {
  categories: "/admin/controls/categories/",
  products: "/admin/controls/products/",
  users: "/admin/controls/users/",
  orders: "/admin/controls/orders/",
  analytics: "/admin/controls/analytics/",
};

// Extract paginated or wrapped API responses
const unwrapResponse = (response) => {
  const body = response?.data;
  const data = body?.data ?? body;

  return {
    results: Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [],
    count: data?.count ?? body?.count ?? null,
    data,
  };
};

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    activeProducts: 0,
    users: 0,
    orders: 0,
    revenue: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

const fetchDashboardData = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const results = await Promise.allSettled([
      api.get(DASHBOARD_ENDPOINTS.categories),
      api.get(DASHBOARD_ENDPOINTS.products),
      api.get(DASHBOARD_ENDPOINTS.users),
      api.get(DASHBOARD_ENDPOINTS.orders),
      api.get(DASHBOARD_ENDPOINTS.analytics, {
        params: { period: "all" },
      }),
    ]);

    const [
      categoriesResult,
      productsResult,
      usersResult,
      ordersResult,
      analyticsResult,
    ] = results;

    const categories =
      categoriesResult.status === "fulfilled"
        ? unwrapResponse(categoriesResult.value)
        : { results: [], count: null };

    const products =
      productsResult.status === "fulfilled"
        ? unwrapResponse(productsResult.value)
        : { results: [], count: null };

    const users =
      usersResult.status === "fulfilled"
        ? unwrapResponse(usersResult.value)
        : { results: [], count: null };

    const orders =
      ordersResult.status === "fulfilled"
        ? unwrapResponse(ordersResult.value)
        : { results: [], count: null };

    const analytics =
      analyticsResult.status === "fulfilled"
        ? unwrapResponse(analyticsResult.value)
        : { data: null };

    const paidRevenue = analytics.data?.summary?.paid_revenue ?? null;

    setStats({
      categories: categories.count ?? categories.results.length,
      products: products.count ?? products.results.length,
      activeProducts: products.results.filter(
        (product) => product.is_active
      ).length,
      users: users.count ?? users.results.length,
      orders: orders.count ?? orders.results.length,
      revenue: paidRevenue,
    });

    if (results.every((result) => result.status === "rejected")) {
      setError(
        "Unable to load dashboard data. Please check your API endpoints."
      );
    }
  } catch (err) {
    setError("Something went wrong while loading dashboard data.");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const dashboardCards = [
    {
      title: "Total Categories",
      value: stats.categories,
      icon: FolderKanban,
      page: "categories",
    },
    {
      title: "Total Products",
      value: stats.products,
      icon: Package,
      page: "products",
    },
    {
      title: "Active Products",
      value: stats.activeProducts,
      icon: ShoppingBag,
      page: "products",
    },
    {
      title: "Total Users",
      value: stats.users,
      icon: Users,
      page: "users",
    },
    {
      title: "Total Orders",
      value: stats.orders,
      icon: ShoppingBag,
      page: "orders",
    },
    {
      title: "Total Revenue",
      value:
        stats.revenue !== null
          ? `₹${Number(stats.revenue).toLocaleString("en-IN")}`
          : "—",
      icon: IndianRupee,
      page: "analytics",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
        </div>

        <button
  type="button"
  onClick={fetchDashboardData}
  disabled={loading}
  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
>
  <RefreshCw
    size={16}
    className={loading ? "animate-spin" : ""}
  />
  {loading ? "Refreshing..." : "Refresh"}
</button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.title}
              type="button"
              onClick={() => onNavigate?.(card.page)}
              className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-gray-100 p-3">
                  <Icon size={22} className="text-gray-700" />
                </div>

                <ArrowUpRight size={18} className="text-gray-400" />
              </div>

              <p className="mt-5 text-sm font-medium text-gray-500">
                {card.title}
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {loading ? "..." : card.value}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}