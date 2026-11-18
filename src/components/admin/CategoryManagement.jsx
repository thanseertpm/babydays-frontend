import { useCallback, useEffect, useRef, useState } from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crop,
  FolderKanban,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import Cropper from "react-easy-crop";

import Confirm from "../Confirm";
import Toast from "../Toast";
import api, { refreshCSRFToken } from "../../services/api";

// Admin category API endpoints
const ADMIN_ENDPOINTS = {
  categories: "/admin/controls/categories/",
  categoryDetail: (id) => `/admin/controls/categories/${id}/`,
};

const PAGE_SIZE = 12;

const getCategoryList = (response) => {
  const data = response?.data?.data;

  return {
    results: data?.results || [],
    count: data?.count ?? 0,
    pageSize: data?.page_size ?? PAGE_SIZE,
  };
};

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));

    image.src = url;
  });
}

async function getCroppedImage(imageSrc, pixelCrop, fileName) {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create image canvas.");
  }

  // White background for areas outside the image
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate the actual source boundaries
  const sourceX = Math.max(0, pixelCrop.x);
  const sourceY = Math.max(0, pixelCrop.y);

  const sourceRight = Math.min(
    image.naturalWidth,
    pixelCrop.x + pixelCrop.width,
  );

  const sourceBottom = Math.min(
    image.naturalHeight,
    pixelCrop.y + pixelCrop.height,
  );

  const sourceWidth = Math.max(0, sourceRight - sourceX);
  const sourceHeight = Math.max(0, sourceBottom - sourceY);

  if (sourceWidth > 0 && sourceHeight > 0) {
    const destinationX = sourceX - pixelCrop.x;
    const destinationY = sourceY - pixelCrop.y;

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destinationX,
      destinationY,
      sourceWidth,
      sourceHeight,
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to crop image."));
          return;
        }

        resolve(
          new File([blob], fileName || "cropped-image.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      },
      "image/jpeg",
      0.92,
    );
  });
}

