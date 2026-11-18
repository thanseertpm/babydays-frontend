import {
  ArrowDownWideNarrow,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import api from "../services/api";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

const getAvailableVariants = (product) =>
  (product.variants || []).filter(
    (variant) =>
      variant.is_available !== false && Number.isFinite(Number(variant.price)),
  );

const getStartingVariant = (product) =>
  getAvailableVariants(product).reduce(
    (lowest, variant) =>
      !lowest || Number(variant.price) < Number(lowest.price)
        ? variant
        : lowest,
    null,
  );

const getProductPrices = (product) => {
  const prices = getAvailableVariants(product)
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  return prices.length ? prices : [0];
};

const getStartingPrice = (product) => {
  const variant = getStartingVariant(product);
  return variant ? Number(variant.price) || 0 : 0;
};

const getStartingMrp = (product) => {
  const variant = getStartingVariant(product);

  if (!variant) return 0;

  return Number(variant.mrp) || Number(variant.price) || 0;
};

const getDiscount = (mrp, price) => {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

const getImage = (product) =>
  product.main_image ||
  product.files?.find((file) => file.is_main)?.file ||
  product.files?.[0]?.file ||
  "";

const getCategorySlug = (product) =>
  product.category_detail?.slug || product.category_slug || "";

const getCategoryTitle = (product) =>
  product.category_detail?.title || product.category_title || "Collection";

export default function Products() {
  const { slug: routeCategorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addToCart, loading: cartLoading } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [selectedCategories, setSelectedCategories] = useState(
    routeCategorySlug ? [routeCategorySlug] : [],
  );
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);

  const [inStockOnly, setInStockOnly] = useState(false);

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    count: 0,
    page_size: 15,
    next: null,
    previous: null,
  });

  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    brands: [],
    price_max: 100000,
  });

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setSelectedCategories(routeCategorySlug ? [routeCategorySlug] : []);
    setPage(1);
  }, [routeCategorySlug]);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/catalog/products/", {
          params: {
            page,
            page_size: 15,

            search: searchTerm.trim() || undefined,

            category: selectedCategories.length
              ? selectedCategories.join(",")
              : undefined,

            brand: selectedBrands.length ? selectedBrands.join(",") : undefined,

            min_price: minimumPrice || undefined,
            max_price: maximumPrice || undefined,

            in_stock: inStockOnly ? "true" : undefined,

            sort: sortBy,
          },
        });

        const payload = response?.data?.data ?? response?.data;

        if (!cancelled) {
          setProducts(payload?.results || []);

          setPagination({
            count: payload?.count || 0,
            page_size: payload?.page_size || 15,
            next: payload?.next || null,
            previous: payload?.previous || null,
          });

          setFilterOptions(
            payload?.filter_options || {
              categories: [],
              brands: [],
              price_max: 100000,
            },
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load products. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    searchTerm,
    selectedCategories,
    selectedBrands,
    minimumPrice,
    maximumPrice,
    inStockOnly,
    sortBy,
  ]);

  const categories = filterOptions.categories;
  const brands = filterOptions.brands;

  const priceBounds = {
    min: 0,
    max: Math.max(1, Math.ceil(Number(filterOptions.price_max) || 100000)),
  };

  const effectiveMin = Math.min(
    priceBounds.max,
    Math.max(0, minimumPrice === "" ? 0 : Number(minimumPrice) || 0),
  );

  const effectiveMax = Math.min(
    priceBounds.max,
    Math.max(
      0,
      maximumPrice === "" ? priceBounds.max : Number(maximumPrice) || 0,
    ),
  );

  const minPosition =
    priceBounds.max > 0 ? (effectiveMin / priceBounds.max) * 100 : 0;

  const maxPosition =
    priceBounds.max > 0 ? (effectiveMax / priceBounds.max) * 100 : 100;

  const updateMinimumPrice = (rawValue) => {
    setPage(1);

    if (rawValue === "") {
      setMinimumPrice("");
      return;
    }

    const value = Math.min(priceBounds.max, Math.max(0, Number(rawValue) || 0));

    setMinimumPrice(String(Math.min(value, effectiveMax)));
  };

  const updateMaximumPrice = (rawValue) => {
    setPage(1);

    if (rawValue === "") {
      setMaximumPrice("");
      return;
    }

    const value = Math.min(priceBounds.max, Math.max(0, Number(rawValue) || 0));

    setMaximumPrice(String(Math.max(value, effectiveMin)));
  };

  const toggleCategory = (categorySlug) => {
    setSelectedCategories((current) =>
      current.includes(categorySlug)
        ? current.filter((item) => item !== categorySlug)
        : [...current, categorySlug],
    );

    setPage(1);
  };

  const toggleBrand = (brand) => {
    setSelectedBrands((current) =>
      current.includes(brand)
        ? current.filter((item) => item !== brand)
        : [...current, brand],
    );

    setPage(1);
  };

  const clearFilters = () => {
    setSelectedCategories(routeCategorySlug ? [routeCategorySlug] : []);
    setSelectedBrands([]);
    setMinimumPrice("");
    setMaximumPrice("");
    setInStockOnly(false);
    setSearchTerm("");
    setPage(1);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("search");

    setSearchParams(nextParams, { replace: true });
  };

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    (minimumPrice !== "" ? 1 : 0) +
    (maximumPrice !== "" ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const getAvailableStockVariant = (product) =>
    getAvailableVariants(product)
      .filter((variant) => Number(variant.stock) > 0)
      .reduce(
        (lowest, variant) =>
          !lowest || Number(variant.price) < Number(lowest.price)
            ? variant
            : lowest,
        null,
      );

  const totalPages = Math.ceil(pagination.count / pagination.page_size);

  return (
    <main className="min-h-screen bg-white font-[inherit] text-[#22211f]">
      {/* Products container */}
      <div className=" w-full  px-[15px] pt-5 pb-12 sm:px-11  sm:pb-[70px] ">
        {/* Toolbar */}
        {/* Toolbar */}
<div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#eeece8] pb-4 sm:mb-6 sm:pb-5">

  {/* Mobile filter button */}
  <button
    type="button"
    className="inline-flex min-h-[36px] items-center gap-2 rounded-[3px] border border-[#e5e2dc] bg-white px-3 text-xs text-[#292824] transition-colors hover:border-[#876c4b] sm:hidden"
    onClick={() => setFiltersOpen((open) => !open)}
  >
    <SlidersHorizontal size={16} />
    Filters

    {activeFilterCount > 0 && (
      <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#876c4b] px-1 text-[10px] text-white">
        {activeFilterCount}
      </span>
    )}
  </button>

  {/* Heading */}
  <div className="order-3 w-full text-center sm:order-1 sm:w-auto sm:text-left">
    <span className="block text-[10px] font-bold tracking-[3px] text-[#876c4b]">
      AURA FASHIONS
    </span>

    <h1 className="title-font my-2 text-[25px] font-normal leading-tight text-[#22211f] sm:text-[30px]">
      COLLECTIONS
    </h1>

    <p className="text-[11px] text-[#77746e]">
      {loading
        ? "Loading products..."
        : `${pagination.count} ${
            pagination.count === 1 ? "Product Found" : "Products Found"
          }`}
    </p>
  </div>

  {/* Search and Sort */}
  <div className="order-2 flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-3">

    {/* Search */}
    <div className="flex h-[39px] w-full items-center gap-2 rounded-[3px] border border-[#e7e3dc] bg-white px-3 text-[#8b867e] transition-colors focus-within:border-[#876c4b] sm:w-[220px] lg:w-[250px]">
      <Search size={16} className="shrink-0" />

      <input
        type="search"
        placeholder="Search collection..."
        value={searchTerm}
        onChange={(event) => {
          const value = event.target.value;

          setSearchTerm(value);
          setPage(1);

          const nextParams = new URLSearchParams(searchParams);

          if (value.trim()) {
            nextParams.set("search", value);
          } else {
            nextParams.delete("search");
          }

          setSearchParams(nextParams, { replace: true });
        }}
        className="w-full min-w-0 border-0 bg-transparent p-0 text-xs text-[#22211f] outline-none placeholder:text-[#a09b93]"
      />

      {searchTerm && (
        <button
          type="button"
          aria-label="Clear search"
          className="flex shrink-0 items-center justify-center bg-transparent p-1 text-[#77746e] hover:text-[#876c4b]"
          onClick={() => {
            setSearchTerm("");
            setPage(1);

            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("search");
            setSearchParams(nextParams, { replace: true });
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>

    {/* Sort */}
    <div className="flex h-[39px] items-center justify-between gap-2 rounded-[3px] border border-[#e7e3dc] bg-white px-3 sm:w-[190px]">
      <span className="flex shrink-0 items-center gap-2 text-[11px] text-[#77746e]">
        <ArrowDownWideNarrow size={15} className="text-[#876c4b]" />
        Sort by
      </span>

      <div className="relative min-w-0 flex-1">
        <select
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value);
            setPage(1);
          }}
          className="w-full cursor-pointer appearance-none bg-transparent py-1 pr-5 text-right text-[11px] font-medium text-[#292824] outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-[#77746e]"
        />
      </div>
    </div>
  </div>
</div>

        {/* Main layout */}
        <div className="grid grid-cols-1 items-start gap-6 min-[701px]:grid-cols-[205px_minmax(0,1fr)] min-[701px]:gap-6 min-[1101px]:grid-cols-[235px_minmax(0,1fr)] min-[1101px]:gap-[34px]">
          {/* Filter sidebar */}
          <aside
            className={`
              fixed top-0 bottom-0 left-0 z-[1001]
              w-[min(320px,86vw)] overflow-x-hidden overflow-y-auto
              bg-white px-5 pt-[22px] pb-[35px]
              shadow-[8px_0_30px_rgb(0_0_0/8%)]
              transition-[transform,visibility] duration-300
              min-[701px]:relative min-[701px]:top-auto min-[701px]:bottom-auto
              min-[701px]:z-auto min-[701px]:w-auto min-[701px]:overflow-visible
              min-[701px]:bg-white min-[701px]:p-0 min-[701px]:shadow-none
              min-[701px]:visible min-[701px]:translate-x-0
              ${
                filtersOpen
                  ? "visible translate-x-0"
                  : "invisible -translate-x-[110%]"
              }
            `}
          >
            {/* Sidebar heading */}
            <div className="relative flex items-center justify-between gap-2 border-b border-[#eeece8] pb-[19px] min-[701px]:justify-between">
              <div className="flex items-center gap-[9px]">
                <Filter size={17} className="text-[#876c4b]" />
                <h2 className="text-sm font-bold">Filters</h2>
              </div>

              <button
                type="button"
                className="ml-auto bg-transparent py-1 text-[11px] text-[#876c4b] transition-colors hover:text-[#443323] hover:underline"
                onClick={clearFilters}
              >
                Clear all
              </button>

              <button
                type="button"
                className="absolute -top-[3px] -right-[3px] flex h-[27px] w-[27px] items-center justify-center bg-transparent text-[#292824] min-[701px]:hidden"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
              >
                <X size={19} />
              </button>
            </div>

            {/* Category filter */}
            {/* Category filter */}
            <div className="border-b border-[#eeece8] py-5">
              <button
                type="button"
                onClick={() => setCategoriesOpen((open) => !open)}
                aria-expanded={categoriesOpen}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-xs font-bold text-[#262522]">
                  Categories
                </span>

                <ChevronDown
                  size={17}
                  className={`shrink-0 text-[#77746e] transition-transform duration-300 ${
                    categoriesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {categoriesOpen && (
                <div className="mt-5 flex flex-col gap-[13px]">
                  {categories.map((category) => (
                    <label
                      className="group flex min-w-0 cursor-pointer items-center gap-[10px] text-xs text-[#66635d]"
                      key={category.slug}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.slug)}
                        onChange={() => toggleCategory(category.slug)}
                        className="peer sr-only"
                      />

                      <span
                        className="
              relative inline-flex h-[15px] w-[15px] shrink-0
              items-center justify-center rounded-[2px]
              border border-[#d6d2ca] bg-white
              transition-colors
              after:h-[7px] after:w-1
              after:rotate-45 after:border-r-[1.5px]
              after:border-b-[1.5px] after:border-white
              after:opacity-0 after:content-['']
              peer-checked:border-[#876c4b]
              peer-checked:bg-[#876c4b]
              peer-checked:after:opacity-100
              peer-focus-visible:outline-2
              peer-focus-visible:outline-offset-[3px]
              peer-focus-visible:outline-[#b9a58d]
            "
                      />

                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {category.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Price filter */}
            <div className="overflow-visible border-b border-[#eeece8] py-5">
              <div className="flex flex-col gap-[7px]">
                <h3 className="m-0 text-xs font-bold text-[#262522]">
                  Price range
                </h3>

                <span className="text-xs font-semibold tabular-nums text-[#876c4b]">
                  {formatPrice(effectiveMin)} – {formatPrice(effectiveMax)}
                </span>
              </div>

              {/* Dual range slider */}
              <div
                className="relative mx-2 mt-[17px] mb-[18px] h-[30px] touch-pan-y"
                style={{
                  "--min-position": `${minPosition}%`,
                  "--max-position": `${maxPosition}%`,
                }}
              >
                <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-[#e7e3dc]" />

                <div
                  className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#876c4b]"
                  style={{
                    left: "var(--min-position)",
                    right: "calc(100% - var(--max-position))",
                  }}
                />

                <input
                  className="
                    range-min pointer-events-none absolute inset-0 z-[3]
                    m-0 h-[30px] w-full cursor-pointer appearance-none
                    border-0 bg-transparent p-0 outline-none
                    [&::-webkit-slider-runnable-track]:h-1
                    [&::-webkit-slider-runnable-track]:bg-transparent
                    [&::-moz-range-track]:h-1
                    [&::-moz-range-track]:bg-transparent
                    [&::-webkit-slider-thumb]:pointer-events-auto
                    [&::-webkit-slider-thumb]:mt-[-6.5px]
                    [&::-webkit-slider-thumb]:h-[17px]
                    [&::-webkit-slider-thumb]:w-[17px]
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border-[3px]
                    [&::-webkit-slider-thumb]:border-[#876c4b]
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgb(0_0_0/15%)]
                    [&::-moz-range-thumb]:pointer-events-auto
                    [&::-moz-range-thumb]:h-3
                    [&::-moz-range-thumb]:w-3
                    [&::-moz-range-thumb]:cursor-grab
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-[3px]
                    [&::-moz-range-thumb]:border-[#876c4b]
                    [&::-moz-range-thumb]:bg-white
                    [&:active::-webkit-slider-thumb]:cursor-grabbing
                    [&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(135_108_75/20%)]
                  "
                  type="range"
                  aria-label="Minimum price"
                  min={0}
                  max={priceBounds.max}
                  step={1}
                  value={effectiveMin}
                  onChange={(event) => updateMinimumPrice(event.target.value)}
                  style={{
                    zIndex: effectiveMin > priceBounds.max * 0.9 ? 5 : 3,
                  }}
                />

                <input
                  className="
                    range-max pointer-events-none absolute inset-0 z-[4]
                    m-0 h-[30px] w-full cursor-pointer appearance-none
                    border-0 bg-transparent p-0 outline-none
                    [&::-webkit-slider-runnable-track]:h-1
                    [&::-webkit-slider-runnable-track]:bg-transparent
                    [&::-moz-range-track]:h-1
                    [&::-moz-range-track]:bg-transparent
                    [&::-webkit-slider-thumb]:pointer-events-auto
                    [&::-webkit-slider-thumb]:mt-[-6.5px]
                    [&::-webkit-slider-thumb]:h-[17px]
                    [&::-webkit-slider-thumb]:w-[17px]
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border-[3px]
                    [&::-webkit-slider-thumb]:border-[#876c4b]
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgb(0_0_0/15%)]
                    [&::-moz-range-thumb]:pointer-events-auto
                    [&::-moz-range-thumb]:h-3
                    [&::-moz-range-thumb]:w-3
                    [&::-moz-range-thumb]:cursor-grab
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-[3px]
                    [&::-moz-range-thumb]:border-[#876c4b]
                    [&::-moz-range-thumb]:bg-white
                    [&:active::-webkit-slider-thumb]:cursor-grabbing
                    [&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(135_108_75/20%)]
                  "
                  type="range"
                  aria-label="Maximum price"
                  min={0}
                  max={priceBounds.max}
                  step={1}
                  value={effectiveMax}
                  onChange={(event) => updateMaximumPrice(event.target.value)}
                  style={{
                    zIndex: effectiveMax < priceBounds.max * 0.1 ? 5 : 4,
                  }}
                />
              </div>

              {/* Manual price inputs */}
              <div className="grid grid-cols-2 gap-[9px]">
                <label className="grid min-w-0 gap-[7px] text-[10px] text-[#77746e]">
                  <span>Minimum</span>

                  <div className="flex min-h-[39px] min-w-0 items-center gap-[5px] rounded-[3px] border border-[#e5e2dc] bg-white px-2 text-[#77746e] transition-colors focus-within:border-[#876c4b]">
                    <span className="shrink-0 text-xs">₹</span>

                    <input
                      type="number"
                      min="0"
                      max={effectiveMax}
                      placeholder="0"
                      value={minimumPrice}
                      onChange={(event) =>
                        updateMinimumPrice(event.target.value)
                      }
                      className="w-full min-w-0 appearance-none bg-white py-[9px] text-[11px] tabular-nums text-[#22211f] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </label>

                <label className="grid min-w-0 gap-[7px] text-[10px] text-[#77746e]">
                  <span>Maximum</span>

                  <div className="flex min-h-[39px] min-w-0 items-center gap-[5px] rounded-[3px] border border-[#e5e2dc] bg-white px-2 text-[#77746e] transition-colors focus-within:border-[#876c4b]">
                    <span className="shrink-0 text-xs">₹</span>

                    <input
                      type="number"
                      min={effectiveMin}
                      max={priceBounds.max}
                      placeholder={String(priceBounds.max)}
                      value={maximumPrice}
                      onChange={(event) =>
                        updateMaximumPrice(event.target.value)
                      }
                      className="w-full min-w-0 appearance-none bg-white py-[9px] text-[11px] tabular-nums text-[#22211f] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Brand filter */}
            {/* Brand filter */}
{brands.length > 0 && (
  <div className="border-b border-[#eeece8] py-5">
    <button
      type="button"
      onClick={() => setBrandsOpen((open) => !open)}
      aria-expanded={brandsOpen}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-xs font-bold text-[#262522]">
        Brands
      </span>

      <ChevronDown
        size={17}
        className={`shrink-0 text-[#77746e] transition-transform duration-300 ${
          brandsOpen ? "rotate-180" : ""
        }`}
      />
    </button>

    {brandsOpen && (
      <div className="mt-5 flex flex-col gap-[13px]">
        {brands.map((brand) => (
          <label
            className="flex min-w-0 cursor-pointer items-center gap-[10px] text-xs text-[#66635d]"
            key={brand}
          >
            <input
              type="checkbox"
              checked={selectedBrands.includes(brand)}
              onChange={() => toggleBrand(brand)}
              className="peer sr-only"
            />

            <span
              className="
                relative inline-flex h-[15px] w-[15px] shrink-0
                items-center justify-center rounded-[2px]
                border border-[#d6d2ca] bg-white
                after:h-[7px] after:w-1
                after:rotate-45 after:border-r-[1.5px]
                after:border-b-[1.5px] after:border-white
                after:opacity-0 after:content-['']
                peer-checked:border-[#876c4b]
                peer-checked:bg-[#876c4b]
                peer-checked:after:opacity-100
                peer-focus-visible:outline-2
                peer-focus-visible:outline-offset-[3px]
                peer-focus-visible:outline-[#b9a58d]
              "
            />

            <span className="min-w-0 [overflow-wrap:anywhere]">
              {brand}
            </span>
          </label>
        ))}
      </div>
    )}
  </div>
)}

            {/* Availability filter */}
            <div className="border-b border-[#eeece8] py-5">
              <h3 className="mb-[15px] text-xs font-bold text-[#262522]">
                Availability
              </h3>

              <label className="flex cursor-pointer items-center gap-[10px] text-xs text-[#66635d]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => {
                    setInStockOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="peer sr-only"
                />

                <span
                  className="
        relative inline-flex h-[15px] w-[15px] shrink-0
        items-center justify-center rounded-[2px]
        border border-[#d6d2ca] bg-white
        after:h-[7px] after:w-1
        after:rotate-45 after:border-r-[1.5px]
        after:border-b-[1.5px] after:border-white
        after:opacity-0 after:content-['']
        peer-checked:border-[#876c4b]
        peer-checked:bg-[#876c4b]
        peer-checked:after:opacity-100
        peer-focus-visible:outline-2
        peer-focus-visible:outline-offset-[3px]
        peer-focus-visible:outline-[#b9a58d]
      "
                />

                <span>In Stock Only</span>
              </label>
            </div>
          </aside>

          {/* Mobile backdrop */}
          {filtersOpen && (
            <button
              type="button"
              className="fixed inset-0 z-[1000] border-0 bg-black/40 min-[701px]:hidden"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            />
          )}

          {/* Products results */}
          <section className="min-w-0">
            {loading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-[30px] py-[30px] text-center text-[#77746e]">
                <span className="h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-[#eee9e1] border-t-[#876c4b]" />
                <p className="mt-4 text-xs">Loading Collections...</p>
              </div>
            ) : error ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-[30px] py-[30px] text-center text-[#a43e3e]">
                <h2 className="mt-[15px] mb-2 font-serif text-2xl font-normal text-[#292824]">
                  Something went wrong
                </h2>

                <p className="max-w-[360px] text-xs leading-[1.7]">{error}</p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 min-h-[38px] border border-[#876c4b] bg-white px-[18px] text-xs text-[#876c4b] transition-colors hover:bg-[#876c4b] hover:text-white"
                >
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-[30px] py-[30px] text-center text-[#77746e]">
                <Search size={30} className="text-[#876c4b]" />

                <h2 className="mt-[15px] mb-2 font-serif text-2xl font-normal text-[#292824]">
                  No products found
                </h2>

                <p className="max-w-[360px] text-xs leading-[1.7]">
                  Try changing your search or adjusting the selected filters.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 min-h-[38px] border border-[#876c4b] bg-white px-[18px] text-xs text-[#876c4b] transition-colors hover:bg-[#876c4b] hover:text-white"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-[9px] gap-y-[22px] min-[381px]:gap-x-3 min-[381px]:gap-y-6 min-[701px]:gap-x-[18px] min-[701px]:gap-y-[25px] min-[1101px]:grid-cols-5 min-[1101px]:gap-x-5 min-[1101px]:gap-y-[30px]">
                  {products.map((product) => {
                    const startingVariant = getStartingVariant(product);
                    const availableStockVariant =
                      getAvailableStockVariant(product);

                    const displayVariant =
                      availableStockVariant || startingVariant;

                    const price = Number(displayVariant?.price) || 0;
                    const mrp = Number(displayVariant?.mrp) || price;

                    const discount = getDiscount(mrp, price);

                    const image = getImage(product);
                    const categorySlug = getCategorySlug(product);

                    const wished = isWishlisted(product.id);

                    const formattedProduct = {
                      id: product.id,
                      title: product.title,
                      image,
                      price,
                      originalPrice: mrp,
                      discount,
                      rating: Number(product.rating ?? 0),
                      reviewCount: Number(
                        product.review_count ??
                          (Array.isArray(product.reviews)
                            ? product.reviews.length
                            : product.reviews) ??
                          0,
                      ),
                      badge: "NEW",
                      slug: product.slug,
                      categorySlug,

                      // Variant information
                      variant_id: availableStockVariant?.id ?? null,
                      variantLabel: availableStockVariant
                        ? `${availableStockVariant.type}: ${availableStockVariant.value}`
                        : "",

                      // Original product information
                      sourceProduct: product,
                    };

                    const hasStock = Boolean(availableStockVariant);

                    return (
                      <ProductCard
                        key={product.id}
                        product={formattedProduct}
                        isWishlisted={wished}
                        onToggleWishlist={() => toggleWishlist(product.id)}
                        onAddToCart={(cardProduct) => {
                          if (
                            !Number.isInteger(Number(cardProduct.variant_id))
                          ) {
                            console.error(
                              "Invalid variant ID:",
                              cardProduct.variant_id,
                            );
                            return;
                          }

                          return addToCart(Number(cardProduct.variant_id), 1);
                        }}
                        cartLoading={cartLoading}
                        wishlistLoading={false}
                        disabled={!hasStock}
                      />
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#eeece8] pt-5">
                    <p className="text-[11px] text-[#77746e]">
                      Showing{" "}
                      <span className="font-semibold text-[#292824]">
                        {(page - 1) * pagination.page_size + 1}
                      </span>
                      {" – "}
                      <span className="font-semibold text-[#292824]">
                        {Math.min(
                          page * pagination.page_size,
                          pagination.count,
                        )}
                      </span>
                      {" of "}
                      <span className="font-semibold text-[#292824]">
                        {pagination.count}
                      </span>{" "}
                      products
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!pagination.previous || loading}
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                        className="min-h-[36px] border border-[#e5e2dc] px-4 text-xs text-[#55524d] transition-colors hover:border-[#876c4b] hover:text-[#876c4b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>

                      <span className="px-2 text-xs text-[#55524d]">
                        {page} / {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={!pagination.next || loading}
                        onClick={() => setPage((current) => current + 1)}
                        className="min-h-[36px] border border-[#876c4b] bg-[#876c4b] px-4 text-xs text-white transition-colors hover:bg-[#70583e] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
