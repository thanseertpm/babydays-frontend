
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const SLIDE_INTERVAL = 5000;

export default function Banner() {
  const [banners, setBanners] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [progressActive, setProgressActive] = useState(false);

  // Fetch active banners from Django.
  useEffect(() => {
    let cancelled = false;

    const fetchBanners = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/catalog/banners/");
        const result = response.data?.data ?? response.data;

        const bannerList = Array.isArray(result)
          ? result
          : Array.isArray(result?.results)
            ? result.results
            : [];

        if (!cancelled) {
          setBanners(bannerList);
          setActive(0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load banners. Please try again later."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBanners();

    return () => {
      cancelled = true;
    };
  }, []);

  // Automatically advance to the next banner.
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setActive((current) => (current + 1) % banners.length);
    }, SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  // Restart the indicator progress whenever the active slide changes.
  useEffect(() => {
    if (banners.length <= 1) return;

    setProgressActive(false);

    const timer = setTimeout(() => {
      setProgressActive(true);
    }, 30);

    return () => clearTimeout(timer);
  }, [active, banners.length]);

  const previous = () => {
    setActive((current) =>
      (current - 1 + banners.length) % banners.length
    );
  };

  const next = () => {
    setActive((current) => (current + 1) % banners.length);
  };

  const getCtaUrl = (url) => url?.trim() || "/categories";

  const isExternalUrl = (url) =>
    /^https?:\/\//i.test(url || "");

  // Loading state
  if (loading) {
    return (
      <section
        className="relative flex h-[90vh] min-h-[400px] w-full items-center justify-center overflow-hidden bg-[#e9e2d9] px-6 text-center text-[#28221d]"
        aria-label="Homepage banners"
      >
        <p className="animate-pulse text-sm font-medium tracking-wide">
          Loading collections...
        </p>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section
        className="relative flex h-[90vh] min-h-[400px] w-full items-center justify-center overflow-hidden bg-[#e9e2d9] px-6 text-center text-[#28221d]"
        aria-label="Homepage banners"
      >
        <p className="max-w-md text-sm leading-7">
          {error}
        </p>
      </section>
    );
  }

  // Empty state
  if (banners.length === 0) {
    return (
      <section
        className="relative flex h-[90vh] min-h-[400px] w-full items-center justify-center overflow-hidden bg-[#e9e2d9] px-6 text-center text-[#28221d]"
        aria-label="Homepage banners"
      >
        <p className="text-sm leading-7">
          Discover our latest collections soon.
        </p>
      </section>
    );
  }

  return (
    <section
      className="group relative isolate h-[90vh] min-h-[400px] w-full overflow-hidden bg-[#e9e2d9] text-white max-sm:min-h-[420px]"
      aria-label="Featured collections"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      {/* Banner Slides */}
      <div className="relative h-full w-full overflow-hidden">
        {banners.map((banner, index) => {
          const isActive = active === index;

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 z-0 overflow-hidden transition-[opacity,visibility] duration-[900ms] ease-in-out motion-reduce:transition-none ${
                isActive
                  ? "visible z-[1] pointer-events-auto opacity-100"
                  : "invisible pointer-events-none opacity-0"
              }`}
              aria-hidden={!isActive}
            >
              {/* Background Image */}
              {banner.image && (
                <img
                  className={`absolute inset-0 block h-full w-full object-cover object-center transition-transform duration-[5800ms] ease-[cubic-bezier(0.2,0.65,0.3,1)] motion-reduce:transform-none motion-reduce:transition-none ${
                    isActive ? "scale-100" : "scale-[1.08]"
                  }`}
                  src={banner.image}
                  alt={
                    banner.title ||
                    "Aura Fashions collection"
                  }
                  fetchPriority={index === 0 ? "high" : "auto"}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              )}

              {/* Dark Image Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,12,10,0.68)_0%,rgba(15,12,10,0.38)_42%,rgba(15,12,10,0.05)_100%)] max-[900px]:bg-[linear-gradient(90deg,rgba(15,12,10,0.64),rgba(15,12,10,0.2))]" />

              {/* Banner Content */}
              <div
                className={`absolute top-1/2 left-[clamp(24px,8vw,120px)] z-[2] w-[min(650px,calc(100%-48px))] -translate-y-[calc(50%-22px)] opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.65,0.3,1)] motion-reduce:transition-none max-[900px]:left-[7%] max-[900px]:w-[78%] max-sm:left-[26px] max-sm:w-[calc(100%-52px)] ${
                  isActive
                    ? "!translate-y-[-50%] !opacity-100 delay-200"
                    : ""
                }`}
              >
                {/* Caption */}
                {banner.caption && (
                  <p className="mb-[18px] text-xs leading-[1.6] font-semibold tracking-[0.24em] uppercase max-sm:mb-3 max-sm:text-[10px] max-sm:tracking-[0.18em]">
                    {banner.caption}
                  </p>
                )}

                {/* Title */}
                <h1 className="m-0 max-w-[650px] font-semibold text-[clamp(38px,6vw,76px)] leading-[1.08] tracking-[-0.035em] [overflow-wrap:anywhere] max-sm:text-[clamp(34px,10vw,50px)]">
                  {banner.title}
                </h1>

                {/* Description */}
                {banner.description && (
                  <p className="mt-[22px] mb-[30px] max-w-[490px] text-[clamp(14px,1.5vw,17px)] leading-[1.8] text-white/90 max-sm:mt-4 max-sm:mb-[23px] max-sm:text-sm max-sm:leading-[1.7]">
                    {banner.description}
                  </p>
                )}

                {/* CTA Button */}
                {banner.cta_text &&
                  (isExternalUrl(banner.cta_url) ? (
                    <a
                      className="inline-flex min-h-12 items-center justify-center gap-3 border border-white bg-white px-[26px] py-[13px] text-[13px] font-semibold tracking-[0.04em] text-[#171411] no-underline transition-[color,background-color,border-color] duration-300 hover:border-white hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white max-sm:min-h-11 max-sm:px-5 max-sm:py-[11px] motion-reduce:transition-none"
                      href={getCtaUrl(banner.cta_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={isActive ? 0 : -1}
                    >
                      {banner.cta_text}
                      <span aria-hidden="true">→</span>
                    </a>
                  ) : (
                    <Link
                      className="inline-flex min-h-12 items-center justify-center gap-3 border border-white bg-white px-[26px] py-[13px] text-[13px] font-semibold tracking-[0.04em] text-[#171411] no-underline transition-[color,background-color,border-color] duration-300 hover:border-white hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white max-sm:min-h-11 max-sm:px-5 max-sm:py-[11px] motion-reduce:transition-none"
                      to={getCtaUrl(banner.cta_url)}
                      tabIndex={isActive ? 0 : -1}
                    >
                      {banner.cta_text}
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Indicators */}
      {banners.length > 1 && (
        <div
          className="absolute bottom-7 left-1/2 z-[4] flex -translate-x-1/2 items-center gap-2 max-sm:bottom-[34px] max-sm:gap-1.5"
          aria-label="Choose a banner"
        >
          {banners.map((banner, index) => {
            const isActive = active === index;

            return (
              <button
                key={banner.id}
                type="button"
                className={`relative block h-1 overflow-hidden rounded-full border-0 p-0 transition-[width] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none ${
                  isActive
                    ? "w-12 bg-white/40 max-sm:w-8"
                    : "w-7 bg-white/45 max-sm:w-[18px]"
                }`}
                onClick={() => setActive(index)}
                aria-label={`Show banner ${index + 1}: ${banner.title}`}
                aria-current={isActive ? "true" : undefined}
              >
                <span
                  key={`${banner.id}-${isActive ? active : "inactive"}`}
                  className={`absolute inset-0 block origin-left rounded-full bg-white transition-transform duration-[5000ms] ease-linear motion-reduce:transition-none ${
                    isActive
                      ? progressActive
                        ? "scale-x-100 motion-reduce:scale-x-100"
                        : "scale-x-0"
                      : "scale-x-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
