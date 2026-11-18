import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  FolderKanban,
  Image,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  Percent,
  RotateCcw,
  Settings,
  ShoppingCart,
  Star,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Admin Components
import Analytics from "../components/admin/Analytics";
import CategoryManagement from "../components/admin/CategoryManagement";
import CouponManagement from "../components/admin/CoupenManagement";
import Dashboard from "../components/admin/Dashboard";
import OrderManagement from "../components/admin/OrderManagement";
import ProductManagement from "../components/admin/ProductManagement";
import UserManagement from "../components/admin/UserManagement";
import ReturnManagement from "../components/admin/ReturnManagement";
import AdminSupport from "../components/admin/AdminSupport";
import BannerManagement from "../components/admin/BannerManagement";
import ShopManagement from "../components/admin/ShopManagement";

/* =========================================================
   ADMIN API ENDPOINTS
   ========================================================= */

const ADMIN_ENDPOINTS = {
  me: "/admin/controls/me/",
};

/* =========================================================
   SIDEBAR MENU
   ========================================================= */

const MENU = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "users",
    label: "User Management",
    icon: Users,
  },
  {
    id: "categories",
    label: "Category Management",
    icon: FolderKanban,
  },
  {
    id: "products",
    label: "Product Management",
    icon: Package,
  },
  {
    id: "orders",
    label: "Order Management",
    icon: ShoppingCart,
  },
  {
    id: "returns",
    label: "Return Management",
    icon: RotateCcw,
  },
  {
    id: "coupons",
    label: "Coupons & Discounts",
    icon: Percent,
  },
  // {
  //   id: "reviews",
  //   label: "Reviews & Ratings",
  //   icon: Star,
  // },
  {
    id: "support",
    label: "Support & Messages",
    icon: Star,
  },
  // {
  //   id: "notifications",
  //   label: "Notifications",
  //   icon: Bell,
  // },
  {
    id: "banners",
    label: "Banner Management",
    icon: Image,
  },
  {
    id: "analytics",
    label: "Analytics & Reports",
    icon: BarChart3,
  },
  {
    id: "platform",
    label: "Platform Management",
    icon: Settings,
  },
];

/* =========================================================
   ERROR HANDLER
   ========================================================= */

function getError(error) {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.detail) return data.detail;

  return error?.message || "Something went wrong.";
}

/* =========================================================
   MAIN ADMIN PAGE
   ========================================================= */

