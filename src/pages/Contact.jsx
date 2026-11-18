import { useState } from "react";
import {
  ArrowRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import api from "../services/api";

const topics = [
  "General inquiry",
  "Order & Delivery",
  "Size & Fit",
  "Complaints",
  "Other",
];

const contactCards = [
  {
    title: "EMAIL",
    value: "shop.aurafashions@gmail.com",
    description: "For order updates, sizing advice & support",

    action: "Send an email",
    icon: Mail,
    href: "mailto:shop.aurafashions@gmail.com",
  },
  {
    title: "PHONE",
    value: "+91 9539366154",
    description: "Mon - Sat: 10:00 AM - 6:30 PM",

    action: "Call now",
    icon: Phone,
    href: "tel:+916282326941",
  },
  {
    title: "SHOP",
    value: "Aura Fashions, Kazhakootam, Trivandrum, Kerala",
    description: "Store visits & tactile fabric styling sessions",

    action: "Get directions",
    icon: MapPin,
    href: "https://www.google.com/maps/search/?api=1&query=Kazhakootam+Trivandrum+Kerala",
  },
  {
    title: "SHOP HOURS",
    value: "Mon–Sat, 10:00 AM – 6:30 PM",
    description: "Sunday by private appointment only",
    action: "Book appointment",
    icon: Clock,
    href: "mailto:shop.aurafashions@gmail.com",
  },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "General inquiry",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/user/contact/", form);

      setSuccess(
        response.data.message || "Your message has been sent successfully."
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        topic: "General inquiry",
        message: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#f7f7f7] text-black">
      {/* CONTACT FORM SECTION */}
      <section className="px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-gray-500">
            SEND A MESSAGE
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            We'd love to hear from you
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Fill in the form and our team will reply within one business day.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-9 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* NAME */}
            <div>
              <label className="mb-2 block text-xs font-semibold">
                Name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
                maxLength={100}
                className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm outline-none transition focus:border-black"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-xs font-semibold">
                Email <span className="text-red-500">*</span>
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                maxLength={254}
                className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm outline-none transition focus:border-black"
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="mb-2 block text-xs font-semibold">
                Phone <span className="font-normal text-gray-400">(optional)</span>
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 00000 00000"
                maxLength={20}
                className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm outline-none transition focus:border-black"
              />
            </div>

            {/* TOPIC */}
            <div>
              <label className="mb-2 block text-xs font-semibold">
                Topic
              </label>

              <select
                name="topic"
                value={form.topic}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-black"
              >
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MESSAGE */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold">
              Message <span className="text-red-500">*</span>
            </label>

            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="How can we help?"
              required
              minLength={5}
              maxLength={5000}
              rows={5}
              className="w-full resize-y rounded-md border border-gray-300 px-3 py-3 text-sm outline-none transition focus:border-black"
            />
          </div>

          {/* RESPONSE MESSAGES */}
          {success && (
            <div className="mt-5 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={17} />
              {success}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* SUBMIT */}
          <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-3 rounded-md bg-black px-6 py-3 text-xs font-bold tracking-wide text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  SENDING...
                </>
              ) : (
                <>
                  SEND MESSAGE
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-xs text-gray-400">
              We respect your privacy and never share your details.
            </p>
          </div>
        </form>
      </section>

      {/* CONTACT INFORMATION SECTION */}
      <section className="border-t border-gray-200 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <p className="text-xs font-medium tracking-[0.2em] text-gray-500">
              GET IN TOUCH
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Let's start a conversation
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Have a question about sizing, our latest drops, order tracking,
              or styling advice? Our team is here to assist you every step
              of the way.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {contactCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="flex min-h-[230px] flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-md bg-gray-100 p-3">
                      <Icon size={20} strokeWidth={1.7} />
                    </div>

                  </div>

                  <div className="mt-5">
                    <p className="text-[11px] font-bold tracking-wide text-gray-400">
                      {card.title}
                    </p>

                    <h3 className="mt-2 text-sm font-semibold leading-5">
                      {card.value}
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="mb-4 border-t border-gray-100" />

                    <a
                      href={card.href}
                      target={card.href.startsWith("https://") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold transition hover:text-gray-500"
                    >
                      {card.action}
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}