function ImageCropModal({ image, onApply, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [cropAspect, setCropAspect] = useState(1);

  const aspectRatios = [
    { label: "1:1", value: 1 },
    { label: "4:5", value: 4 / 5 },
    { label: "5:4", value: 5 / 4 },
  ];

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedPixels(pixels);
  }, []);

  const applyCrop = async () => {
    if (!croppedPixels || processing) return;

    try {
      setProcessing(true);
      setError("");

      const file = await getCroppedImage(
        image.preview,
        croppedPixels,
        image.file?.name || "category-image.jpg",
      );

      onApply(file);
    } catch (err) {
      console.error(err);
      setError("Unable to crop this image. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-bold text-gray-900">Crop Category Image</h3>

            <p className="mt-1 text-xs text-gray-500">
              Adjust your category image before uploading.
            </p>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={onCancel}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Aspect Ratios */}
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.label}
              type="button"
              onClick={() => setCropAspect(ratio.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                cropAspect === ratio.value
                  ? "border-black bg-black text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>

        {/* Cropper */}
        <div className="relative h-[350px] bg-white sm:h-[450px]">
          <Cropper
            image={image.preview}
            crop={crop}
            zoom={zoom}
            minZoom={0.1}
            maxZoom={3}
            aspect={cropAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition={false}
            objectFit="contain"
          />
        </div>

        {/* Controls */}
        <div className="space-y-4 border-t px-5 py-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ZoomIn size={17} />
              Zoom
            </label>

            <span className="text-xs text-gray-500">{zoom}x</span>
          </div>

          <input
            type="range"
            min={0.1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-indigo-600"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={processing}
              onClick={onCancel}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={processing || !croppedPixels}
              onClick={applyCrop}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {processing ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Crop size={16} />
              )}

              {processing ? "Cropping..." : "Crop & Add Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CategoryManagement = () => {
  const previewUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  // Category data
  const [categories, setCategories] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Backend search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Backend sorting
  const [sortBy, setSortBy] = useState("created_desc");

  // Backend pagination
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form states
  const [form, setForm] = useState({
    title: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImage, setExistingImage] = useState("");

  const [cropImage, setCropImage] = useState(null);
  const [cropProcessing, setCropProcessing] = useState(false);

  // Confirmation and toast
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [toast, setToast] = useState(null);

  // Toast helpers
  const showToast = useCallback((message, type = "success") => {
    setToast({
      message,
      type,
      duration: 3000,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Image preview cleanup
  const clearImagePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setImagePreview("");
    setImageFile(null);
  }, []);

  // Fetch all categories from the backend
  // Fetch categories using backend search, sorting and pagination.
  const fetchCategories = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get(ADMIN_ENDPOINTS.categories, {
        params: {
          search: debouncedSearch,
          sort: sortBy,
          page,
        },
      });

      const data = getCategoryList(response);

      setCategories(data.results);
      setCount(data.count);
      setPageSize(data.pageSize);
    } catch (error) {
      setCategories([]);
      setCount(0);

      showToast(
        error.response?.data?.message || "Failed to load categories.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sortBy, page, showToast]);

  // Debounce search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch categories whenever search, sorting or page changes.
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Backend pagination calculations.
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const startItem = count === 0 ? 0 : (page - 1) * pageSize + 1;

  const endItem = Math.min(page * pageSize, count);

  // Keep page within valid range after deleting/filtering
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Reset form
  const resetForm = useCallback(() => {
    setForm({
      title: "",
    });

    setExistingImage("");
    setImageFile(null);

    clearImagePreview();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setEditingId(null);
  }, [clearImagePreview]);

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (category) => {
    resetForm();

    setEditingId(category.id);

    setForm({
      title: category.title || "",
    });

    setExistingImage(category.image || "");

    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    resetForm();
  };

  // Form input handler
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Image selection
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file.", "error");
      event.target.value = "";
      return;
    }

    clearImagePreview();

    const previewUrl = URL.createObjectURL(file);

    setCropImage({
      file,
      preview: previewUrl,
    });

    event.target.value = "";
  };

  const handleApplyCrop = (croppedFile) => {
    const croppedPreview = URL.createObjectURL(croppedFile);

    // Release the original image preview.
    if (cropImage?.preview) {
      URL.revokeObjectURL(cropImage.preview);
    }

    clearImagePreview();

    previewUrlRef.current = croppedPreview;

    setImageFile(croppedFile);
    setImagePreview(croppedPreview);

    setCropImage(null);
  };

  const handleCancelCrop = () => {
    if (cropImage?.preview) {
      URL.revokeObjectURL(cropImage.preview);
    }

    setCropImage(null);
  };

  // Remove newly selected image and restore existing image
  const removeSelectedImage = () => {
    clearImagePreview();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Create or update category
  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();

    if (!title) {
      showToast("Please enter a category title.", "error");
      return;
    }

    if (!editingId && !imageFile) {
      setToast({
        type: "error",
        message: "Category image is required.",
      });
      return;
    }

    const formData = new FormData();

    formData.append("title", title);

    if (imageFile) {
      formData.append("image", imageFile);
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(ADMIN_ENDPOINTS.categoryDetail(editingId), formData);

        showToast("Category updated successfully.");
      } else {
        await api.post(ADMIN_ENDPOINTS.categories, formData);

        showToast("Category created successfully.");
      }

      const wasEditing = Boolean(editingId);

      setShowModal(false);
      resetForm();

      if (!wasEditing && page !== 1) {
        setPage(1);
      } else {
        await fetchCategories();
      }
    } catch (error) {
      const errorData = error.response?.data;

      const message =
        errorData?.message ||
        errorData?.title?.[0] ||
        errorData?.image?.[0] ||
        "Failed to save category.";

      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation
  const handleDelete = (category) => {
    setSelectedCategory(category);
  };

  // Cancel delete
  const cancelDelete = () => {
    if (deletingId !== null) return;

    setSelectedCategory(null);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedCategory) return;

    const categoryId = selectedCategory.id;

    setDeletingId(categoryId);

    try {
      await api.delete(ADMIN_ENDPOINTS.categoryDetail(categoryId));

      setSelectedCategory(null);

      showToast("Category deleted successfully.");

      if (categories.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchCategories();
      }
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to delete category.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Date formatter
  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Category Management
          </h1>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search category title..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {/* Sorting */}
          <select
            id="sortCategories"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            className="appearance-none w-full min-w-[200px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100 sm:w-auto"
          >
            <option value="created_desc">Created Date (Newest First)</option>

            <option value="created_asc">Created Date (Oldest First)</option>

            <option value="title_asc">Alphabetical (A - Z)</option>

            <option value="title_desc">Alphabetical (Z - A)</option>

            <option value="id_asc">ID (Low to High)</option>

            <option value="id_desc">ID (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Category List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        {/* Search and list heading */}

        <div className="flex flex-col gap-1  pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900">Categories</h2>

          <p className="text-xs text-gray-500">
            Showing {startItem} - {endItem} of {count} categories
          </p>
        </div>
        {/* Loading */}
        {loading ? (
          <div className="flex min-h-52 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <LoaderCircle size={22} className="animate-spin" />
              Loading categories...
            </div>
          </div>
        ) : categories.length === 0 ? (
          /* Empty state */
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-2xl bg-gray-100 p-5">
              <FolderKanban size={34} className="text-gray-400" />
            </div>

            <h3 className="text-base font-semibold text-gray-800">
              {search ? "No categories found" : "No categories available"}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-gray-500">
              {search
                ? "Try searching with a different category title."
                : "Create your first category to organize your products."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
              >
                <Plus size={17} />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Category Cards */}
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden h-[260px] bg-gray-100">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.title}
                        className="h-full w-full transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FolderKanban size={42} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-gray-900">
                          {category.title}
                        </h3>

                        {category.slug && (
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {category.slug}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
                      <CalendarDays size={15} />

                      <span>Created: {formatDate(category.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(category)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {/* Backend Pagination */}
            <div className="mt-7 flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto backdrop-blur-xs p-4">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Category" : "Create Category"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingId
                    ? "Update your category details."
                    : "Add a new category to your store."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving || Boolean(cropImage)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-5 p-6">
                {/* Category Title */}
                <div>
                  <label
                    htmlFor="category-title"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Category Title
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="category-title"
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter category title"
                    maxLength={150}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                {/* Category Image */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Category Image<span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {imagePreview || existingImage ? (
                    <div className="relative overflow-hidden rounded-xl border border-gray-200">
                      <div className="flex h-56 w-full items-center justify-center bg-gray-50 p-2">
                        <img
                          src={imagePreview || existingImage}
                          alt="Category preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={removeSelectedImage}
                          className="absolute right-3 top-3 rounded-lg bg-white p-2 text-red-600 shadow-md transition hover:bg-red-50"
                          aria-label="Remove selected image"
                        >
                          <X size={17} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-md transition hover:bg-gray-100"
                      >
                        <Pencil size={14} />
                        Change Image
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-gray-500 hover:bg-gray-100"
                    >
                      <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
                        <ImagePlus size={25} className="text-gray-500" />
                      </div>

                      <span className="text-sm font-semibold text-gray-700">
                        Upload category image
                      </span>

                      <span className="mt-1 text-xs text-gray-400">
                        Select an image from your device
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || Boolean(cropImage)}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || Boolean(cropImage)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingId ? "Update Category" : "Create Category"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          {/* CATEGORY IMAGE CROP MODAL */}
          {cropImage && (
            <ImageCropModal
              image={cropImage}
              onApply={handleApplyCrop}
              onCancel={handleCancelCrop}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <Confirm
        open={Boolean(selectedCategory)}
        title="Delete Category"
        message={
          selectedCategory
            ? `Are you sure you want to delete "${selectedCategory.title}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete Category"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={deletingId !== null}
        danger={true}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default CategoryManagement;
