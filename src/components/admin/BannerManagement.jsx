import {
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const BANNER_ENDPOINTS = {
  list: "/admin/controls/banners/",
  detail: (id) => `/admin/controls/banners/${id}/`,
};

const EMPTY_FORM = {
  caption: "",
  title: "",
  description: "",
  cta_text: "Shop Now",
  cta_url: "",
  is_active: true,
  display_order: 0,
};

const getError = (error) => {
  const data = error.response?.data;

  if (typeof data?.message === "string") return data.message;

  if (data?.data && typeof data.data === "object") {
    return Object.entries(data.data)
      .map(
        ([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join(" ") : value}`,
      )
      .join(" ");
  }

  return "Something went wrong. Please try again.";
};

export default function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(BANNER_ENDPOINTS.list, {
        params: {
          search: search.trim() || undefined,
          status: statusFilter,
          sort: "display_asc",
          page,
        },
      });

      const data = response.data?.data;

      setBanners(data?.results || []);
      setPagination({
        count: data?.count || 0,
        page_size: data?.page_size || 10,
        next: data?.next || null,
        previous: data?.previous || null,
      });
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);

    setForm({
      caption: banner.caption || "",
      title: banner.title || "",
      description: banner.description || "",
      cta_text: banner.cta_text || "Shop Now",
      cta_url: banner.cta_url || "",
      is_active: banner.is_active,
      display_order: banner.display_order ?? 0,
    });

    setImageFile(null);
    setImagePreview(banner.image || "");
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingBanner(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview("");
    setFormError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!editingBanner && !imageFile) {
      setFormError("Please upload a banner image.");
      return;
    }

    if (!form.title.trim() || !form.cta_url.trim()) {
      setFormError("Title and button URL are required.");
      return;
    }

    const formData = new FormData();

    formData.append("caption", form.caption);
    formData.append("title", form.title.trim());
    formData.append("description", form.description);
    formData.append("cta_text", form.cta_text.trim());
    formData.append("cta_url", form.cta_url.trim());
    formData.append("is_active", String(form.is_active));
    formData.append("display_order", String(form.display_order));

    if (imageFile) {
      formData.append("image", imageFile);
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingBanner) {
        await api.patch(BANNER_ENDPOINTS.detail(editingBanner.id), formData);
      } else {
        await api.post(BANNER_ENDPOINTS.list, formData);
      }

      setModalOpen(false);
      setEditingBanner(null);
      setForm(EMPTY_FORM);
      setImageFile(null);
      setImagePreview("");
      setFormError("");

      await loadBanners();
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Are you sure you want to delete "${banner.title}"?`)) {
      return;
    }

    setDeletingId(banner.id);
    setError("");

    try {
      await api.delete(BANNER_ENDPOINTS.detail(banner.id));

      if (banners.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await loadBanners();
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.count / pagination.page_size),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Banner Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create, edit and manage your store banners.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          <Plus size={17} />
          Add Banner
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search banners..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
        >
          <option value="all">All banners</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          onClick={loadBanners}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Banner list */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">All Banners</h3>
          <span className="text-sm text-gray-500">
            {pagination.count} banners
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="p-10 text-center">
            <ImagePlus size={32} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">
              No banners found
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Create your first store banner.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >
                <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-40">
                  {banner.image ? (
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <ImagePlus size={24} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-900">
                      {banner.title}
                    </h4>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        banner.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {banner.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {banner.caption && (
                    <p className="mt-1 text-xs text-gray-500">
                      {banner.caption}
                    </p>
                  )}

                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {banner.description || "No description"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>Button: {banner.cta_text}</span>
                    <span>Display order: {banner.display_order}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(banner)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(banner)}
                    disabled={deletingId === banner.id}
                    className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Delete banner"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.count > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * pagination.page_size + 1}–
              {Math.min(page * pagination.page_size, pagination.count)} of{" "}
              {pagination.count}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.previous}
                onClick={() => setPage((previous) => previous - 1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-xs text-gray-500">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={!pagination.next}
                onClick={() => setPage((previous) => previous + 1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {editingBanner ? "Edit Banner" : "Create Banner"}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Add your banner details and image.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
                {/* Image upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Banner Image {!editingBanner && "*"}
                  </label>

                  <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-gray-400">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Banner preview"
                        className="h-48 w-full object-contain"
                      />
                    ) : (
                      <>
                        <Upload size={25} className="text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-700">
                          Click to upload banner image
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Select an image file
                        </p>
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {imageFile && (
                    <p className="mt-2 text-xs text-gray-500">
                      Selected: {imageFile.name}
                    </p>
                  )}

                  {editingBanner && !imageFile && (
                    <p className="mt-2 text-xs text-gray-500">
                      Leave unchanged to keep the current image.
                    </p>
                  )}
                </div>

                {/* Caption */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Caption
                  </label>
                  <input
                    name="caption"
                    value={form.caption}
                    onChange={handleChange}
                    maxLength={150}
                    placeholder="e.g. New Collection"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Title *
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={255}
                    required
                    placeholder="Enter banner title"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter banner description"
                    className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                {/* CTA fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Button Text *
                    </label>
                    <input
                      name="cta_text"
                      value={form.cta_text}
                      onChange={handleChange}
                      maxLength={100}
                      required
                      placeholder="Shop Now"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Button URL *
                    </label>
                    <input
                      name="cta_url"
                      value={form.cta_url}
                      onChange={handleChange}
                      maxLength={500}
                      required
                      placeholder="/catalog"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* Display order and active status */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Display Order
                    </label>
                    <input
                      type="number"
                      name="display_order"
                      min="0"
                      value={form.display_order}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Lower numbers appear first.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-3">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 accent-gray-900"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800">
                        Active Banner
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        Show this banner on the store.
                      </span>
                    </span>
                  </label>
                </div>

                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    {formError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingBanner
                      ? "Save Changes"
                      : "Create Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
