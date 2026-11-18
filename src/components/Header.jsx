import {
  CreditCardCheck,
  Heart,
  Menu,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const searchRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchToggleRef = useRef(null);
  const searchTimerRef = useRef(null);

  const { user, loading, logout } = useAuth();
  const { cartCount } = useCart();

  const [shop, setShop] = useState(null);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const response = await api.get("/catalog/shop/");
        setShop(response.data?.data || null);
      } catch (error) {
        console.error("Failed to load shop information:", error);
      }
    };

    fetchShop();
  }, []);

  // Focus search input whenever search opens.
  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
    }
  }, [searchOpen]);

  // Close navigation and search with Escape.
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  // Close search when clicking outside.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedInsideSearch = searchContainerRef.current?.contains(
        event.target,
      );

      const clickedSearchToggle = searchToggleRef.current?.contains(
        event.target,
      );

      if (!clickedInsideSearch && !clickedSearchToggle) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Search products with 300ms debounce.
  useEffect(() => {
    const query = searchTerm.trim();

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!searchOpen || !query) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    let cancelled = false;

    setSearchLoading(true);
    setSearchError("");

    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await api.get("/catalog/products/", {
          params: { search: query },
        });

        const payload = response.data?.data ?? response.data;

        const products = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : [];

        if (!cancelled) {
          setSearchResults(products.slice(0, 6));
        }
      } catch (error) {
        console.error("Product search failed:", error);

        if (!cancelled) {
          setSearchResults([]);
          setSearchError("Unable to load products. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchTerm, searchOpen]);

  // Hide header while scrolling down and show while scrolling up.
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const difference = currentScrollY - lastScrollY;

      if (currentScrollY <= 80) {
        setHeaderVisible(true);
      } else if (difference > 5) {
        setHeaderVisible(false);
      } else if (difference < -5) {
        setHeaderVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchTerm("");
    setSearchResults([]);
    setSearchError("");
    setSearchLoading(false);
  };

  // Submit search and navigate to catalog.
  const handleSearch = (event) => {
    event.preventDefault();

    const query = searchTerm.trim();

    if (!query) {
      searchRef.current?.focus();
      return;
    }

    setSearchOpen(false);
    setMenuOpen(false);

    navigate(`/catalog?search=${encodeURIComponent(query)}`);
  };

  // Navigate to selected product.
  const handleProductClick = (product) => {
    const categorySlug = product.category_detail?.slug;
    const productSlug = product.slug;

    if (!categorySlug || !productSlug) {
      console.error("Missing category slug or product slug:", product);
      return;
    }

    closeSearch();
    closeMenu();

    navigate(`/${categorySlug}/${productSlug}`);
  };

  // Get product image and support relative media paths.
  const getProductImage = (product) => {
    const firstImage = Array.isArray(product.images) ? product.images[0] : null;

    const image =
      product.main_image ||
      product.image_url ||
      product.image ||
      firstImage?.image_url ||
      firstImage?.image ||
      firstImage?.file_url ||
      firstImage?.file ||
      (typeof firstImage === "string" ? firstImage : "");

    if (!image) {
      return "";
    }

    if (typeof image === "string" && image.startsWith("/")) {
      const baseURL = api.defaults.baseURL;

      if (baseURL) {
        try {
          return new URL(image, baseURL).href;
        } catch {
          return image;
        }
      }
    }

    return image;
  };

  const handleSectionClick = (event, sectionId) => {
    event.preventDefault();
    closeMenu();

    if (location.pathname !== "/") {
      const targetPath =
        sectionId === "categories" ? "/categories" : "/arrivals";

      navigate(targetPath);
      return;
    }

    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.replaceState(null, "", `/#${sectionId}`);
    }
  };

  // Logout.
  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSearch = () => {
    setSearchOpen((open) => !open);
    setMenuOpen(false);
  };

  return (
    <header
      className={`
        sticky top-0 z-[1000] w-full
        border-b border-gray-200 bg-white text-gray-900
        shadow-[0_2px_8px_rgb(0_0_0/3%)]
        transition-transform duration-300 ease-in-out
        ${
          headerVisible
            ? "translate-y-0"
            : "-translate-y-full pointer-events-none"
        }
      `}
    >
      {/* Announcement bar */}
      <div
        className="
          flex min-h-[36px] flex-wrap items-center justify-center
          gap-3 bg-[#080808] px-3 py-2
          text-[10px] font-medium tracking-wide text-white
          sm:gap-5 sm:px-5 sm:text-[11px]
          lg:gap-9
        "
      >
        <div className="flex items-center justify-center gap-2">
          <Truck size={17} strokeWidth={1.8} />
          <span>Free Shipping Over ₹999</span>
        </div>

        <span className="h-4 w-px bg-white/30" />

        <div className="flex items-center justify-center gap-2">
          <RefreshCw size={17} strokeWidth={1.8} />
          <span>24-Hour Returns</span>
        </div>

        <span className="h-4 w-px bg-white/30" />

        <div className="flex items-center justify-center gap-2">
          <CreditCardCheck size={17} strokeWidth={1.8} />
          <span>Secure Payment</span>
        </div>
      </div>

      {/* Main header */}
      <div
        className="
          relative grid min-h-[72px]
          grid-cols-[30px_minmax(65px,1fr)_auto]
          items-center gap-2 bg-white
          px-3 py-2
          sm:min-h-[76px] sm:grid-cols-[36px_1fr_auto]
          sm:gap-3 sm:px-5
          lg:min-h-[84px]
          lg:grid-cols-[minmax(120px,1fr)_auto_minmax(190px,1fr)]
          lg:gap-[26px] lg:px-[42px] lg:py-4
        "
      >
        {/* Mobile menu button */}
        <button
          type="button"
          className="
            flex h-9 w-[30px] items-center justify-center
            bg-transparent text-gray-900
            transition-colors hover:text-[#9b7042]
            sm:w-[34px] lg:hidden
          "
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((open) => !open);
            setSearchOpen(false);
          }}
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>

        {/* Brand */}
        <Link
          to="/"
          onClick={closeMenu}
          className="
            col-start-2 row-start-1 justify-self-center
            w-[96px] sm:w-[112px]
            lg:col-auto lg:row-auto lg:w-[140px]
            lg:justify-self-start
          "
          aria-label="Aura Fashions"
        >
          <img
            src={shop?.logo || "/logo-sm.png"}
            alt={shop?.name || "Aura Fashions"}
            className="block max-h-[49px] w-full object-contain sm:max-h-[54px]"
          />
        </Link>

        {/* Desktop navigation */}
        <nav
          className={`
            absolute left-0 right-0 top-full z-[1100]
            flex-col items-stretch justify-start
            border-y border-gray-200 bg-white
            px-6 py-2 shadow-lg
            lg:static lg:z-auto lg:flex lg:flex-row
            lg:items-center lg:justify-center
            lg:gap-[clamp(15px,2.1vw,34px)]
            lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none
            ${menuOpen ? "flex" : "hidden lg:flex"}
          `}
          aria-label="Main navigation"
        >
          <Link
            to="/"
            onClick={closeMenu}
            className="
              border-b border-gray-100 py-3 text-sm font-semibold
              text-gray-900 transition-colors hover:text-[#9b7042]
              lg:border-0 lg:py-[10px] lg:text-[clamp(12px,0.95vw,15px)]
            "
          >
            Home
          </Link>

          <a
            href="/categories"
            onClick={(event) => handleSectionClick(event, "categories")}
            className="
              border-b border-gray-100 py-3 text-sm font-semibold
              text-gray-900 transition-colors hover:text-[#9b7042]
              lg:border-0 lg:py-[10px] lg:text-[clamp(12px,0.95vw,15px)]
            "
          >
            Categories
          </a>

          <a
            href="/arrivals"
            onClick={(event) => handleSectionClick(event, "new-arrivals")}
            className="
              border-b border-gray-100 py-3 text-sm font-semibold
              text-gray-900 transition-colors hover:text-[#9b7042]
              lg:border-0 lg:py-[10px] lg:text-[clamp(12px,0.95vw,15px)]
            "
          >
            New Arrivals
          </a>

          <Link
            to="/collections"
            onClick={closeMenu}
            className="
              border-b border-gray-100 py-3 text-sm font-semibold
              text-gray-900 transition-colors hover:text-[#9b7042]
              lg:border-0 lg:py-[10px] lg:text-[clamp(12px,0.95vw,15px)]
            "
          >
            Collections
          </Link>

          <Link
            to="/about"
            onClick={closeMenu}
            className="
              border-b border-gray-100 py-3 text-sm font-semibold
              text-gray-900 transition-colors hover:text-[#9b7042]
              lg:border-0 lg:py-[10px] lg:text-[clamp(12px,0.95vw,15px)]
            "
          >
            About
          </Link>

          <Link
            to="/contact"
            onClick={closeMenu}
            className="
              py-3 text-sm font-semibold text-gray-900
              transition-colors hover:text-[#9b7042]
              lg:py-[10px] lg:text-[clamp(12px,0.95vw,15px)]
            "
          >
            Contact
          </Link>
        </nav>

        {/* Header actions */}
        <div
          className="
            col-start-3 row-start-1
            flex min-w-0 items-center justify-end
            gap-1.5 sm:gap-2
            lg:col-auto lg:row-auto
            lg:gap-[clamp(12px,1.35vw,22px)]
          "
          aria-label="Shopping and account actions"
        >
          {/* Search */}
          <button
            ref={searchToggleRef}
            type="button"
            className={`
              relative flex h-8 w-6 shrink-0
              items-center justify-center
              text-gray-900 transition-colors
              hover:text-[#a77947]
              sm:h-9 sm:w-7
              lg:w-[29px]
              ${searchOpen ? "text-[#a77947]" : ""}
            `}
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={toggleSearch}
          >
            {searchOpen ? (
              <X size={20} strokeWidth={1.8} />
            ) : (
              <Search size={20} strokeWidth={1.8} />
            )}
          </button>

          {/* Wishlist */}
          <Link
            to="/wishlist"
            onClick={closeMenu}
            aria-label="Wishlist"
            className="
              flex h-8 w-6 shrink-0 items-center justify-center
              text-gray-900 transition-colors
              hover:text-[#a77947]
              sm:h-9 sm:w-7 lg:w-[29px]
            "
          >
            <Heart size={20} strokeWidth={1.8} />
          </Link>

          {/* Cart with count badge */}
          <Link
            to="/cart"
            onClick={closeMenu}
            aria-label={`Shopping cart, ${cartCount} items`}
            className="
              relative flex h-8 w-6 shrink-0
              items-center justify-center
              text-gray-900 transition-colors
              hover:text-[#a77947]
              sm:h-9 sm:w-7 lg:w-[29px]
            "
          >
            <ShoppingCart size={20} strokeWidth={1.8} />

            {user && cartCount > 0 && (
              <span
                className="
                  absolute -right-1.5 -top-1
                  flex h-[18px] min-w-[18px]
                  items-center justify-center
                  rounded-full border border-white
                  bg-black px-1
                  text-[10px] font-semibold leading-none text-white
                  sm:-right-1.5
                "
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          {/* <Link
            to="/notifications"
            onClick={closeMenu}
            aria-label="Notifications"
            className="
              relative flex h-8 w-6 shrink-0
              items-center justify-center
              text-gray-900 transition-colors
              hover:text-[#a77947]
              sm:h-9 sm:w-7 lg:w-[29px]
            "
          >
            <Bell size={20} strokeWidth={1.8} />

            <span
              className="
                absolute right-0.5 top-0.5
                h-[7px] w-[7px] rounded-full
                border border-white bg-[#b77945]
              "
            />
          </Link> */}

          {/* Account */}
          {!loading &&
            (user ? (
              <div className="flex shrink-0 items-center">
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className="
                    flex h-8 w-8 items-center justify-center
                    rounded-full border border-[#d8c1a5]
                    bg-[#f1e5d7] text-[13px] font-bold
                    text-[#4d3523] transition
                    hover:-translate-y-px hover:bg-[#e6d2ba]
                    sm:h-9 sm:w-9 sm:text-[15px]
                  "
                  aria-label="Open your dashboard"
                  title={user.username || "My account"}
                >
                  {(user.username?.trim()?.charAt(0) || "?").toUpperCase()}
                </Link>
              </div>
            ) : (
              <Link
                to="/auth"
                onClick={closeMenu}
                className="
                  flex min-h-[32px] shrink-0 items-center
                  justify-center border border-[#171717]
                  bg-[#171717] px-2 text-[10px] font-semibold
                  text-white transition-colors
                  hover:bg-white hover:text-[#171717]
                  sm:min-h-[34px] sm:min-w-[65px]
                  sm:px-3 sm:text-xs
                  lg:min-h-[37px] lg:min-w-[76px] lg:px-[17px]
                "
              >
                Login
              </Link>
            ))}
        </div>
      </div>

      {/* Search dropdown */}
      {searchOpen && (
        <div
          ref={searchContainerRef}
          className="
            absolute right-0 top-full z-[1200]
            w-[calc(100vw-20px)] max-w-[460px]
            bg-white text-gray-900
            sm:w-[min(460px,calc(100vw-24px))]
          "
        >
          <form
            className="
              flex min-h-[62px] items-center gap-2
              border border-gray-200 bg-white
              px-3 py-3 sm:gap-3 sm:px-4
            "
            onSubmit={handleSearch}
          >
            <Search
              size={18}
              strokeWidth={1.8}
              className="shrink-0 text-gray-700"
            />

            <input
              ref={searchRef}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              autoComplete="off"
              className="
                min-w-0 flex-1 border-0 bg-transparent
                py-2 text-[13px] text-gray-900
                outline-none placeholder:text-gray-400
                focus:ring-0 sm:text-sm
              "
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSearchResults([]);
                  setSearchError("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="
                  flex shrink-0 items-center justify-center
                  bg-transparent p-1 text-gray-500
                  hover:text-gray-900
                "
              >
                <X size={17} />
              </button>
            )}

            <button
              type="submit"
              className="
                min-h-[36px] shrink-0 bg-[#171717]
                px-3 py-2 text-xs font-semibold text-white
                transition-colors hover:bg-[#444]
                sm:px-5
              "
            >
              Search
            </button>
          </form>

          {/* Product search results */}
          {searchTerm.trim() && (
            <div
              className="
                max-h-[55vh] overflow-y-auto
                border border-t-0 border-gray-200
                bg-white shadow-[0_12px_30px_rgb(0_0_0/12%)]
                sm:max-h-[390px]
              "
            >
              {searchLoading ? (
                <div className="px-4 py-6 text-center text-[13px] text-gray-500">
                  Searching products...
                </div>
              ) : searchError ? (
                <div className="px-4 py-6 text-center text-[13px] text-red-700">
                  {searchError}
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div
                    className="
                      px-4 pb-2 pt-3 text-[11px]
                      font-bold uppercase tracking-wider
                      text-gray-500
                    "
                  >
                    Products
                  </div>

                  {searchResults.map((product) => {
                    const image = getProductImage(product);

                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="
                          flex w-full items-center gap-3
                          bg-white px-4 py-2.5 text-left
                          transition-colors hover:bg-gray-50
                          focus-visible:bg-gray-50
                          focus-visible:outline-none
                        "
                      >
                        <span
                          className="
                            flex h-[58px] w-[52px] shrink-0
                            items-center justify-center
                            overflow-hidden bg-gray-100
                            text-gray-400
                          "
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={product.title || "Product"}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <Search size={20} />
                          )}
                        </span>

                        <span
                          className="
                            text-[13px] font-medium
                            leading-relaxed text-gray-800
                          "
                        >
                          {product.title}
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <div className="px-4 py-6 text-center text-[13px] text-gray-500">
                  No products found for "{searchTerm.trim()}".
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
