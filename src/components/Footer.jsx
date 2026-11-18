import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

import {
  faFacebookF,
  faInstagram,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import api from "../services/api";

import { Link } from "react-router-dom";

const shopLinks = [
  { label: "Categories", href: "/categories" },
  { label: "Collections", href: "/collections" },
  { label: "New Arrivals", href: "/arrivals" },
  { label: "Best Sellers", href: "/trending" },
];

const serviceLinks = [
  { label: "Shipping & Delivery", href: "/shipping" },
  { label: "Returns & Exchanges", href: "/returns" },
  { label: "FAQs", href: "/faq" },
  { label: "Track Order", href: "/track-order" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

function FooterLinks({ title, links }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-4 text-[12px] font-bold leading-[1.4] text-[#202020]">
        {title}
      </h3>

      <ul className="m-0 flex list-none flex-col gap-[10px] p-0 sm:gap-0">
        {links.map((link) => (
          <li key={link.label} className="m-0 p-0">
            <Link
              to={link.href}
              className="group inline-flex max-w-full items-center gap-1 text-[10px] leading-[1.5] text-[#686868] no-underline transition-colors duration-[180ms] hover:text-[#a78656] sm:text-[11px]"
            >
              {link.label}
              <ArrowUpRight
                size={12}
                aria-hidden="true"
                className="shrink-0 -translate-x-[2px] translate-y-[2px] opacity-0 transition-all duration-[180ms] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
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
  return (
    <footer
      className="
        box-border w-full border-t border-[#e8e8e8]
        bg-white font-inherit text-[#202020]
      "
    >
      {/* Main footer */}
      <div
        className="
          grid grid-cols-2 items-start
          gap-x-[18px] gap-y-[29px]
          px-4 py-[30px]
          sm:mx-auto sm:w-[calc(100%-40px)]
          sm:grid-cols-2 sm:gap-x-7 sm:gap-y-8
          sm:px-11 sm:py-[35px]
          md:grid-cols-2
          lg:mx-0 lg:w-full
          lg:grid-cols-[1.35fr_0.8fr_1.25fr_1fr_1.25fr]
          lg:gap-x-[clamp(20px,3vw,54px)]
          lg:gap-y-9 lg:py-4
          min-[761px]:max-[1100px]:grid-cols-[1.2fr_0.8fr_1.2fr_1fr]
        "
      >
        {/* Brand */}
        <div
          className="
            col-span-2 min-w-0
            lg:col-span-1
            min-[761px]:max-[1100px]:col-span-2
          "
        >
          <Link
            to="/"
            aria-label={`${shop?.name || "Aura Fashions"} home`}
            className="block w-[200px] max-w-full"
          >
            <img
              src={shop?.logo || "/logo-sm.png"}
              alt={shop?.name || "Aura Fashions"}
              className="block w-full object-contain"
            />
          </Link>

          <p className="mt-[13px] text-[12px] font-medium leading-[1.8] text-[#343434]">
            Premium quality. Timeless style.
            <br />
            Fashion made for you.
          </p>

          <p className="mt-3 max-w-[320px] text-[11px] leading-[1.9] text-[#777] lg:max-w-[280px]">
            Discover thoughtfully curated fashion designed to make every moment
            special.
          </p>

          {/* Social links */}
          <div className="mt-[17px] flex flex-wrap items-center gap-[9px] sm:mt-5 sm:gap-[10px]">
            {shop?.instagram && (
              <a
                href={shop.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="inline-flex h-[29px] w-[29px] items-center justify-center rounded-full border border-[#e5e5e5] text-[#303030] transition-all hover:bg-[#202020] hover:text-white"
              >
                <FontAwesomeIcon icon={faInstagram} />
              </a>
            )}

            {shop?.facebook && (
              <a
                href={shop.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="inline-flex h-[29px] w-[29px] items-center justify-center rounded-full border border-[#e5e5e5] text-[#303030] transition-all hover:bg-[#202020] hover:text-white"
              >
                <FontAwesomeIcon icon={faFacebookF} />
              </a>
            )}

            {shop?.youtube && (
              <a
                href={shop.youtube}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="inline-flex h-[29px] w-[29px] items-center justify-center rounded-full border border-[#e5e5e5] text-[#303030] transition-all hover:bg-[#202020] hover:text-white"
              >
                <FontAwesomeIcon icon={faYoutube} />
              </a>
            )}
          </div>
        </div>

        {/* Navigation columns */}
        <FooterLinks title="Shop" links={shopLinks} />

        <FooterLinks title="Customer Service" links={serviceLinks} />

        <FooterLinks title="Company" links={companyLinks} />

        {/* Contact */}
        <div
          className="min-w-0 break-words min-[761px]:max-[1100px]:col-span-2 lg:col-span-1"
          style={{ overflowWrap: "anywhere" }}
        >
          <h3 className="mb-4 text-[12px] font-bold leading-[1.4] text-[#202020]">
            Contact Us
          </h3>

          <div className="mt-[18px] flex flex-col gap-2">
            {shop?.phone && (
              <a
                className="flex items-start gap-[9px] text-[10px] leading-[1.7] text-[#686868] no-underline transition-colors hover:text-[#a78656] sm:text-[11px]"
                href={`tel:${shop.phone}`}
              >
                <Phone size={14} className="mt-0.5 shrink-0 text-[#393939]" />
                <span>{shop.phone}</span>
              </a>
            )}

            {shop?.email && (
              <a
                className="flex items-start gap-[9px] text-[10px] leading-[1.7] text-[#686868] no-underline transition-colors hover:text-[#a78656] sm:text-[11px]"
                href={`mailto:${shop.email}`}
              >
                <Mail size={14} className="mt-0.5 shrink-0 text-[#393939]" />
                <span>{shop.email}</span>
              </a>
            )}

            {shop?.location && (
              <div className="flex items-start gap-[9px] text-[10px] leading-[1.7] text-[#686868] sm:text-[11px]">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#393939]" />

                {shop.direction_link ? (
                  <a
                    href={shop.direction_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-inherit no-underline transition-colors hover:text-[#a78656]"
                  >
                    {shop.location}
                  </a>
                ) : (
                  <span>{shop.location}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className=" flex w-[calc(100%-32px)] flex-wrap
          items-center justify-start gap-3
          border-t border-[#eaeaea] py-[17px]
          sm:w-[calc(100%-40px)] sm:gap-x-6 sm:gap-y-[13px]
          sm:py-3
          sm:px-11
          lg:w-full lg:justify-between
\\
        "
      >
        <p
          className="
            m-0 w-full text-[10px] leading-[1.6] text-[#777]
            lg:w-auto
          "
        >
          © {new Date().getFullYear()} Aura Fashions. All rights reserved.
        </p>

        {/* Payment badges */}
        <div
          className="flex items-center gap-[6px] sm:gap-[7px]"
          aria-label="Accepted payment methods"
        >
          <span
            className="
              inline-flex h-[22px] min-w-[34px] items-center
              justify-center rounded border border-[#e9e9e9]
              bg-white px-[5px] py-[3px]
              font-[Arial,sans-serif] text-[9px] font-extrabold
              italic text-[#173b86]
            "
          >
            VISA
          </span>

          <span
            className="
              inline-flex h-[22px] min-w-[34px] items-center
              justify-center gap-0 rounded border border-[#e9e9e9]
              bg-white px-[5px] py-[3px]
            "
          >
            <span className="h-[11px] w-[11px] rounded-full bg-[#e84141]" />
            <span className="-ml-1 h-[11px] w-[11px] rounded-full bg-[#f3a333] opacity-95" />
          </span>

          <span
            className="
              inline-flex h-[22px] min-w-[34px] items-center
              justify-center rounded border border-[#e9e9e9]
              bg-white px-[5px] py-[3px]
              font-[Arial,sans-serif] text-[9px] font-extrabold
              text-[#4b478c]
            "
          >
            UPI
          </span>

          <span
            className="
              inline-flex h-[22px] min-w-[34px] items-center
              justify-center rounded border border-[#e9e9e9]
              bg-white px-[5px] py-[3px]
              font-[Arial,sans-serif] text-[9px] font-extrabold
              text-[#3d674c]
            "
          >
            COD
          </span>
        </div>
      </div>
    </footer>
  );
}
