import { AlertCircle, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import api from "../services/api";

const isImageFile = (url = "") =>
  /\.(jpe?g|png|gif|webp|bmp|avif|tiff?)(?:[?#].*)?$/i.test(url);

export default function Arrivals() {
  const { addToCart, toggleWishlist, isWishlisted } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch new arrivals
  useEffect(() => {
    let active = true;

    const fetchNewArrivals = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/catalog/products/", {
          params: {
            new_arrivals: "true",
          },
        });

        const payload = response.data?.data;

        if (!payload || !Array.isArray(payload.results)) {
          throw new Error("Invalid product response from the server.");
        }

        if (active) {
          setProducts(
            payload.results.filter((product) => product.is_active !== false),
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ??
              err.response?.data?.detail ??
              err.message ??
              "Unable to load new arrivals. Please try again.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchNewArrivals();

    return () => {
      active = false;
    };
  }, []);

  // Sort products by newest first
  const newArrivals = useMemo(
    () =>
      [...products].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      ),
    [products],
  );

  // Add product to cart
  const handleAddToCart = async (product, variant) => {
    if (!variant) return;

    await addToCart(variant.id, 1);
  };

  // Add or remove product from wishlist
  const handleWishlist = async (product) => {
    await toggleWishlist(product.id);
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-[70vh] bg-white px-[42px] py-4 text-[#242424] max-[700px]:px-[4%] max-[700px]:py-[25px]">
        <div className="mx-auto w-full max-w-[1440px]">
          <p className="py-20 text-center text-sm text-[#777]" role="status">
            Discovering our latest arrivals...
          </p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-[70vh] bg-white px-[42px] py-4 text-[#242424] max-[700px]:px-[4%] max-[700px]:py-[25px]">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3.5 text-center">
            <AlertCircle
              size={32}
              strokeWidth={1.5}
              className="text-[#8a704d]"
            />

            <h1 className="m-0 text-2xl font-medium">
              Unable to load new arrivals
            </h1>

            <p className="m-0 max-w-[420px] text-sm leading-[1.7] text-[#777]">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex min-h-[42px] items-center justify-center border border-[#242424] bg-[#242424] px-[22px] text-[13px] text-white transition-colors hover:bg-white hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a704d] focus-visible:ring-offset-2"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white px-[42px] py-4 text-[#242424] max-[700px]:px-[4%] max-[700px]:pb-[50px] max-[700px]:pt-[25px]">
      <div className="mx-auto w-full max-w-[1440px]">
        {/* Page heading */}
        {/* Page heading */}
        <header className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-[#eaeaea] pb-6 sm:flex-row sm:items-end max-[700px]:mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[2px] text-[#8a704d]">
              JUST ARRIVED
            </p>

            <h1 className="my-2 title-font">NEW ARRIVALS</h1>

            <p className="text-sm text-[#777]">
              {newArrivals.length} product
              {newArrivals.length !== 1 ? "s" : ""} available
            </p>
          </div>

          <Link
            to="/collections"
            className="inline-flex min-h-[42px] items-center justify-center border border-[#242424] bg-[#242424] px-5 text-[13px] font-medium text-white transition-colors hover:bg-white hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a704d] focus-visible:ring-offset-2"
          >
            View All Collections
          </Link>
        </header>

        {/* Empty state */}
        {newArrivals.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3.5 text-center">
            <ShoppingBag
              size={42}
              strokeWidth={1.3}
              className="text-[#8a704d]"
            />

            <h2 className="m-0 text-2xl font-medium">No new arrivals yet</h2>

            <p className="m-0 max-w-[420px] text-sm leading-[1.7] text-[#777]">
              Our latest collection will be available here soon.
            </p>

            <Link
              to="/catalog"
              className="mt-2 inline-flex min-h-[42px] items-center justify-center border border-[#242424] bg-[#242424] px-[22px] text-[13px] text-white no-underline transition-colors hover:bg-white hover:text-[#242424]"
            >
              Explore All Products
            </Link>
          </div>
        ) : (
          /* Responsive product grid */
          <section
            className="grid grid-cols-6 gap-x-5 gap-y-7 max-[1100px]:grid-cols-3 max-[1100px]:gap-x-4 max-[1100px]:gap-y-[25px] max-[700px]:grid-cols-2 max-[700px]:gap-x-3 max-[700px]:gap-y-6 max-[360px]:gap-x-[9px] max-[360px]:gap-y-5"
            aria-label="New arrival products"
          >
            {newArrivals.map((product) => {
              // Get all valid variants for displaying prices
              const allVariants = (product.variants ?? []).filter(
                (variant) =>
                  variant.is_available !== false &&
                  Number.isFinite(Number(variant.price)),
              );

              // Get only variants that can be purchased
              const availableVariants = allVariants.filter(
                (variant) => Number(variant.stock) > 0,
              );

              // Select the cheapest available variant
              const cheapestVariant = allVariants.reduce(
                (lowest, variant) =>
                  !lowest || Number(variant.price) < Number(lowest.price)
                    ? variant
                    : lowest,
                null,
              );
              const cheapestAvailableVariant = availableVariants.reduce(
                (lowest, variant) =>
                  !lowest || Number(variant.price) < Number(lowest.price)
                    ? variant
                    : lowest,
                null,
              );

              const price = Number(cheapestVariant?.price ?? 0);
              const mrp = Number(cheapestVariant?.mrp ?? 0);

              const discount =
                mrp > price && mrp > 0
                  ? Math.round(((mrp - price) / mrp) * 100)
                  : 0;

              const hasStock = Boolean(cheapestAvailableVariant);

              // Product images
              const files = product.files ?? product.images ?? [];

              const imageFiles = files.filter((file) => {
                const url = file.file ?? file.file_url ?? file.image_url ?? "";

                return url && file.is_available !== false && isImageFile(url);
              });

              const mainImage = imageFiles.find((file) => file.is_main);

              const productImage =
                product.main_image ||
                mainImage?.file ||
                mainImage?.file_url ||
                mainImage?.image_url ||
                imageFiles[0]?.file ||
                imageFiles[0]?.file_url ||
                imageFiles[0]?.image_url ||
                "";

              // Product data passed to ProductCard
              const cardProduct = {
                id: product.id,
                title: product.title,
                image: productImage,
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
                slug: product.slug,
                categorySlug: product.category_detail?.slug,
                badge: "NEW",
                variant_id: cheapestAvailableVariant?.id,
                variantLabel: cheapestVariant
                  ? `${cheapestVariant.type}: ${cheapestVariant.value}`
                  : "",
                sourceProduct: product,
              };

              return (
                <div key={product.id} className="min-w-0">
                  <ProductCard
                    product={cardProduct}
                    isWishlisted={Boolean(isWishlisted(product.id))}
                    onToggleWishlist={() => handleWishlist(product)}
                    onAddToCart={() =>
                      handleAddToCart(product, cheapestAvailableVariant)
                    }
                    disabled={!hasStock}
                  />
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
