
import {
  Truck,
  RefreshCw,
  ShieldCheck,
  Headset,
} from "lucide-react";

const benefits = [
  {
    id: 1,
    icon: Truck,
    title: "Free Shipping",
    description: "On orders over ₹999",
  },
  {
    id: 2,
    icon: RefreshCw,
    title: "24-Hour Returns",
    description: "Hassle-free returns",
  },
  {
    id: 3,
    icon: ShieldCheck,
    title: "Secure Payment",
    description: "100% secure checkout",
  },
  {
    id: 4,
    icon: Headset,
    title: "24/7 Support",
    description: "We're here to help",
  },
];

export default function Features() {
  return (
    <section
      aria-label="Shopping benefits"
      className="
        w-full bg-[#f8f7f4]
        px-3 py-5
        sm:px-11 sm:py-7
         lg:py-8
      "
    >
      <div
        className="
           grid
          grid-cols-2 gap-3
          sm:gap-4
          lg:grid-cols-4 lg:gap-5
        "
      >
        {benefits.map(({ id, icon: Icon, title, description }) => (
          <div
            key={id}
            className="
              group flex min-w-0 items-center gap-3
              rounded-xl border border-[#eae5dc]
              bg-white px-3 py-4
              shadow-[0_2px_8px_rgba(0,0,0,0.02)]
              transition-all duration-300 ease-out
              hover:-translate-y-1
              hover:border-[#c9b99f]
              hover:shadow-[0_8px_22px_rgba(0,0,0,0.07)]
              sm:gap-3.5 sm:px-4 sm:py-5
              lg:justify-center lg:gap-4
              motion-reduce:transform-none
              motion-reduce:transition-none
            "
          >
            {/* Icon */}
            <div
              className="
                grid h-10 w-10 shrink-0 place-items-center
                rounded-full bg-[#f5f1e9]
                text-[#806b50]
                transition-all duration-300
                group-hover:scale-110
                group-hover:bg-[#806b50]
                group-hover:text-white
                sm:h-12 sm:w-12
                motion-reduce:transform-none
              "
            >
              <Icon
                size={22}
                strokeWidth={1.7}
                aria-hidden="true"
                className="
                  transition-transform duration-300
                  group-hover:rotate-[-6deg]
                  sm:h-6 sm:w-6
                  motion-reduce:transform-none
                "
              />
            </div>

            {/* Text */}
            <div className="min-w-0">
              <h3
                className="
                  text-[11px] font-bold leading-snug
                  text-[#242424]
                  transition-colors duration-200
                  group-hover:text-[#806b50]
                  sm:text-[13px]
                  lg:text-[14px]
                "
              >
                {title}
              </h3>

              <p
                className="
                  mt-1 text-[9px] leading-relaxed
                  text-[#85817b]
                  sm:text-[11px]
                  lg:text-xs
                "
              >
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
