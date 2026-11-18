
import { AlertCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import api from "../services/api";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price ?? 0));

export default function Products() {
  const { slug } = useParams();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch products
  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/catalog/products/");
        const payload = response.data?.data;

        if (!Array.isArray(payload)) {
          throw new Error("Invalid product response from the server.");
        }

        if (active) {
          setProducts(payload);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ??
              err.message ??
              "Unable to load products. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      active = false;
    };
  }, []);

  // Filter products belonging to the selected category
  const categoryProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.is_active &&
          product.category_detail?.slug === slug
      ),
    [products, slug]
  );

  const category = categoryProducts[0]?.category_detail;

  const categoryTitle =
    category?.title ?? (slug || "").replaceAll("-", " ");

  // Loading state
  if (loading) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-20 text-[#282421] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-5">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#e9e3dc] border-t-[#594536]" />

          <p className="text-sm font-medium tracking-wide text-[#77716c]">
            Loading products...
          </p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-white px-4 py-16">
        <div className="flex w-full max-w-md flex-col items-center rounded-xl border border-[#eee9e4] bg-[#fdfcfb] px-6 py-12 text-center shadow-sm sm:px-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f8eeeb] text-[#a34e3c]">
            <AlertCircle size={30} strokeWidth={1.5} />
          </div>

          <h1 className="text-xl font-semibold text-[#282421] sm:text-2xl">
            Unable to load products
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#77716c]">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 bg-[#282421] px-7 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#594536] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8b7564]"
          >
            Try Again
            <ArrowRight size={16} />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-6 text-[#282421] sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
      <div className="mx-auto w-full max-w-[1440px]">

        {/* Breadcrumb */}
        <nav
          className="mb-7 flex flex-wrap items-center gap-2 text-xs capitalize text-[#89817b] sm:mb-9 sm:text-[13px]"
          aria-label="Breadcrumb"
        >
          <Link
            to="/"
            className="transition-colors hover:text-[#282421]"
          >
            Home
          </Link>

          <span className="text-[#c4bcb4]">/</span>

          <span className="font-medium text-[#282421]">
            {categoryTitle}
          </span>
        </nav>

        {/* Category Heading */}
        <header className="mb-7 flex flex-col justify-between gap-4 border-b border-[#eae6e2] pb-6 sm:mb-9 sm:pb-7 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold tracking-[2.5px] text-[#8a704d] sm:text-[11px]">
              EXPLORE OUR COLLECTION
            </p>

            <h1 className="font-serif text-[32px] leading-tight font-normal capitalize tracking-[-0.7px] text-[#282421] sm:text-4xl lg:text-[46px]">
              {categoryTitle}
            </h1>
            <div className="flex shrink-0 items-center gap-2 text-xs text-[#77716c] sm:text-sm">

            <span>
              <span className="">
                {categoryProducts.length}
              </span>{" "}
              product{categoryProducts.length !== 1 ? "s" : ""} available
            </span>
          </div>


          </div>
          

          
        </header>

        {/* Empty State */}
        {categoryProducts.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#f6f4f1] text-[#897b6e]">
              <ShoppingBag size={36} strokeWidth={1.2} />
            </div>

            <h2 className="text-xl font-semibold text-[#282421] sm:text-2xl">
              No products found
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-6 text-[#77716c]">
              There are currently no products available in this category.
              Please explore our other collections.
            </p>

            <Link
              to="/categories"
              className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 bg-[#282421] px-7 py-3 text-xs font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-[#594536] sm:text-sm"
            >
              Explore Categories
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          /* Product Grid */
          <section
            className="grid grid-cols-2 gap-x-3 gap-y-8 min-[480px]:gap-x-4 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
            aria-label="Category products"
          >
            {categoryProducts.map((product) => {
              const availableVariants = (
                product.variants ?? []
              ).filter(
                (variant) =>
                  variant.is_available &&
                  Number(variant.stock) > 0
              );

              const cheapestVariant = availableVariants.reduce(
                (lowest, variant) =>
                  !lowest ||
                  Number(variant.price) < Number(lowest.price)
                    ? variant
                    : lowest,
                null
              );

              const price = Number(cheapestVariant?.price ?? 0);
              const mrp = Number(cheapestVariant?.mrp ?? 0);

              const discount =
                mrp > price && mrp > 0
                  ? Math.round(((mrp - price) / mrp) * 100)
                  : 0;

              const cardProduct = {
                id: product.id,
                title: product.title,
                image:
                  product.main_image ||
                  product.files?.find((file) => file.is_main)?.file ||
                  product.files?.[0]?.file ||
                  "",
                price,
                originalPrice: mrp,
                discount,
                rating: Number(product.rating ?? 0),
                reviewCount: Number(
                  product.review_count ??
                    product.reviews?.length ??
                    0
                ),
                slug: product.slug,
                categorySlug:
                  product.category_detail?.slug || slug,
                badge: "NEW",
                sourceProduct: product,
              };

              return (
                <ProductCard
                  key={product.id}
                  product={cardProduct}
                  isWishlisted={isWishlisted(product.id)}
                  onToggleWishlist={(item) =>
                    toggleWishlist(item.id)
                  }
                  onAddToCart={(item) => {
                    if (cheapestVariant) {
                      addToCart(cheapestVariant.id, 1);
                    }
                  }}
                  disabled={!cheapestVariant}
                />
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
