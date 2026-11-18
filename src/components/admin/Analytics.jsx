import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChartColumnIncreasing,
  Download,
  IndianRupee,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../../services/api";

const ANALYTICS_ENDPOINT = "/admin/controls/analytics/";

const PERIODS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" },
  { label: "This year", value: "year" },
  { label: "Custom", value: "custom" },
];

const CHART_COLORS = [
  "#1f2937", // slate-800
  "#0d9488", // teal-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#dc2626", // red-600
  "#2563eb", // blue-600
  "#65a30d", // lime-600
  "#db2777", // pink-600
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatCompactMoney = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0))}`;

const formatDate = (value, grouping = "daily") => {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  if (grouping === "yearly") {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
    }).format(date);
  }

  if (grouping === "monthly") {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
};

const downloadCSV = (filename, rows) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCSV = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCSV(row[header])).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold text-gray-900">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>

        <div className="rounded-lg bg-gray-100 p-3">
          <Icon size={21} className="text-gray-700" />
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children, action }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message = "No data available for this period." }) {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-gray-200 px-4 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

function BreakdownList({ items, nameKey, amountKey, countKey }) {
  if (!items?.length) return <EmptyState />;

  const maximum = Math.max(
    ...items.map((item) => Number(item[countKey] || 0)),
    1
  );

  return (
    <div className="space-y-5">
      {items.map((item) => {
        const count = Number(item[countKey] || 0);
        const percentage = (count / maximum) * 100;

        return (
          <div key={item[nameKey]}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium capitalize text-gray-700">
                {item[nameKey]?.replaceAll("_", " ")}
              </span>
              <span className="text-right text-gray-600">
                {formatNumber(count)}
                {amountKey ? ` · ${formatMoney(item[amountKey])}` : ""}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-700 transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Chart helpers ---------- */

function ChartTooltip({ active, payload, label, labelFormatter, rows }) {
  if (!active || !payload?.length) return null;

  const heading = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      {heading && (
        <p className="mb-1 font-semibold capitalize text-gray-800">
          {heading}
        </p>
      )}
      {payload.map((entry) => {
        const row = rows?.[entry.dataKey] || {};
        return (
          <p
            key={entry.dataKey}
            className="flex items-center gap-2 text-gray-600"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.stroke }}
            />
            {row.label || entry.name}:{" "}
            <span className="font-medium text-gray-900">
              {row.format ? row.format(entry.value) : entry.value}
            </span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * Donut chart with a custom legend.
 * data: [{ name, value, amount? }]
 */
function DonutChart({ data, valueLabel = "Orders", amountLabel, centerLabel }) {
  const cleaned = (data || []).filter((item) => Number(item.value) > 0);

  if (!cleaned.length) return <EmptyState />;

  const total = cleaned.reduce((sum, item) => sum + Number(item.value), 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={cleaned}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="95%"
              paddingAngle={cleaned.length > 1 ? 2 : 0}
              stroke="none"
            >
              {cleaned.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-semibold capitalize text-gray-800">
                      {point.name}
                    </p>
                    <p className="text-gray-600">
                      {valueLabel}:{" "}
                      <span className="font-medium text-gray-900">
                        {formatNumber(point.value)} (
                        {((point.value / total) * 100).toFixed(1)}%)
                      </span>
                    </p>
                    {amountLabel && (
                      <p className="text-gray-600">
                        {amountLabel}:{" "}
                        <span className="font-medium text-gray-900">
                          {formatMoney(point.amount)}
                        </span>
                      </p>
                    )}
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">
            {formatNumber(total)}
          </span>
          <span className="text-xs text-gray-500">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2">
        {cleaned.map((item, index) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <span className="truncate capitalize text-gray-700">
                {item.name}
              </span>
            </span>
            <span className="shrink-0 text-right text-gray-600">
              {formatNumber(item.value)}
              <span className="ml-1 text-xs text-gray-400">
                ({((item.value / total) * 100).toFixed(0)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    if (period === "custom" && (!startDate || !endDate)) {
      setError("Please select both a start date and an end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params =
        period === "custom"
          ? {
              period,
              start_date: startDate,
              end_date: endDate,
            }
          : { period };

      const response = await api.get(ANALYTICS_ENDPOINT, { params });

      const data = response?.data?.data;

      if (!response?.data?.success || !data) {
        throw new Error(
          response?.data?.message || "Unable to load analytics."
        );
      }

      setAnalytics(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load analytics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    if (period !== "custom") {
      fetchAnalytics();
    }
  }, [period, fetchAnalytics]);

  const summary = analytics?.summary;
  const trend = analytics?.revenue_trend || [];
  const grouping = analytics?.date_range?.grouping || "daily";

  const maximumSales = useMemo(
    () =>
      Math.max(
        ...trend.map((item) => Number(item.sales || 0)),
        1
      ),
    [trend]
  );

  /* ---------- Chart datasets ---------- */

  const trendChartData = useMemo(
    () =>
      trend.map((item) => ({
        date: item.date,
        sales: Number(item.sales || 0),
        paid_revenue: Number(item.paid_revenue || 0),
        orders: Number(item.orders || 0),
      })),
    [trend]
  );

  const salesOverviewData = useMemo(
    () => [
      { name: "Delivered", value: Number(summary?.delivered_sales || 0) },
      { name: "Pending", value: Number(summary?.pending_sales || 0) },
      { name: "Cancelled", value: Number(summary?.cancelled_sales || 0) },
      { name: "Returned", value: Number(summary?.returned_sales || 0) },
    ],
    [summary]
  );

  const statusChartData = useMemo(
    () =>
      (analytics?.status_breakdown || []).map((item) => ({
        name: String(item.label ?? "").replaceAll("_", " "),
        value: Number(item.count || 0),
        amount: Number(item.sales || 0),
      })),
    [analytics]
  );

  const paymentMethodChartData = useMemo(
    () =>
      (analytics?.payment_methods || []).map((item) => ({
        name: String(item.label ?? "").replaceAll("_", " "),
        value: Number(item.count || 0),
        amount: Number(item.sales || 0),
      })),
    [analytics]
  );

  const paymentStatusChartData = useMemo(
    () =>
      (analytics?.payment_statuses || []).map((item) => ({
        name: String(item.label ?? "").replaceAll("_", " "),
        value: Number(item.count || 0),
        amount: Number(item.sales || 0),
      })),
    [analytics]
  );

  const topProductsChartData = useMemo(
    () =>
      (analytics?.top_products || []).map((item) => ({
        name: item.product_title,
        quantity_sold: Number(item.quantity_sold || 0),
        sales: Number(item.sales || 0),
      })),
    [analytics]
  );

  const exportAnalytics = () => {
    if (!analytics) return;

    setExporting(true);

    try {
      const rows = [
        {
          section: "Summary",
          metric: "Total Orders",
          value: summary?.total_orders ?? 0,
        },
        {
          section: "Summary",
          metric: "Delivered Orders",
          value: summary?.delivered_orders ?? 0,
        },
        {
          section: "Summary",
          metric: "Delivered Sales",
          value: summary?.delivered_sales ?? 0,
        },
        {
          section: "Summary",
          metric: "Paid Revenue",
          value: summary?.paid_revenue ?? 0,
        },
        {
          section: "Summary",
          metric: "Pending Sales",
          value: summary?.pending_sales ?? 0,
        },
        {
          section: "Summary",
          metric: "Cancelled Sales",
          value: summary?.cancelled_sales ?? 0,
        },
        {
          section: "Summary",
          metric: "Returned Sales",
          value: summary?.returned_sales ?? 0,
        },
        {
          section: "Summary",
          metric: "Average Order Value",
          value: summary?.average_order_value ?? 0,
        },
        ...trend.map((item) => ({
          section: "Revenue Trend",
          metric: item.date,
          value: item.sales,
          paid_revenue: item.paid_revenue,
          orders: item.orders,
        })),
        ...(analytics.top_products || []).map((item) => ({
          section: "Top Products",
          metric: item.product_title,
          quantity_sold: item.quantity_sold,
          sales: item.sales,
        })),
      ];

      downloadCSV("aura-store-analytics.csv", rows);
    } finally {
      setExporting(false);
    }
  };

  const cards = [
    {
      title: "Delivered Sales",
      value: formatMoney(summary?.delivered_sales),
      description: `${formatNumber(summary?.delivered_orders)} delivered orders`,
      icon: IndianRupee,
    },
    {
      title: "Paid Revenue",
      value: formatMoney(summary?.paid_revenue),
      description: "Delivered orders marked as paid",
      icon: Wallet,
    },
    {
      title: "Pending Sales",
      value: formatMoney(summary?.pending_sales),
      description: "Placed and shipped orders",
      icon: Truck,
    },
    {
      title: "Total Orders",
      value: formatNumber(summary?.total_orders),
      description: "Orders created in selected period",
      icon: ShoppingBag,
    },
    {
      title: "Cancelled Sales",
      value: formatMoney(summary?.cancelled_sales),
      description: "Cancelled orders",
      icon: XCircle,
    },
    {
      title: "Returned Sales",
      value: formatMoney(summary?.returned_sales),
      description: "Orders marked as returned",
      icon: Package,
    },
    {
      title: "Average Order Value",
      value: formatMoney(summary?.average_order_value),
      description: "Average value of all orders",
      icon: TrendingUp,
    },
    {
      title: "Return Requests",
      value: formatNumber(summary?.return_requested_orders),
      description: "Awaiting or undergoing return processing",
      icon: Activity,
    },
  ];

  const dateLabel =
    analytics?.date_range?.start_date && analytics?.date_range?.end_date
      ? `${analytics.date_range.start_date} to ${analytics.date_range.end_date}`
      : "";

  const trendLabelFormatter = (label) => formatDate(label, grouping);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sales, orders, payments, and product performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading || (period === "custom" && (!startDate || !endDate))}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportAnalytics}
            disabled={!analytics || loading || exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CalendarDays size={17} />
          Date range
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                period === item.value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              Start date
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-gray-800 outline-none focus:border-gray-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-600">
              End date
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-gray-800 outline-none focus:border-gray-500"
              />
            </label>

            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={!startDate || !endDate || loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Apply dates
            </button>
          </div>
        )}

        {dateLabel && (
          <p className="mt-3 text-xs text-gray-500">
            Showing data from {dateLabel}
          </p>
        )}
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading && !analytics ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          <RefreshCw size={22} className="mx-auto mb-3 animate-spin" />
          Loading analytics...
        </div>
      ) : analytics ? (
        <>
          {/* Summary cards */}
          <div>
            <h2 className="mb-3 font-semibold text-gray-800">
              Business overview
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </div>
          </div>

          {/* Revenue trend */}
          <Section
            title="Delivered sales trend"
            description={`Sales grouped by ${grouping} using the order creation date.`}
          >
            {trend.length ? (
              <div className="space-y-6">
                {/* Area chart: sales vs paid revenue */}
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    Delivered sales vs paid revenue
                  </p>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trendChartData}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="salesFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#1f2937"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#1f2937"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="paidFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#0d9488"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#0d9488"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={trendLabelFormatter}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e5e7eb" }}
                          minTickGap={24}
                        />
                        <YAxis
                          tickFormatter={formatCompactMoney}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={false}
                          width={64}
                        />
                        <Tooltip
                          content={
                            <ChartTooltip
                              labelFormatter={trendLabelFormatter}
                              rows={{
                                sales: {
                                  label: "Delivered sales",
                                  format: formatMoney,
                                },
                                paid_revenue: {
                                  label: "Paid revenue",
                                  format: formatMoney,
                                },
                              }}
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          name="Delivered sales"
                          stroke="#1f2937"
                          strokeWidth={2}
                          fill="url(#salesFill)"
                        />
                        <Area
                          type="monotone"
                          dataKey="paid_revenue"
                          name="Paid revenue"
                          stroke="#0d9488"
                          strokeWidth={2}
                          fill="url(#paidFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-800" />
                      Delivered sales
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                      Paid revenue
                    </span>
                  </div>
                </div>

                {/* Bar chart: delivered orders */}
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    Delivered orders
                  </p>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trendChartData}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={trendLabelFormatter}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e5e7eb" }}
                          minTickGap={24}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={false}
                          width={64}
                        />
                        <Tooltip
                          cursor={{ fill: "#f3f4f6" }}
                          content={
                            <ChartTooltip
                              labelFormatter={trendLabelFormatter}
                              rows={{
                                orders: {
                                  label: "Delivered orders",
                                  format: formatNumber,
                                },
                              }}
                            />
                          }
                        />
                        <Bar
                          dataKey="orders"
                          name="Delivered orders"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Original progress-bar view (kept) */}
                <details className="rounded-lg border border-gray-200 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Detailed breakdown by period
                  </summary>

                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Sales amount</span>
                      <span>{formatMoney(maximumSales)} maximum</span>
                    </div>

                    <div className="space-y-4">
                      {trend.map((item) => {
                        const sales = Number(item.sales || 0);
                        const width = (sales / maximumSales) * 100;

                        return (
                          <div key={item.date}>
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="font-medium text-gray-700">
                                {formatDate(item.date, grouping)}
                              </span>
                              <span className="text-gray-600">
                                {formatMoney(sales)}
                              </span>
                            </div>

                            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gray-800 transition-all"
                                style={{ width: `${width}%` }}
                              />
                            </div>

                            <p className="mt-1 text-xs text-gray-400">
                              {formatNumber(item.orders)} delivered orders
                              {" · "}
                              Paid: {formatMoney(item.paid_revenue)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <EmptyState message="No delivered sales in this date range." />
            )}
          </Section>

          {/* Sales outcome pie */}
          <Section
            title="Sales by outcome"
            description="Share of order value that is delivered, pending, cancelled, or returned."
          >
            {salesOverviewData.some((item) => item.value > 0) ? (
              <SalesOutcomeChart data={salesOverviewData} />
            ) : (
              <EmptyState />
            )}
          </Section>

          {/* Order and payment breakdowns */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Section
              title="Order status"
              description="Orders grouped by their current status."
            >
              <div className="space-y-6">
                <DonutChart
                  data={statusChartData}
                  valueLabel="Orders"
                  amountLabel="Order value"
                  centerLabel="orders"
                />
                <BreakdownList
                  items={(analytics.status_breakdown || []).map((item) => ({
                    ...item,
                    status: item.label,
                  }))}
                  nameKey="status"
                  amountKey="sales"
                  countKey="count"
                />
              </div>
            </Section>

            <Section
              title="Payment methods"
              description="Order count and order value by payment method."
            >
              <div className="space-y-6">
                <DonutChart
                  data={paymentMethodChartData}
                  valueLabel="Orders"
                  amountLabel="Order value"
                  centerLabel="orders"
                />
                <BreakdownList
                  items={(analytics.payment_methods || []).map((item) => ({
                    ...item,
                    method: item.label,
                  }))}
                  nameKey="method"
                  amountKey="sales"
                  countKey="count"
                />
              </div>
            </Section>
          </div>

          <Section
            title="Payment status"
            description="Payments grouped by their current payment status."
          >
            <div className="space-y-6">
              <DonutChart
                data={paymentStatusChartData}
                valueLabel="Payments"
                amountLabel="Order value"
                centerLabel="payments"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(analytics.payment_statuses || []).map((item) => (
                  <div
                    key={item.status}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <p className="text-sm capitalize text-gray-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-xl font-bold text-gray-900">
                      {formatNumber(item.count)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatMoney(item.sales)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Top selling products */}
          <Section
            title="Top selling products"
            description="Top 10 products by quantity sold in delivered orders."
            action={
              <span className="text-xs text-gray-500">
                {analytics.top_products?.length || 0} products
              </span>
            }
          >
            {analytics.top_products?.length ? (
              <div className="space-y-6">
                {/* Horizontal bar chart */}
                <div
                  className="w-full"
                  style={{
                    height: Math.max(220, topProductsChartData.length * 44),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProductsChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fontSize: 12, fill: "#374151" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          String(value).length > 20
                            ? `${String(value).slice(0, 19)}…`
                            : value
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "#f3f4f6" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const point = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                              <p className="mb-1 font-semibold text-gray-800">
                                {point.name}
                              </p>
                              <p className="text-gray-600">
                                Quantity sold:{" "}
                                <span className="font-medium text-gray-900">
                                  {formatNumber(point.quantity_sold)}
                                </span>
                              </p>
                              <p className="text-gray-600">
                                Sales:{" "}
                                <span className="font-medium text-gray-900">
                                  {formatMoney(point.sales)}
                                </span>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="quantity_sold"
                        name="Quantity sold"
                        fill="#7c3aed"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3">Rank</th>
                        <th className="px-3 py-3">Product</th>
                        <th className="px-3 py-3 text-right">Quantity sold</th>
                        <th className="px-3 py-3 text-right">Sales</th>
                      </tr>
                    </thead>

                    <tbody>
                      {analytics.top_products.map((product, index) => (
                        <tr
                          key={`${product.product_title}-${index}`}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="px-3 py-4 font-semibold text-gray-500">
                            #{index + 1}
                          </td>
                          <td className="px-3 py-4 font-medium text-gray-800">
                            {product.product_title}
                          </td>
                          <td className="px-3 py-4 text-right text-gray-600">
                            {formatNumber(product.quantity_sold)}
                          </td>
                          <td className="px-3 py-4 text-right font-semibold text-gray-800">
                            {formatMoney(product.sales)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState message="No delivered product sales in this date range." />
            )}
          </Section>

          <p className="text-xs leading-5 text-gray-400">
            Revenue figures are based on the stored order total, which includes
            the order's saved shipping fee and reflects its saved discount.
            Returned sales are shown separately and are not automatically
            deducted from delivered sales. Profit, actual refund amounts, and
            cash collection cannot be calculated from the current order fields.
          </p>
        </>
      ) : !error ? (
        <EmptyState message="No analytics data is available." />
      ) : null}
    </div>
  );
}

/* Money-based donut (values are rupee amounts, not counts) */
function SalesOutcomeChart({ data }) {
  const cleaned = data.filter((item) => item.value > 0);
  const total = cleaned.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={cleaned}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="95%"
              paddingAngle={cleaned.length > 1 ? 2 : 0}
              stroke="none"
            >
              {cleaned.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-semibold text-gray-800">
                      {point.name}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">
                        {formatMoney(point.value)}
                      </span>{" "}
                      ({((point.value / total) * 100).toFixed(1)}%)
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">
            {formatCompactMoney(total)}
          </span>
          <span className="text-xs text-gray-500">total value</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2">
        {cleaned.map((item, index) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <span className="text-gray-700">{item.name}</span>
            </span>
            <span className="text-right text-gray-600">
              {formatMoney(item.value)}
              <span className="ml-1 text-xs text-gray-400">
                ({((item.value / total) * 100).toFixed(0)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}