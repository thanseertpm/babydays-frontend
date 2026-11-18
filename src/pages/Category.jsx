
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Link } from "react-router-dom";

import api, { refreshCSRFToken } from "../services/api";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      setLoading(true);
      setError("");

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
          setError(
            err.response?.data?.message ||
              "Unable to load categories. Please try again."
          );
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

  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return categories;

    return categories.filter((category) =>
      [category.title, category.slug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [categories, searchTerm]);

  return (
    <main className="min-h-screen bg-white text-[#22211f]">

     

      {/* Main container */}
      <section className="mx-auto px-[42px] py-4 max-[1100px]:px-6 max-[700px]:px-[15px] max-[700px]:pt-6 max-[380px]:px-[11px]">

        {/* Toolbar */}
        <div className="mb-[26px] flex items-center justify-between gap-7 border-b border-[#eeece8] pb-[23px] max-[700px]:mb-5 max-[700px]:flex-col max-[700px]:items-stretch max-[700px]:gap-[18px] max-[700px]:pb-5">

          {/* Heading */}
          <div className="min-w-0">
            <span className="mb-2 block text-[10px] font-bold leading-[1.5] tracking-[3px] text-[#876c4b]">
              AURA FASHIONS
            </span>

            <h2 className="font-serif text-[27px] font-normal leading-[1.3] text-[#22211f] max-[700px]:text-2xl">
              CATEGORIES
            </h2>

            <p className="text-[11px] text-[#89847b]">
              {loading
                ? "Discovering our collections..."
                : `${filteredCategories.length} ${
                    filteredCategories.length === 1
                      ? "Category Found"
                      : "Categories Found"
                  }`}
            </p>
          </div>

          {/* Search */}
          <div className="flex h-[42px] w-[min(300px,100%)] min-w-[210px] items-center gap-[10px] rounded-[3px] border border-[#e5e2dc] bg-white px-3 text-[#89847b] transition-colors duration-200 focus-within:border-[#876c4b] max-[700px]:w-full max-[700px]:min-w-0">

            <Search
              size={17}
              aria-hidden="true"
              className="shrink-0 text-[#876c4b]"
            />

            <input
              type="search"
              aria-label="Search categories"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-w-0 w-full border-0 bg-transparent p-0 text-xs text-[#22211f] outline-none placeholder:text-[#a09b93] [&::-webkit-search-cancel-button]:hidden"
            />

            {searchTerm && (
              <button
                type="button"
                aria-label="Clear category search"
                onClick={() => setSearchTerm("")}
                className="flex size-6 shrink-0 items-center justify-center border-0 bg-transparent text-[#77746e] transition-colors hover:text-[#876c4b]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-[35px] text-center text-[#77746e]">
            <span className="size-8 animate-spin rounded-full border-[3px] border-[#eee9e1] border-t-[#876c4b]" />

            <p className="mt-4 text-xs">
              Loading collections...
            </p>
          </div>

        ) : error ? (
          /* Error state */
          <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-[35px] text-center text-[#a43e3e]">
            <h2 className="mb-2 mt-[14px] font-serif text-2xl font-normal text-[#292824]">
              Unable to load collections
            </h2>

            <p className="max-w-[400px] text-xs leading-[1.7]">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-[18px] min-h-[38px] border border-[#876c4b] bg-white px-[18px] text-xs text-[#876c4b] transition-colors duration-200 hover:bg-[#876c4b] hover:text-white"
            >
              Try again
            </button>
          </div>

        ) : filteredCategories.length === 0 ? (
          /* Empty state */
          <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-[35px] text-center text-[#77746e]">
            <Search size={28} className="text-[#876c4b]" />

            <h2 className="mb-2 mt-[14px] font-serif text-2xl font-normal text-[#292824]">
              No collections found
            </h2>

            <p className="max-w-[400px] text-xs leading-[1.7]">
              Try another search term to find the collection you want.
            </p>

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="mt-[18px] min-h-[38px] border border-[#876c4b] bg-white px-[18px] text-xs text-[#876c4b] transition-colors duration-200 hover:bg-[#876c4b] hover:text-white"
              >
                Clear search
              </button>
            )}
          </div>

        ) : (
          /* Category grid */
          <div className="grid grid-cols-6 gap-x-5 gap-y-[30px] max-[1100px]:grid-cols-3 max-[1100px]:gap-x-[18px] max-[1100px]:gap-y-[26px] max-[700px]:grid-cols-2 max-[700px]:gap-x-3 max-[700px]:gap-y-6 max-[380px]:gap-x-[10px] max-[380px]:gap-y-[22px]">

            {filteredCategories.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group block min-w-0 overflow-hidden bg-white text-[#22211f] no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#876c4b]"
              >

                {/* Image */}
                <div className="relative aspect-[3/4] overflow-hidden bg-[#f5f3ef]">

                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.title}
                      loading="lazy"
                      className="block size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[#f0ede7] font-serif text-[25px] tracking-[4px] text-[#9b876d]">
                      AURA
                    </div>
                  )}

                  {/* Arrow */}
                  <span className="absolute bottom-3 right-3 flex size-9 translate-y-[5px] items-center justify-center rounded-full bg-white text-[#292824] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 max-[700px]:bottom-2 max-[700px]:right-2 max-[700px]:size-[30px] max-[700px]:translate-y-0 max-[700px]:opacity-100">
                    <ArrowRight size={16} />
                  </span>
                </div>

                {/* Category information */}
                <div className="flex items-center justify-between gap-2 px-px pt-[14px] max-[700px]:pt-[11px]">
                  <h3 className="min-w-0 overflow-wrap-anywhere font-serif text-base font-normal leading-[1.45] text-[#292824] max-[700px]:text-sm max-[380px]:text-[13px]">
                    {category.title}
                  </h3>

                  <ArrowRight
                    size={14}
                    className="shrink-0 text-[#876c4b] transition-transform duration-200 group-hover:translate-x-1"
                  />
                </div>

              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
