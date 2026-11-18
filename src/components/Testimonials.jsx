
import {
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

import { useEffect, useState } from "react";

const testimonials = [
  {
    id: 1,
    name: "Jessica M.",
    role: "Verified Buyer",
    review:
      "Amazing quality and fast delivery! Aura Fashions is my go-to store now.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: 2,
    name: "David K.",
    role: "Verified Buyer",
    review:
      "Stylish collection and great customer service. Highly recommend!",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: 3,
    name: "Sophia R.",
    role: "Verified Buyer",
    review:
      "Love the designs! The fabric quality is top-notch and super comfortable.",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: 4,
    name: "Michael T.",
    role: "Verified Buyer",
    review:
      "Excellent quality, beautiful packaging, and a smooth shopping experience.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: 5,
    name: "Emma L.",
    role: "Verified Buyer",
    review:
      "Beautiful collection with lovely details. I will definitely shop here again.",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80",
  },
];

export default function Testimonials() {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isPaused, setIsPaused] = useState(false);

  // Determine visible cards based on screen width.
  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth <= 680) {
        setVisibleCount(1);
      } else if (window.innerWidth <= 1050) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    updateVisibleCount();

    window.addEventListener("resize", updateVisibleCount);

    return () => {
      window.removeEventListener("resize", updateVisibleCount);
    };
  }, []);

  const showPrevious = () => {
    setStartIndex(
      (current) =>
        (current - 1 + testimonials.length) % testimonials.length
    );
  };

  const showNext = () => {
    setStartIndex(
      (current) => (current + 1) % testimonials.length
    );
  };

  // Automatically advance every 4 seconds.
  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      showNext();
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isPaused]);

  // Get currently visible testimonials.
  const visibleTestimonials = Array.from(
    { length: Math.min(visibleCount, testimonials.length) },
    (_, index) =>
      testimonials[(startIndex + index) % testimonials.length]
  );

  return (
  <section className="w-full bg-white px-4 py-10 sm:px-11">
    <div className="">

      {/* Heading */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-medium text-gray-900 sm:text-3xl">
          What Our Customers Say
        </h2>

        <p className="mt-3 text-xs text-gray-500 sm:text-sm">
          Real experiences from our valued customers.
        </p>
      </div>

      {/* Testimonial Cards */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          visibleCount >= 2 ? "min-[681px]:grid-cols-2" : ""
        } ${
          visibleCount >= 3 ? "min-[1051px]:grid-cols-3" : ""
        }`}
      >
        {visibleTestimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="min-h-[132px] rounded-md border border-[#e9e3df] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs leading-5 text-gray-600">
                  “{testimonial.review}”
                </p>

                <h3 className="mt-2 text-xs font-semibold text-gray-900">
                  {testimonial.name}
                </h3>

                <p className="mt-1 text-[10px] text-gray-500">
                  {testimonial.role}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div className="mt-2 flex gap-0.5 text-[#c77b4b]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={13} fill="currentColor" />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  </section>
);
}
