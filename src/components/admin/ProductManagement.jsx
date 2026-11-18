import { useCallback, useEffect, useRef, useState } from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";

import {
  closestCenter,
  DndContext,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import Cropper from "react-easy-crop";
import api, { refreshCSRFToken } from "../../services/api";

import Confirm from "../Confirm";
import Toast from "../Toast";

/* -------------------------------------------------------
   API ENDPOINTS
------------------------------------------------------- */

const ADMIN_ENDPOINTS = {
  products: "/admin/controls/products/",
  productDetail: (id) => `/admin/controls/products/${id}/`,
  categories: "/admin/controls/categories/",
  deleteImage: (id) => `/admin/controls/product-images/${id}/`,
  productVariants: (productId) =>
    `/admin/controls/products/${productId}/variants/`,

  variantDetail: (id) => `/admin/controls/variants/${id}/`,
};

const INITIAL_FORM = {
  title: "",
  category: "",
  brand: "",
  description: "",
  is_active: true,
};

const PAGE_SIZE = 10;

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function unwrapResponse(response) {
  const body = response?.data;
  const data = body?.data ?? body;

  return {
    results: Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [],
    count: data?.count ?? body?.count ?? null,
  };
}

function getImageUrl(image) {
  if (typeof image === "string") return image;

  return image?.file || image?.url || image?.image || "";
}

function generateImageId() {
  return `new-${crypto.randomUUID()}`;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message || error?.response?.data?.detail || fallback
  );
}

/* -------------------------------------------------------
   IMAGE CROPPING
------------------------------------------------------- */

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

  // Fill empty areas with white
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

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
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      sourceX - pixelCrop.x,
      sourceY - pixelCrop.y,
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

/* -------------------------------------------------------
   DRAG COLLISION
------------------------------------------------------- */

function productCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args);

  const mainDrop = pointerCollisions.find(
    (collision) => collision.id === "main-image-drop-zone",
  );

  if (mainDrop) {
    return [mainDrop];
  }

  return pointerCollisions.length ? pointerCollisions : closestCenter(args);
}

/* -------------------------------------------------------
   MAIN IMAGE PLACEHOLDER
------------------------------------------------------- */

function MainImagePlaceholder({ image, dropSuccess }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "main-image-drop-zone",
  });

  const highlighted = isOver || dropSuccess;

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-h-[210px] flex-col overflow-hidden rounded-xl border-2 border-dashed transition-all ${
        highlighted
          ? "border-green-500 bg-green-50 ring-2 ring-green-100"
          : "border-indigo-300 bg-indigo-50/40"
      }`}
    >
      {image ? (
        <>
          <div className="flex min-h-[210px] flex-1 items-center justify-center p-3">
            <img
              src={image.preview || image.url}
              alt="Main product"
              className="max-h-[185px] w-full rounded-lg object-contain"
            />
          </div>

          <div className="flex items-center justify-center gap-2 bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white">
            <Star size={14} fill="currentColor" />
            {isOver ? "Release to set as main image" : "Main Image"}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-5 text-center">
          <div className="rounded-full bg-indigo-100 p-4 text-indigo-600">
            <ImagePlus size={30} />
          </div>

          <p className="mt-3 text-sm font-semibold text-gray-700">Main Image</p>

          <p className="mt-1 text-xs text-gray-500">Drag an image here</p>
        </div>
      )}

      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
          <span className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white">
            Release to select
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   SORTABLE IMAGE CARD
------------------------------------------------------- */

function SortableImage({ image, index, isMain, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-xl border bg-white ${
        isMain ? "border-indigo-500 ring-2 ring-indigo-100" : "border-gray-200"
      }`}
    >
      {/* DRAGGABLE IMAGE */}

      <div
        {...attributes}
        {...listeners}
        className="relative cursor-grab touch-none active:cursor-grabbing"
      >
        <img
          src={image.preview || image.url}
          alt={`Product image ${index + 1}`}
          draggable={false}
          className=" w-full object-contain h-[200px]"
        />

        <div className="absolute left-2 top-2 rounded-md bg-black/60 p-1.5 text-white">
          <GripVertical size={15} />
        </div>

        {isMain && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">
            <Star size={11} fill="currentColor" />
            Main
          </div>
        )}
      </div>

      {/* IMAGE FOOTER */}

      <div className="flex items-center justify-between gap-1 p-2">
        <span className="truncate text-xs text-gray-600">
          Image {index + 1}
        </span>

        <button
          type="button"
          onClick={() => onRemove(image.id)}
          className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
          title="Delete image"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   CROP MODAL
------------------------------------------------------- */

