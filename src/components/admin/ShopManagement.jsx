import {
  CalendarDays,
  Clock,
  ImagePlus,
  MapPin,
  RefreshCw,
  Save,
  Store,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const SHOP_ENDPOINT = "/admin/controls/shop/";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  visit_from: "monday",
  visit_to: "saturday",
  visit_time_start: "",
  visit_time_end: "",
  location: "",
  direction_link: "",
  instagram: "",
  facebook: "",
  youtube: "",
};

const WEEK_DAYS = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black";

const Field = ({
  label,
  name,
  type = "text",
  placeholder = "",
  value,
  onChange,
  required = false,
}) => {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        id={name}
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={INPUT_CLASS}
      />
    </div>
  );
};

const ShopManagement = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [shopExists, setShopExists] = useState(false);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getErrorMessage = (err) => {
    const responseData = err.response?.data;

    if (responseData?.message) {
      return responseData.message;
    }

    const errors = responseData?.data || responseData;

    if (typeof errors === "string") {
      return errors;
    }

    if (errors && typeof errors === "object") {
      return Object.entries(errors)
        .map(([field, messages]) => {
          const message = Array.isArray(messages)
            ? messages.join(", ")
            : typeof messages === "string"
              ? messages
              : JSON.stringify(messages);

          return `${field.replaceAll("_", " ")}: ${message}`;
        })
        .join(" | ");
    }

    return "Something went wrong. Please try again.";
  };

  const loadShop = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get(SHOP_ENDPOINT);

      const shop = response.data?.data;

      if (!shop) {
        setForm(EMPTY_FORM);
        setShopExists(false);
        setLogoFile(null);
        setLogoPreview("");
        return;
      }

      setShopExists(true);

      setForm({
        name: shop.name || "",
        email: shop.email || "",
        phone: shop.phone || "",
        visit_from: shop.visit_from || "monday",
        visit_to: shop.visit_to || "saturday",
        visit_time_start: shop.visit_time_start || "",
        visit_time_end: shop.visit_time_end || "",
        location: shop.location || "",
        direction_link: shop.direction_link || "",
        instagram: shop.instagram || "",
        facebook: shop.facebook || "",
        youtube: shop.youtube || "",
      });

      setLogoFile(null);
      setLogoPreview(shop.logo || "");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleDayChange = (day) => {
    setForm((prev) => ({
      ...prev,
      visit_days: prev.visit_days.includes(day)
        ? prev.visit_days.filter((item) => item !== day)
        : [...prev.visit_days, day],
    }));

    setError("");
    setSuccess("");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setLogoFile(file);
    setLogoPreview(previewUrl);

    setError("");
    setSuccess("");
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview("");

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key === "visit_days") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value ?? "");
        }
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = shopExists
        ? await api.patch(SHOP_ENDPOINT, formData)
        : await api.post(SHOP_ENDPOINT, formData);

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message || "Unable to save shop information.",
        );
      }

      setSuccess(
        response.data?.message || "Shop information saved successfully.",
      );

      setShopExists(true);
      setLogoFile(null);

      await loadShop();
    } catch (err) {
      setError(
        err.message && !err.response ? err.message : getErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-3 text-sm text-gray-500">
          Loading shop information...
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-gray-800" />
            <h2 className="text-xl font-semibold text-gray-900">
              Shop Information
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Manage your shop details, visiting hours and social media links.
          </p>
        </div>

        <button
          type="button"
          onClick={loadShop}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Store className="h-5 w-5 text-gray-700" />
            <h3 className="text-base font-semibold text-gray-900">
              Basic Information
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Shop Name"
              name="name"
              placeholder="Enter shop name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <Field
              label="Email Address"
              name="email"
              type="email"
              placeholder="shop@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />

            <Field
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="Enter phone number"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          {/* Logo Upload */}
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Shop Logo
            </label>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Shop logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-xs">No logo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>

                {logoPreview && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="ml-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                )}

                <p className="text-xs text-gray-500">
                  Upload an image file. Maximum size: 5 MB.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Visiting Schedule */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gray-700" />
            <h3 className="text-base font-semibold text-gray-900">
              Shop Visiting Schedule
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Visiting From
              </label>

              <select
                name="visit_from"
                value={form.visit_from}
                onChange={handleChange}
                className={INPUT_CLASS}
              >
                {WEEK_DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Visiting To
              </label>

              <select
                name="visit_to"
                value={form.visit_to}
                onChange={handleChange}
                className={INPUT_CLASS}
              >
                {WEEK_DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Visiting Hours
              </label>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Opening Time"
                name="visit_time_start"
                type="time"
                value={form.visit_time_start}
                onChange={handleChange}
              />

              <Field
                label="Closing Time"
                name="visit_time_end"
                type="time"
                value={form.visit_time_end}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-700" />
            <h3 className="text-base font-semibold text-gray-900">
              Shop Location
            </h3>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="location"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Shop Address
                <span className="ml-1 text-red-500">*</span>
              </label>

              <textarea
                id="location"
                name="location"
                rows={3}
                value={form.location}
                onChange={handleChange}
                placeholder="Enter complete shop address"
                required
                className={INPUT_CLASS}
              />
            </div>

            <Field
              label="Google Maps Direction Link"
              name="direction_link"
              type="url"
              placeholder="https://maps.google.com/..."
              value={form.direction_link}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* Social Media */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-5 text-base font-semibold text-gray-900">
            Social Media Links
          </h3>

          <div className="grid grid-cols-1 gap-5">
            <Field
              label="Instagram URL"
              name="instagram"
              type="url"
              placeholder="https://www.instagram.com/yourpage"
              value={form.instagram}
              onChange={handleChange}
            />

            <Field
              label="Facebook URL"
              name="facebook"
              type="url"
              placeholder="https://www.facebook.com/yourpage"
              value={form.facebook}
              onChange={handleChange}
            />

            <Field
              label="YouTube URL"
              name="youtube"
              type="url"
              placeholder="https://www.youtube.com/@yourchannel"
              value={form.youtube}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* Save */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={loadShop}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {shopExists
                  ? "Update Shop Information"
                  : "Save Shop Information"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShopManagement;
