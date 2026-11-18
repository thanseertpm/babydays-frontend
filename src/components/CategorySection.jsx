import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { refreshCSRFToken } from "../services/api";

export default function CategorySection() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const response = await api.get("/catalog/categories/");
        const data = response.data?.data ?? response.data;

        const results = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        if (!cancelled) {
          setCategories(results);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Failed to load categories.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="categories"
      className="w-full bg-white px-4 pt-7 text-[#242424] sm:px-11 sm:pt-8 lg:pt-9"
    >
      {/* Heading */}
      <div className="mb-[17px] flex items-center justify-between gap-2 sm:gap-3 lg:mb-[22px] lg:items-end lg:gap-5">
        <div className="min-w-0">
          <h2 className="title-font text-[21px] font-medium leading-[1.3] tracking-[-0.5px] sm:text-[21px] lg:text-[30px]">
            Shop by Categories
          </h2>
        </div>

        <Link
          to="/categories"
          className="group inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap text-[10px] leading-normal text-[#242424] transition-colors duration-200 hover:text-[#9b794a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9b794a] sm:gap-[5px] sm:text-xs"
        >
          View All Categories
          <ArrowRight
            size={15}
            className="shrink-0 transition-transform duration-200 group-hover:translate-x-[3px] sm:size-[15px]"
          />
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <p className="py-5 text-[13px] leading-relaxed text-[#777]">
          Loading categories...
        </p>
      ) : error ? (
        /* Error State */
        <p className="py-5 text-[13px] leading-relaxed text-[#b42318]">
          {error}
        </p>
      ) : categories.length === 0 ? (
        /* Empty State */
        <p className="py-5 text-[13px] leading-relaxed text-[#777]">
          No categories available.
        </p>
      ) : (
        /* Category Grid */
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-[18px] sm:grid-cols-3 sm:gap-[15px] lg:grid-cols-4 lg:gap-[18px] xl:grid-cols-6">
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category.id}
              to={`/categories/${category.slug}`}
              aria-label={`Shop ${category.title}`}
              className="group block min-w-0 overflow-hidden rounded-[3px] border border-[#e9e5df] bg-white text-[#242424] no-underline hover:shadow-xl transition-all duration-[220ms] ease-in-out hover:-translate-y-[3px] hover:border-[#d6c8b9] hover:shadow-[0_10px_22px_rgba(0,0,0,0.07)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9b794a]"
            >
              {/* Image */}
              <div className="relative isolate aspect-square w-full overflow-hidden bg-[#eeeae5] sm:aspect-[1.05/0.95]">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.title}
                    loading="lazy"
                    className="absolute inset-0 block h-full w-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(0.2,0.65,0.3,1)]"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#e8e0d7] to-[#c9b9a8] text-2xl font-semibold tracking-[4px] text-white">
                    AURA
                  </div>
                )}

                {/* Image Overlay */}
                <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent from-[40%] to-black/[0.14]" />

                {/* Bottom Glass Content */}
                <div className="absolute inset-x-0 bottom-0 z-[2] flex min-h-[45px] flex-col justify-center rounded-t-[3px] bg-white/[0.76] p-[9px] backdrop-blur-[8px] transition-colors duration-[220ms] group-hover:bg-white/[0.82] sm:min-h-12 sm:p-3">
                  <h3 className="break-words text-[11px] font-semibold leading-[1.5] transition-colors duration-[220ms] group-hover:text-[#9b794a] sm:text-base">
                    {category.title}
                  </h3>

                  {/* Shop Now */}
                  <div className="mt-[6px] flex max-h-9 w-full translate-y-0 items-center justify-between gap-[5px] overflow-hidden text-[12px] font-semibold leading-[1.4] text-[#242424] opacity-100 transition-all duration-300 sm:mt-0 sm:max-h-0 sm:translate-y-[6px] sm:opacity-0 sm:group-hover:mt-[7px] sm:group-hover:max-h-9 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-visible:mt-[7px] sm:group-focus-visible:max-h-9 sm:group-focus-visible:translate-y-0 sm:group-focus-visible:opacity-100">
                    <span>Shop Now</span>

                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[#242424] transition-all duration-[220ms] group-hover:translate-x-[2px]  group-hover:text-black sm:size-6">
                      <ArrowRight size={15} strokeWidth={1.8} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