export default function AdminPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  /* =======================================================
     ACCESS CONTROL
     ======================================================= */

  const [accessState, setAccessState] = useState("checking");
  const [accessMessage, setAccessMessage] = useState("");

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =======================================================
     UI STATES
     ======================================================= */

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [loading, setLoading] = useState(false);

  /* =======================================================
     CURRENT PAGE
     ======================================================= */

  const currentTitle =
    MENU.find((item) => item.id === activePage)?.label || "Dashboard";

  /* =======================================================
     VERIFY ADMIN ACCESS
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function verifyAdmin() {
      try {
        const response = await api.get(ADMIN_ENDPOINTS.me);

        if (cancelled) return;

        setAccessMessage(response.data?.message || "Admin access verified.");

        setAccessState("allowed");
      } catch (err) {
        if (cancelled) return;

        const status = err.response?.status;

        let message = "Unable to verify admin access. Please try again.";

        if (status === 401) {
          message = "Please log in to access the admin dashboard.";
        } else if (status === 403) {
          message = "Access denied. You do not have administrator permission.";
        } else if (err.response?.data?.message) {
          message = err.response.data.message;
        } else if (err.response?.data?.detail) {
          message = err.response.data.detail;
        }

        setAccessMessage(message);
        setAccessState("denied");
      }
    }

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     PAGE NAVIGATION
     ======================================================= */

  function openPage(page) {
    setActivePage(page);
    setSidebarOpen(false);

    setError("");
    setNotice("");
  }

  /* =======================================================
     LOGOUT
     ======================================================= */

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      await logout();

      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      setError(getError(err));
    } finally {
      setLoggingOut(false);
    }
  }

  /* =======================================================
     ACCESS CHECKING SCREEN
     ======================================================= */

  if (accessState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#eae8e0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-[#eae8e0] border-t-[#8c704d]" />

          <h2 className="text-lg font-bold text-[#28271f]">Verifying access</h2>

          <p className="mt-2 text-sm leading-6 text-[#858276]">
            Please wait while we verify your administrator account.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ACCESS DENIED SCREEN
     ======================================================= */

  if (accessState === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#eae8e0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={28} />
          </div>

          <h2 className="text-xl font-bold text-[#28271f]">Access Denied</h2>

          <p className="mt-3 text-sm leading-6 text-[#858276]">
            {accessMessage}
          </p>

          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#8c704d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#765d3e]"
            onClick={() => navigate("/auth", { replace: true })}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE CONTENT
     ======================================================= */

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={openPage} />;

      case "users":
        return <UserManagement />;

      case "categories":
        return <CategoryManagement />;

      case "products":
        return <ProductManagement onNavigate={openPage} />;

      case "orders":
        return <OrderManagement />;

      case "coupons":
        return <CouponManagement />;

      case "analytics":
        return <Analytics />;

      case "returns":
        return <ReturnManagement />;

      case "support":
        return <AdminSupport />;

      case "banners":
        return <BannerManagement />;

      case "platform":
        return <ShopManagement />;

      default:
        return (
          <div className="rounded-xl border border-[#eae8e0] bg-white p-8 text-center shadow-sm">
            <FolderKanban size={36} className="mx-auto mb-4 text-[#c6c0b2]" />

            <h2 className="text-lg font-bold text-[#28271f]">{currentTitle}</h2>

            <p className="mt-2 text-sm text-[#858276]">
              This management section is not implemented yet.
            </p>
          </div>
        );
    }
  }

  /* =======================================================
     MAIN LAYOUT
     ======================================================= */

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#28271f]">
      {/* MOBILE SIDEBAR BACKDROP */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[265px] flex-col bg-black text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* LOGO */}

        <div className="flex h-[76px] shrink-0 items-center justify-center border-b border-white/10 px-6">
          <img
            src="/logo-sm.png"
            alt="Aura logo"
            className="h-11 object-contain invert"
          />

          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {MENU.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => openPage(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-left text-[13px] font-medium transition ${
                  active
                    ? "bg-[#8c704d] text-white shadow-sm"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.8}
                  className={
                    active
                      ? "text-white"
                      : "text-white/55 group-hover:text-white"
                  }
                />

                <span>{item.label}</span>

                {active && (
                  <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ===================================================
          MAIN CONTENT
          =================================================== */}

      <div className="min-h-screen lg:ml-[265px]">
        {/* TOPBAR */}

        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-[#eae8e0] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          {/* PAGE TITLE */}

          <div className="flex min-w-0 items-center gap-3">
            {/* MOBILE MENU */}

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#eae8e0] text-[#555247] hover:bg-[#f7f6f2] lg:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon size={20} />
            </button>

            <div className="min-w-0">
              <p className="hidden text-[10px] font-bold tracking-[0.18em] text-[#aaa69a] sm:block">
                ADMINISTRATION
              </p>

              <h1 className="truncate text-base font-bold text-[#28271f] sm:mt-0.5 sm:text-lg">
                {currentTitle}
              </h1>
            </div>
          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#eae8e0] bg-white px-3 py-2.5 text-xs font-semibold text-[#555247] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            <LogOut size={16} />

            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </header>

        {/* =================================================
            PAGE CONTENT
            ================================================= */}

        <main className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
          {/* ERROR MESSAGE */}

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
                className="shrink-0 rounded p-1 hover:bg-red-100"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* SUCCESS MESSAGE */}

          {notice && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />

                <span>{notice}</span>
              </div>

              <button
                type="button"
                onClick={() => setNotice("")}
                className="shrink-0 rounded p-1 hover:bg-green-100"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* LOADING */}

          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-[#eae8e0] bg-white px-4 py-3 text-sm text-[#858276]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#eae8e0] border-t-[#8c704d]" />
              Loading data...
            </div>
          )}

          {/* ACTIVE PAGE */}

          {renderPage()}
        </main>
      </div>
    </div>
  );
}