function ImageCropModal({ image, onApply, onCancel, showToast }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

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

      const file = await getCroppedImage(
        image.preview,
        croppedPixels,
        image.file?.name || "cropped-image.jpg",
      );

      onApply(image.id, file);
    } catch (err) {
      console.error(err);
      showToast("Unable to crop this image. Please try again.", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-bold text-gray-900">Crop Image</h3>
            <p className="my-1 text-xs text-gray-500">
              Crop your image before adding it to the gallery.
            </p>
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.label}
                type="button"
                onClick={() => setCropAspect(ratio.value)}
                className={`rounded-lg border px-4 py-2 text-sm mr-2 font-medium transition ${
                  cropAspect === ratio.value
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {ratio.label}
              </button>
            ))}
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

        <div className="relative h-[350px] bg-white sm:h-[450px]">
          <div className="flex flex-wrap items-center gap-2"></div>
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
          />
        </div>

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

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={processing}
              onClick={onCancel}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
            >
              Cancel Image
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

/* -------------------------------------------------------
   PRODUCT MANAGEMENT
------------------------------------------------------- */

export default function ProductManagement() {
  /* STATES */

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [sort, setSort] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");

  const [availableBrands, setAvailableBrands] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);

  // Confirmation and toast
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
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

  /* IMAGE STATES */

  const [selectedImages, setSelectedImages] = useState([]);
  const [mainImageId, setMainImageId] = useState(null);

  // Existing image IDs that must be deleted on save.
  const [deletedImageIds, setDeletedImageIds] = useState([]);

  // Newly selected images waiting for mandatory cropping.
  const [cropQueue, setCropQueue] = useState([]);
  const [cropImage, setCropImage] = useState(null);

  /* VARIANT MANAGEMENT STATES */

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);

  const [variants, setVariants] = useState([]);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantSaving, setVariantSaving] = useState(false);
  const [variantDeletingId, setVariantDeletingId] = useState(null);

  const [variantEditingId, setVariantEditingId] = useState(null);
  const [variantFormActive, setVariantFormActive] = useState(false);

  const EMPTY_VARIANT_FORM = {
    type: "",
    value: "",
    mrp: "",
    price: "",
    stock: 0,
    is_available: true,
  };

  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT_FORM);

  const openVariantModal = async (product) => {
    setSelectedVariantProduct(product);
    setShowVariantModal(true);

    setVariants([]);
    setVariantForm(EMPTY_VARIANT_FORM);
    setVariantEditingId(null);
    setVariantFormActive(false);

    try {
      setVariantLoading(true);

      const response = await api.get(
        ADMIN_ENDPOINTS.productVariants(product.id),
      );

      const data = response.data?.data ?? response.data;

      setVariants(Array.isArray(data) ? data : (data?.results ?? []));
    } catch (err) {
      showToast(
        getErrorMessage(err, "Unable to load product variants."),
        "error",
      );
    } finally {
      setVariantLoading(false);
    }
  };

  const closeVariantModal = () => {
    if (variantSaving) return;

    setShowVariantModal(false);
    setSelectedVariantProduct(null);

    setVariants([]);
    setVariantForm(EMPTY_VARIANT_FORM);

    setVariantEditingId(null);
    setVariantFormActive(false);
  };

  const startAddVariant = () => {
    setVariantEditingId(null);
    setVariantForm({
      ...EMPTY_VARIANT_FORM,
    });

    setVariantFormActive(true);
  };

  const editVariant = (variant) => {
    setVariantEditingId(variant.id);

    setVariantForm({
      type: variant.type || "",
      value: variant.value || "",
      mrp: String(variant.mrp ?? ""),
      price: String(variant.price ?? ""),
      stock: String(variant.stock ?? 0),
      is_available: variant.is_available ?? true,
    });

    setVariantFormActive(true);
  };

  const cancelVariantForm = () => {
    setVariantEditingId(null);
    setVariantForm({
      ...EMPTY_VARIANT_FORM,
    });
    setVariantFormActive(false);
  };

  const handleVariantChange = (event) => {
    const { name, value, type, checked } = event.target;

    setVariantForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const reloadVariants = async () => {
    if (!selectedVariantProduct) return;

    const response = await api.get(
      ADMIN_ENDPOINTS.productVariants(selectedVariantProduct.id),
    );

    const data = response.data?.data ?? response.data;

    setVariants(Array.isArray(data) ? data : (data?.results ?? []));

    await fetchProducts();
  };

  const submitVariant = async () => {
    if (variantSaving || !selectedVariantProduct) return;

    if (!variantForm.type.trim() || !variantForm.value.trim()) {
      showToast("Variant type and value are required.", "error");
      return;
    }

    const mrp = Number(variantForm.mrp);
    const price = Number(variantForm.price);
    const stock = Number(variantForm.stock);

    if (variantForm.mrp === "" || !Number.isFinite(mrp) || mrp < 0) {
      showToast("MRP must be zero or greater.", "error");
      return;
    }

    if (variantForm.price === "" || !Number.isFinite(price) || price < 0) {
      showToast("Selling price must be zero or greater.", "error");
      return;
    }

    // Selling price cannot exceed MRP
    if (price > mrp) {
      showToast("Selling price cannot be greater than MRP.", "error");
      return;
    }

    if (variantForm.stock === "" || !Number.isInteger(stock) || stock < 0) {
      showToast("Stock must be a non-negative whole number.", "error");
      return;
    }

    try {
      setVariantSaving(true);

      const payload = {
        ...variantForm,
        product: selectedVariantProduct.id,
        mrp,
        price,
        stock,
      };

      if (variantEditingId !== null) {
        await api.patch(
          ADMIN_ENDPOINTS.variantDetail(variantEditingId),
          payload,
        );
      } else {
        await api.post(
          ADMIN_ENDPOINTS.productVariants(selectedVariantProduct.id),
          payload,
        );
      }

      await reloadVariants();

      setVariantForm(EMPTY_VARIANT_FORM);
      setVariantEditingId(null);
      setVariantFormActive(false);

      showToast(
        variantEditingId !== null
          ? "Variant updated successfully."
          : "Variant created successfully.",
        "success",
      );
    } catch (err) {
      showToast(getErrorMessage(err, "Unable to save variant."), "error");
    } finally {
      setVariantSaving(false);
    }
  };

  const deleteVariant = async (variantId) => {
    try {
      setVariantDeletingId(variantId);

      await api.delete(ADMIN_ENDPOINTS.variantDetail(variantId));

      setSelectedVariant(null);

      if (variantEditingId === variantId) {
        setVariantEditingId(null);
        setVariantForm(EMPTY_VARIANT_FORM);
        setVariantFormActive(false);
      }

      await reloadVariants();

      showToast("Variant deleted successfully.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Unable to delete variant."), "error");
    } finally {
      setVariantDeletingId(null);
    }
  };

  const confirmDeleteVariant = () => {
    if (!selectedVariant) return;

    deleteVariant(selectedVariant.id);
  };

  const cancelDeleteVariant = () => {
    if (variantDeletingId !== null) return;

    setSelectedVariant(null);
  };
  const [mainDropSuccess, setMainDropSuccess] = useState(false);

  const fileInputRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  /* DRAG SENSORS */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  /* -----------------------------------------------------
     FETCH PRODUCTS
  ----------------------------------------------------- */

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get(ADMIN_ENDPOINTS.products, {
        params: {
          page,
          search: search.trim(),
          sort,
          category: selectedCategory,
          brand: selectedBrand,
        },
      });

      const result = unwrapResponse(response);
      const data = response.data?.data ?? response.data;

      setProducts(result.results);
      setCount(result.count ?? result.results.length);

      setAvailableBrands(data?.filter_options?.brands ?? []);
      setCategories(data?.filter_options?.categories ?? []);
    } catch (err) {
      showToast(getErrorMessage(err, "Unable to load products."), "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, sort, selectedCategory, selectedBrand, showToast]);

  /* FETCH CATEGORIES */

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get(ADMIN_ENDPOINTS.categories);
      const result = unwrapResponse(response);
      setCategories(result.results);
    } catch (err) {
      console.error("Unable to load categories:", err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* -----------------------------------------------------
     IMAGE CLEANUP
  ----------------------------------------------------- */

  const revokeImageUrls = (images) => {
    images.forEach((image) => {
      if (image.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(image.preview);
      }
    });
  };

  const clearImages = () => {
    revokeImageUrls(selectedImages);
    revokeImageUrls(cropQueue);

    setSelectedImages([]);
    setMainImageId(null);
    setDeletedImageIds([]);

    setCropQueue([]);
    setCropImage(null);

    setMainDropSuccess(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* -----------------------------------------------------
     CREATE PRODUCT MODAL
  ----------------------------------------------------- */

  const openCreateModal = () => {
    clearImages();

    setForm(INITIAL_FORM);
    setEditingId(null);

    setShowModal(true);
  };

  /* -----------------------------------------------------
     EDIT PRODUCT MODAL
  ----------------------------------------------------- */

  const openEditModal = async (product) => {
    try {
      const response = await api.get(ADMIN_ENDPOINTS.productDetail(product.id));

      const data = response.data?.data ?? response.data ?? product;

      const rawImages = data.images ?? data.files ?? data.media ?? [];

      const sourceImages = Array.isArray(rawImages)
        ? rawImages
        : (rawImages?.results ?? []);

      clearImages();

      const existingImages = sourceImages
        .filter((image) => {
          return typeof image === "string" || image.is_available !== false;
        })
        .map((image, index) => {
          const url = getImageUrl(image);

          return {
            id:
              typeof image === "string"
                ? `existing-${data.id}-${index}`
                : `existing-${image.id ?? index}`,

            existingId: typeof image === "string" ? null : (image.id ?? null),

            url,
            preview: url,
            file: null,
            isExisting: true,
            isMain: typeof image === "object" && image.is_main === true,
          };
        })
        .filter((image) => image.url);

      const mainUrl = getImageUrl(data.main_image);

      if (mainUrl) {
        existingImages.forEach((image) => {
          if (image.url === mainUrl) {
            image.isMain = true;
          }
        });
      }

      if (existingImages.length === 0 && mainUrl) {
        existingImages.push({
          id: `existing-main-${data.id}`,
          existingId: null,
          url: mainUrl,
          preview: mainUrl,
          file: null,
          isExisting: true,
          isMain: true,
        });
      }

      setSelectedImages(existingImages);

      const main =
        existingImages.find((image) => image.isMain) ||
        existingImages[0] ||
        null;

      setMainImageId(main?.id || null);

      setForm({
        title: data.title || "",
        category: String(data.category?.id ?? data.category ?? ""),
        brand: data.brand || "",
        description: data.description || "",
        is_active: data.is_active ?? true,
      });

      setEditingId(data.id);
      setShowModal(true);
    } catch (err) {
      console.error("Unable to load product:", err);

      showToast(
        getErrorMessage(err, "Unable to load product details."),
        "error",
      );
    }
  };

  /* -----------------------------------------------------
     CLOSE MODAL
  ----------------------------------------------------- */

  const closeModal = () => {
    if (saving) return;

    clearImages();

    setShowModal(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  /* FORM CHANGE */

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* -----------------------------------------------------
     IMAGE UPLOAD
     All new images must be cropped before entering gallery.
  ----------------------------------------------------- */

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);

    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length !== files.length) {
      showToast("Only image files are allowed.", "error");
    }

    if (!validFiles.length) {
      event.target.value = "";
      return;
    }

    const images = validFiles.map((file) => ({
      id: generateImageId(),
      file,
      preview: URL.createObjectURL(file),
      url: "",
      isExisting: false,
    }));

    setCropQueue((previous) => [...previous, ...images]);

    if (!cropImage && cropQueue.length === 0) {
      setCropImage(images[0]);
    }

    // The first image is shown immediately in the crop modal.
    if (!cropImage && cropQueue.length === 0) {
      setCropImage(images[0]);
    }

    event.target.value = "";
  };

  /* -----------------------------------------------------
     CROP QUEUE
  ----------------------------------------------------- */

  const handleApplyCrop = (imageId, croppedFile) => {
    const queuedImage = cropQueue.find((image) => image.id === imageId);

    if (!queuedImage) return;

    const croppedPreview = URL.createObjectURL(croppedFile);

    const croppedImage = {
      ...queuedImage,
      file: croppedFile,
      preview: croppedPreview,
      url: croppedPreview,
      isExisting: false,
    };

    setSelectedImages((previous) => {
      const updated = [...previous, croppedImage];

      // First uploaded image automatically becomes main.
      if (updated.length === 1) {
        setMainImageId(croppedImage.id);
      }

      return updated;
    });

    if (queuedImage.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(queuedImage.preview);
    }

    const remaining = cropQueue.filter((image) => image.id !== imageId);

    setCropQueue(remaining);
    setCropImage(remaining[0] || null);
  };

  const handleCancelCrop = () => {
    if (!cropImage) return;

    // Cancelling skips this image. It is not added to the gallery.
    if (cropImage.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(cropImage.preview);
    }

    const remaining = cropQueue.filter((image) => image.id !== cropImage.id);

    setCropQueue(remaining);
    setCropImage(remaining[0] || null);
  };

  /* -----------------------------------------------------
     DELETE IMAGE
  ----------------------------------------------------- */

  const removeImage = (imageId) => {
    if (selectedImages.length <= 1) {
      showToast("At least one product image is required.", "error");
      return;
    }

    const image = selectedImages.find((item) => item.id === imageId);
    if (!image) return;

    if (image.isExisting && image.existingId) {
      setDeletedImageIds((previous) => [...previous, image.existingId]);
    }

    if (image.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(image.preview);
    }

    const remaining = selectedImages.filter((item) => item.id !== imageId);
    setSelectedImages(remaining);

    if (mainImageId === imageId) {
      setMainImageId(remaining[0]?.id || null);
      setMainDropSuccess(false);
    }
  };

  /* -----------------------------------------------------
     DRAG AND DROP MAIN IMAGE
  ----------------------------------------------------- */

  const handleDragStart = () => {
    setMainDropSuccess(false);
  };

  const handleDragEnd = ({ active, over }) => {
    setMainDropSuccess(false);

    if (!over) return;

    if (String(over.id) !== "main-image-drop-zone") return;

    const draggedImage = selectedImages.find((image) => image.id === active.id);

    if (!draggedImage) return;

    // Immediately update the main image.
    setMainImageId(draggedImage.id);

    setMainDropSuccess(true);
  };

  /* MAIN IMAGE */

  const mainImage =
    selectedImages.find((image) => image.id === mainImageId) || null;

  /* -----------------------------------------------------
     SAVE PRODUCT
  ----------------------------------------------------- */

  const submitProduct = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (cropQueue.length > 0) {
      showToast("Please finish cropping all uploaded images first.", "error");
      return;
    }

    if (!form.title.trim()) {
      showToast("Product title is required.", "error");
      return;
    }

    if (!form.category) {
      showToast("Please select a category.", "error");
      return;
    }

    if (selectedImages.length === 0) {
      showToast("Please upload at least one product image.", "error");
      return;
    }

    if (!mainImage) {
      showToast("Please select a main product image.", "error");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("title", form.title.trim());
      formData.append("category", form.category);
      formData.append("brand", form.brand.trim());
      formData.append("description", form.description.trim());
      formData.append("is_active", String(form.is_active));

      // Only newly uploaded images are sent.
      const newImages = selectedImages.filter(
        (image) => !image.isExisting && image.file,
      );

      newImages.forEach((image) => {
        formData.append("images", image.file);
      });

      // Persist main image selection.
      if (mainImage.isExisting && mainImage.existingId) {
        formData.append("main_image_id", String(mainImage.existingId));
      } else {
        const mainNewIndex = newImages.findIndex(
          (image) => image.id === mainImage.id,
        );

        formData.append("main_image_new_index", String(mainNewIndex));
      }

      const wasEditing = editingId !== null;

      let response;

      if (wasEditing) {
        response = await api.patch(
          ADMIN_ENDPOINTS.productDetail(editingId),
          formData,
        );

        // Delete existing images that were removed in the UI.
        for (const imageId of deletedImageIds) {
          await api.delete(ADMIN_ENDPOINTS.deleteImage(imageId));
        }
      } else {
        response = await api.post(ADMIN_ENDPOINTS.products, formData);
      }

      clearImages();

      setShowModal(false);
      setEditingId(null);
      setForm(INITIAL_FORM);

      showToast(
        wasEditing
          ? "Product updated successfully."
          : "Product created successfully.",
        "success",
      );

      await fetchProducts();
    } catch (err) {
      console.error("Product save failed:", err);

      showToast(getErrorMessage(err, "Unable to save product."), "error");
    } finally {
      setSaving(false);
    }
  };

  /* -----------------------------------------------------
     DELETE PRODUCT
  ----------------------------------------------------- */

  const deleteProduct = async (productId) => {
    try {
      setDeletingId(productId);

      await api.delete(ADMIN_ENDPOINTS.productDetail(productId));

      setSelectedProduct(null);

      showToast("Product deleted successfully.", "success");

      await fetchProducts();
    } catch (err) {
      showToast(getErrorMessage(err, "Unable to delete product."), "error");
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteProduct = () => {
    if (!selectedProduct) return;

    deleteProduct(selectedProduct.id);
  };

  const cancelDeleteProduct = () => {
    if (deletingId !== null) return;

    setSelectedProduct(null);
  };

  /* -----------------------------------------------------
     UI
  ----------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Product Management
          </h1>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* SEARCH AND FILTERS */}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          {/* SEARCH */}

          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search products..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-9 text-sm outline-none focus:border-gray-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* SORT */}

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className=" w-max appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title_asc">Title: A to Z</option>
            <option value="title_desc">Title: Z to A</option>
            <option value="brand_asc">Brand: A to Z</option>
            <option value="brand_desc">Brand: Z to A</option>
          </select>

          {/* CATEGORY FILTER */}

          <select
            value={selectedCategory}
            onChange={(event) => {
              setSelectedCategory(event.target.value);
              setPage(1);
            }}
            className="w-max appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
          >
            <option value="all">All Categories</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>

          {/* BRAND FILTER */}

          <select
            value={selectedBrand}
            onChange={(event) => {
              setSelectedBrand(event.target.value);
              setPage(1);
            }}
            className="w-max appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
          >
            <option value="all">All Brands</option>

            {availableBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PRODUCT TABLE - SAME LISTING UI */}

      {/* PRODUCT RESULTS */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* RESULTS HEADER */}

        <div className="flex flex-col justify-between gap-2 px-5 pt-4 sm:flex-row sm:items-center">
          <h2 className="text-base font-semibold text-gray-900">Products</h2>

          <p className="text-xs text-gray-500">
            Showing {count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
            {" - "}
            {Math.min(page * PAGE_SIZE, count)}
            {" of "}
            {count} products
          </p>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <LoaderCircle size={28} className="mb-3 animate-spin" />
            <p className="text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          /* EMPTY STATE */

          <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
            <div className="rounded-2xl bg-gray-100 p-5 text-gray-400">
              <Package size={36} />
            </div>

            <h3 className="mt-4 text-base font-semibold text-gray-800">
              No products found
            </h3>

            <p className="mt-1 max-w-sm text-sm text-gray-500">
              {search || selectedCategory !== "all" || selectedBrand !== "all"
                ? "Try changing your search or filters to find products."
                : "You haven't added any products yet. Start by adding your first product."}
            </p>

            {!search &&
              selectedCategory === "all" &&
              selectedBrand === "all" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
                >
                  <Plus size={17} />
                  Add Product
                </button>
              )}
          </div>
        ) : (
          /* PRODUCT GRID */

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const category = categories.find(
                (item) =>
                  item.id === product.category ||
                  item.id === product.category?.id,
              );

              const productImage =
                product.main_image ||
                product.images?.find((image) => image.is_main)?.file ||
                product.images?.[0]?.file;

              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-sm"
                >
                  {/* PRODUCT IMAGE */}

                  <div className="relative flex h-[220px] items-center justify-center bg-gray-50 p-4">
                    {productImage ? (
                      <img
                        src={getImageUrl(productImage)}
                        alt={product.title}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <ImageIcon size={42} />
                      </div>
                    )}

                    <span
                      className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
                        product.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* PRODUCT DETAILS */}

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="truncate text-sm font-semibold text-gray-900">
                        {product.title}
                      </h3>

                      <p className="mt-1 truncate text-xs text-gray-400">
                        {product.slug}
                      </p>
                    </div>

                    <div className="space-y-1.5 border-t border-gray-100 pt-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Category</span>
                        <span className="truncate font-medium text-gray-700">
                          {product.category_detail?.title ||
                            category?.title ||
                            "—"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Brand</span>
                        <span className="truncate font-medium text-gray-700">
                          {product.brand || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Variants</span>
                        <span className="truncate font-medium text-gray-700">
                          {product.variants?.length ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="flex justify-between border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        onClick={() => openVariantModal(product)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <Package size={14} />
                        {product.variants?.length > 0
                          ? "Manage Variants"
                          : "Add Variants"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === product.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* -------------------------------------------------
   VARIANT MANAGEMENT MODAL
------------------------------------------------- */}

        {showVariantModal && selectedVariantProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-6">
            <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              {/* HEADER */}

              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Manage Product Variants
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Add, edit, and manage product variants.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeVariantModal}
                  disabled={variantSaving}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                {/* PRODUCT INFORMATION */}

                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
                    {selectedVariantProduct.main_image ? (
                      <img
                        src={selectedVariantProduct.main_image}
                        alt={selectedVariantProduct.title}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon size={28} className="text-gray-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-gray-900">
                      {selectedVariantProduct.title}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {selectedVariantProduct.brand || "No brand"}
                    </p>

                    <p className="mt-2 text-xs font-medium text-indigo-600">
                      {variants.length} variant(s)
                    </p>
                  </div>
                </div>

                {/* ALERTS */}

                {/* VARIANT LIST */}

                <div className="space-y-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Product Variants
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        All variants associated with this product.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={startAddVariant}
                      disabled={
                        variantLoading || variantSaving || variantFormActive
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
                    >
                      <Plus size={16} />
                      Add Variant
                    </button>
                  </div>

                  {/* TABLE */}

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3">MRP</th>
                            <th className="px-4 py-3">Selling Price</th>
                            <th className="px-4 py-3">Stock</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {/* Existing variants */}
                          {variants.map((variant) => {
                            const isEditing = variantEditingId === variant.id;

                            return (
                              <tr
                                key={variant.id}
                                className={
                                  isEditing
                                    ? "bg-indigo-50/50"
                                    : "hover:bg-gray-50"
                                }
                              >
                                {isEditing ? (
                                  <>
                                    {/* Type */}
                                    <td className="px-3 py-3">
                                      <input
                                        type="text"
                                        name="type"
                                        value={variantForm.type}
                                        onChange={handleVariantChange}
                                        placeholder="e.g. Size"
                                        className="w-full min-w-[100px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                      />
                                    </td>

                                    {/* Value */}
                                    <td className="px-3 py-3">
                                      <input
                                        type="text"
                                        name="value"
                                        value={variantForm.value}
                                        onChange={handleVariantChange}
                                        placeholder="e.g. Large"
                                        className="w-full min-w-[100px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                      />
                                    </td>

                                    {/* MRP */}
                                    <td className="px-3 py-3">
                                      <input
                                        type="number"
                                        name="mrp"
                                        min="0"
                                        step="0.01"
                                        value={variantForm.mrp}
                                        onChange={handleVariantChange}
                                        placeholder="MRP"
                                        className="w-full min-w-[90px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                      />
                                    </td>

                                    {/* Selling Price */}
                                    <td className="px-3 py-3">
                                      <input
                                        type="number"
                                        name="price"
                                        min="0"
                                        step="0.01"
                                        value={variantForm.price}
                                        onChange={handleVariantChange}
                                        placeholder="Price"
                                        className="w-full min-w-[90px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                      />
                                    </td>

                                    {/* Stock */}
                                    <td className="px-3 py-3">
                                      <input
                                        type="number"
                                        name="stock"
                                        min="0"
                                        step="5"
                                        value={variantForm.stock}
                                        onChange={handleVariantChange}
                                        className="w-full min-w-[70px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                      />
                                    </td>

                                    {/* Availability */}
                                    <td className="px-3 py-3">
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          name="is_available"
                                          checked={variantForm.is_available}
                                          onChange={handleVariantChange}
                                          className="h-4 w-4 rounded accent-indigo-600"
                                        />
                                        <span className="text-xs text-gray-600">
                                          Available
                                        </span>
                                      </label>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-3">
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          disabled={variantSaving}
                                          onClick={submitVariant}
                                          className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 disabled:opacity-50"
                                        >
                                          <Check size={19} strokeWidth={2.5} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={cancelVariantForm}
                                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                        >
                                          <X size={19} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                      {variant.type}
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {variant.value}
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      ₹
                                      {Number(variant.mrp).toLocaleString(
                                        "en-IN",
                                      )}
                                    </td>

                                    <td className="px-4 py-3 font-medium text-gray-800">
                                      ₹
                                      {Number(variant.price).toLocaleString(
                                        "en-IN",
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-gray-600">
                                      {variant.stock}
                                    </td>

                                    <td className="px-4 py-3">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                          variant.is_available
                                            ? "bg-green-50 text-green-700"
                                            : "bg-red-50 text-red-600"
                                        }`}
                                      >
                                        {variant.is_available
                                          ? "Available"
                                          : "Unavailable"}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3">
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => editVariant(variant)}
                                          disabled={variantFormActive}
                                          title="Edit variant"
                                          className="disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          <Pencil size={16} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedVariant(variant)
                                          }
                                          disabled={
                                            variantFormActive ||
                                            variantDeletingId === variant.id
                                          }
                                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                          title="Delete variant"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}

                          {/* New variant row */}
                          {variantFormActive && variantEditingId === null && (
                            <tr className="bg-indigo-50/50">
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  name="type"
                                  value={variantForm.type}
                                  onChange={handleVariantChange}
                                  placeholder="e.g. Size"
                                  className="w-full min-w-[100px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  name="value"
                                  value={variantForm.value}
                                  onChange={handleVariantChange}
                                  placeholder="e.g. Large"
                                  className="w-full min-w-[100px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  name="mrp"
                                  min="0"
                                  step="0.01"
                                  value={variantForm.mrp}
                                  onChange={handleVariantChange}
                                  placeholder="MRP"
                                  className="w-full min-w-[90px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  name="price"
                                  min="0"
                                  step="0.01"
                                  value={variantForm.price}
                                  onChange={handleVariantChange}
                                  placeholder="Price"
                                  className="w-full min-w-[90px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  name="stock"
                                  min="0"
                                  value={variantForm.stock}
                                  onChange={handleVariantChange}
                                  className="w-full min-w-[70px] rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    name="is_available"
                                    checked={variantForm.is_available}
                                    onChange={handleVariantChange}
                                    className="h-4 w-4 rounded accent-indigo-600"
                                  />
                                  <span className="text-xs text-gray-600">
                                    Available
                                  </span>
                                </label>
                              </td>

                              <td className="px-3 py-3">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={submitVariant}
                                    disabled={variantSaving}
                                    className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 disabled:opacity-50"
                                  >
                                    <Check size={19} strokeWidth={2.5} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={cancelVariantForm}
                                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <X size={19} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Empty state */}
                          {variants.length === 0 && !variantFormActive && (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-10 text-center text-sm text-gray-500"
                              >
                                No variants added yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
            </div>
          </div>
        )}
        {/* PAGINATION */}

        {!loading && count > 0 && (
          <div className="flex flex-col justify-between gap-3 border-t px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((previous) => previous - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((previous) => previous + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------
         CREATE / EDIT MODAL
      ------------------------------------------------- */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6">
          <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Product" : "Create Product"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Enter product details and manage images.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={submitProduct}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* PRODUCT DETAILS */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Product Title *
                    </label>

                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Enter product title"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Category *
                    </label>

                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="">Select category</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Brand
                    </label>

                    <input
                      name="brand"
                      value={form.brand}
                      onChange={handleChange}
                      placeholder="Enter brand"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Enter product description"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* -------------------------------------------------
                   PRODUCT IMAGES
                ------------------------------------------------- */}

                <div className="space-y-4 border-t pt-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Product Images
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Upload, crop, and drag an image into the main image box.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={cropQueue.length > 0}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Upload size={16} />
                      Upload Images
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={productCollisionDetection}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setMainDropSuccess(false)}
                  >
                    <SortableContext
                      items={selectedImages.map((image) => image.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {/* FIRST BOX: MAIN IMAGE PLACEHOLDER */}

                        {mainImage && (
                          <MainImagePlaceholder
                            image={mainImage}
                            dropSuccess={mainDropSuccess}
                          />
                        )}

                        {/* REMAINING IMAGE GALLERY */}

                        {selectedImages.map((image, index) => (
                          <SortableImage
                            key={image.id}
                            image={image}
                            index={index}
                            isMain={image.id === mainImageId}
                            onRemove={removeImage}
                          />
                        ))}

                        {/* EMPTY GALLERY PLACEHOLDER */}

                        {selectedImages.length === 0 && (
                          <div className="flex min-h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 text-center">
                            <ImageIcon size={30} className="text-gray-300" />
                            <p className="mt-2 text-xs text-gray-500">
                              No gallery images
                            </p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* IMAGE INFORMATION */}

                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs leading-5 text-gray-500">
                      <strong className="text-gray-700">Instructions:</strong>{" "}
                      Every new image must be cropped before being added. Drag
                      any gallery image into the first box to select the main
                      image. Existing images are not cropped when editing. Use
                      the delete icon to remove images.
                    </p>
                  </div>

                  {cropQueue.length > 0 && (
                    <p className="text-xs font-medium text-indigo-600">
                      {cropQueue.length} image(s) waiting for cropping.
                    </p>
                  )}
                </div>

                {/* ACTIVE STATUS */}

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  />
                  Product is active
                </label>
              </div>

              {/* FOOTER */}

              <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || cropQueue.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Product"
                      : "Create Product"}
                </button>
              </div>
            </form>

            {/* CROP MODAL */}

            {cropImage && (
              <ImageCropModal
                image={cropImage}
                onApply={handleApplyCrop}
                onCancel={handleCancelCrop}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      )}
      {/* PRODUCT DELETE CONFIRMATION */}
      <Confirm
        open={Boolean(selectedProduct)}
        title="Delete Product"
        message={
          selectedProduct
            ? `Are you sure you want to delete "${selectedProduct.title}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete Product"
        onConfirm={confirmDeleteProduct}
        onCancel={cancelDeleteProduct}
        loading={deletingId !== null}
        danger={true}
      />

      {/* VARIANT DELETE CONFIRMATION */}
      <Confirm
        open={Boolean(selectedVariant)}
        title="Delete Variant"
        message={
          selectedVariant
            ? `Are you sure you want to delete "${selectedVariant.type}: ${selectedVariant.value}"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete Variant"
        onConfirm={confirmDeleteVariant}
        onCancel={cancelDeleteVariant}
        loading={variantDeletingId !== null}
        danger={true}
      />

      {/* TOAST */}
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
}
