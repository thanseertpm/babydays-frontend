import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";

import api from "../services/api";

const emptyAddress = {
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  landmark: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  address_type: "home",
  is_default: false,
};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price ?? 0));

const getPayload = (response) => response?.data?.data ?? response?.data ?? null;

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.detail) return data.detail;

  const firstError = Object.values(data || {})
    .flat()
    .find((value) => typeof value === "string");

  return firstError || error.message || "Something went wrong.";
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-100 disabled:bg-gray-100";

const labelClass = "mb-2 block text-sm font-medium text-gray-700";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const { refreshCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get("session_id");

  const [session, setSession] = useState(null);
  const [addresses, setAddresses] = useState([]);

  const [selectedAddressId, setSelectedAddressId] = useState("");

  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [activeStep, setActiveStep] = useState(1);

  const checkoutItems = session?.items ?? [];

  const subtotal = useMemo(
    () =>
      checkoutItems.reduce(
        (total, item) =>
          total + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
        0,
      ),
    [checkoutItems],
  );
  const couponDiscount = Number(appliedCoupon?.discount_amount ?? 0);

  const discountedSubtotal = Math.max(subtotal - couponDiscount, 0);

  const shipping = discountedSubtotal > 999 ? 0 : 100;

  const total = discountedSubtotal + shipping;

  const itemCount = checkoutItems.reduce(
    (count, item) => count + Number(item.quantity ?? 0),
    0,
  );

  const loadCheckout = useCallback(async () => {
    if (!sessionId) {
      setError("Checkout session is missing. Please start checkout again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [sessionResponse, addressResponse] = await Promise.all([
        api.get(
          `/user/checkout-sessions/?session_id=${encodeURIComponent(
            sessionId,
          )}`,
        ),
        api.get("/user/addresses/"),
      ]);

      const sessionData = getPayload(sessionResponse);
      const addressData = getPayload(addressResponse);

      if (!sessionData?.id) {
        throw new Error("Unable to retrieve your checkout session.");
      }

      if (sessionData.status !== "pending") {
        throw new Error("This checkout session is no longer available.");
      }

      if (!Array.isArray(sessionData.items) || !sessionData.items.length) {
        throw new Error("Your checkout session is empty.");
      }

      const addressList = Array.isArray(addressData)
        ? addressData
        : (addressData?.results ?? []);

      setSession(sessionData);
      setAddresses(addressList);

      const defaultAddress = addressList.find((address) => address.is_default);

      setSelectedAddressId(
        String(defaultAddress?.id ?? addressList[0]?.id ?? ""),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  const refreshAddresses = async () => {
    const response = await api.get("/user/addresses/");
    const data = getPayload(response);

    const list = Array.isArray(data) ? data : (data?.results ?? []);

    setAddresses(list);

    return list;
  };

  const resetAddressForm = () => {
    setAddressForm(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const startAddAddress = () => {
    setError("");

    setAddressForm({
      ...emptyAddress,
      is_default: addresses.length === 0,
    });

    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  const startEditAddress = (address) => {
    setError("");

    setAddressForm({
      ...emptyAddress,
      ...address,
    });

    setEditingAddressId(address.id);
    setShowAddressForm(true);
  };

  const handleAddressField = (event) => {
    const { name, value, type, checked } = event.target;

    setAddressForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveAddress = async (event) => {
    event.preventDefault();

    setSavingAddress(true);
    setError("");

    try {
      const payload = {
        ...addressForm,
        is_default: addressForm.is_default || addresses.length === 0,
      };

      const response = editingAddressId
        ? await api.patch(`/user/addresses/${editingAddressId}/`, payload)
        : await api.post("/user/addresses/", payload);

      const savedAddress = getPayload(response);

      const list = await refreshAddresses();

      setSelectedAddressId(String(savedAddress.id));

      resetAddressForm();

      // Select the address step after saving.
      setActiveStep(1);

      if (!list.length) {
        setError("Address was saved, but no addresses were returned.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefault = async (address) => {
    setSettingDefaultId(address.id);
    setError("");

    try {
      await api.post(`/user/addresses/${address.id}/`);

      await refreshAddresses();

      setSelectedAddressId(String(address.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDeleteAddress = async (address) => {
    if (!window.confirm("Are you sure you want to remove this address?")) {
      return;
    }

    setDeletingAddressId(address.id);
    setError("");

    try {
      await api.delete(`/user/addresses/${address.id}/`);

      const list = await refreshAddresses();

      if (String(address.id) === selectedAddressId) {
        const fallback = list.find((item) => item.is_default) ?? list[0];

        setSelectedAddressId(String(fallback?.id ?? ""));
      }

      if (editingAddressId === address.id) {
        resetAddressForm();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter a coupon code.");
      return;
    }

    if (!sessionId) {
      setError("Checkout session is missing. Please start checkout again.");
      return;
    }

    setApplyingCoupon(true);
    setError("");

    try {
      const response = await api.post("/user/coupons/apply/", {
        session_id: sessionId,
        code,
      });

      const coupon = getPayload(response);

      if (!coupon || !coupon.code) {
        throw new Error("Unable to retrieve coupon details.");
      }

      setAppliedCoupon(coupon);
      setCouponCode(coupon.code);
    } catch (err) {
      setAppliedCoupon(null);
      setError(getErrorMessage(err));
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setError("");
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError("Please select a delivery address.");
      setActiveStep(1);
      return;
    }

    if (!checkoutItems.length) {
      setError("Your checkout session is empty.");
      return;
    }

    setError("");
    setPlacingOrder(true);

    // Keep the loading state active while Razorpay Checkout is open.
    let checkoutOpened = false;

    try {
      // ==========================================
      // 1. CASH ON DELIVERY
      // ==========================================
      if (paymentMethod === "cod") {
        const response = await api.post("/user/checkout/", {
          session_id: sessionId,
          address_id: Number(selectedAddressId),
          payment_method: "cod",
          coupon_code: appliedCoupon?.code || "",
        });

        const order = getPayload(response);

        if (!order?.order_number) {
          throw new Error("Order confirmation could not be retrieved.");
        }

        await refreshCart();
        setSuccessOrder(order);
        return;
      }

      // ==========================================
      // 2. RAZORPAY ONLINE PAYMENT
      // ==========================================

      // Load Razorpay Checkout SDK.
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Checkout. Please try again.");
      }

      // Create Razorpay order through Django.
      const createResponse = await api.post("/user/payments/create-order/", {
        session_id: sessionId,
        address_id: Number(selectedAddressId),
        coupon_code: appliedCoupon?.code || "",
      });

      const paymentOrder = getPayload(createResponse);

      const razorpayKeyId = paymentOrder?.razorpay_key_id;
      const razorpayOrderId = paymentOrder?.razorpay_order_id;
      const amountPaise = Number(paymentOrder?.amount);

      if (
        !razorpayKeyId ||
        !razorpayOrderId ||
        !Number.isFinite(amountPaise) ||
        amountPaise <= 0
      ) {
        console.error("Invalid Razorpay order response:", paymentOrder);

        throw new Error(
          "Unable to initialize online payment. Please try again.",
        );
      }
      // Find selected delivery address for Razorpay prefill.
      const selectedAddress = addresses.find(
        (address) => String(address.id) === selectedAddressId,
      );

      // Razorpay Checkout configuration.
      const options = {
        key: razorpayKeyId,
        amount: amountPaise,
        currency: paymentOrder.currency || "INR",
        order_id: razorpayOrderId,

        name: "Aura Fashions",
        description: "Order payment",

        prefill: {
          name: selectedAddress?.full_name || "",
          contact: selectedAddress?.phone || "",
        },

        notes: {
          checkout_session_id: sessionId,
        },

        theme: {
          color: "#000000",
        },

        // Razorpay returns these details after successful payment.
        handler: async function (razorpayResponse) {
          setError("");
          setPlacingOrder(true);

          try {
            // Verify payment on Django backend.
            const verifyResponse = await api.post("/user/payments/verify/", {
              razorpay_order_id: razorpayResponse.razorpay_order_id,

              razorpay_payment_id: razorpayResponse.razorpay_payment_id,

              razorpay_signature: razorpayResponse.razorpay_signature,
            });

            const order = getPayload(verifyResponse);

            if (!order?.order_number) {
              throw new Error(
                "Payment verification succeeded, but order confirmation could not be retrieved.",
              );
            }

            await refreshCart();

            setSuccessOrder(order);
          } catch (err) {
            setError(
              "Your payment may have been completed, but order confirmation could not be retrieved. Please do not make another payment yet. Contact support with your payment ID: " +
                razorpayResponse.razorpay_payment_id,
            );

            console.error("Razorpay verification error:", err);
          } finally {
            setPlacingOrder(false);
          }
        },

        modal: {
          ondismiss: function () {
            setPlacingOrder(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      // Handle payment failure reported by Razorpay Checkout.
      razorpay.on("payment.failed", function (response) {
        const description =
          response?.error?.description ||
          "Your payment could not be completed.";

        setError(description);
        setPlacingOrder(false);
      });

      // Open Razorpay Checkout.
      razorpay.open();

      checkoutOpened = true;
    } catch (err) {
      const message = getErrorMessage(err);

      setError(message);

      // A changed price or expired session requires a new checkout.
      if (
        err.response?.status === 409 ||
        message.toLowerCase().includes("session has expired")
      ) {
        setSession(null);
      }
    } finally {
      // Don't reset loading while the Razorpay modal is open.
      if (!checkoutOpened) {
        setPlacingOrder(false);
      }
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-3 animate-spin" size={34} />
          <p className="text-sm text-gray-500">Preparing your checkout...</p>
        </div>
      </main>
    );
  }

  if (successOrder) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <section className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2 size={45} />
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            Aura Fashions
          </p>

          <h1 className="text-3xl font-bold text-gray-900">
            Order placed successfully!
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Thank you for shopping with us. Your order has been successfully
            placed.
          </p>

          <div className="mt-8 rounded-2xl bg-gray-50 p-5 text-left">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">Order number</span>
              <strong className="text-gray-900">
                {successOrder.order_number}
              </strong>
            </div>

            <div className="mt-4 flex justify-between gap-4 text-sm">
              <span className="text-gray-500">Payment method</span>

              <strong>
                {successOrder.payment_method === "prepaid"
                  ? "Online Payment (Razorpay)"
                  : "Cash on Delivery"}
              </strong>
            </div>

            <div className="mt-4 flex justify-between gap-4 border-t border-gray-200 pt-4">
              <span className="font-medium text-gray-700">Total payable</span>
              <strong className="text-lg text-gray-900">
                {formatPrice(successOrder.total)}
              </strong>
            </div>
          </div>

          <p className="mt-5 text-xs text-gray-500">
            {successOrder.payment_method === "prepaid"
              ? "Your online payment has been successfully received."
              : "Payment is pending until your order is delivered."}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className={`${primaryButton} flex-1`}
              onClick={() =>
                navigate(
                  `/orders?order_number=${encodeURIComponent(successOrder.order_number)}`,
                )
              }
            >
              View order <ArrowRight size={17} />
            </button>

            <Link to="/collections" className={`${secondaryButton} flex-1`}>
              Continue shopping
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (error && !session) {
    return (
      <main className="bg-gray-50 px-4 py-16 flex flex-col justify-center">
        <section className="mx-auto max-w-lg rounded-2xl  bg-white p-8 text-center">
          <Package size={42} className="mx-auto text-gray-400" />

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Unable to continue checkout
          </h1>

          <p className="mt-3 text-sm text-red-600">{error}</p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/" className={primaryButton}>
              Back to Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              AURA FASHIONS
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">Checkout</h1>

            <p className="mt-1 text-sm text-gray-500">
              Complete your purchase securely.
            </p>
          </div>

          <Link
            to={session?.mode === "buy_now" ? "/products" : "/cart"}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black"
          >
            <ArrowLeft size={17} />
            {session?.mode === "buy_now" ? "Continue shopping" : "Back to cart"}
          </Link>
        </header>

        {/* Progress */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { number: 1, label: "Address", icon: MapPin },
            { number: 2, label: "Order summary", icon: ShoppingBag },
            { number: 3, label: "Payment", icon: Wallet },
          ].map(({ number, label, icon: Icon }) => {
            const completed = activeStep > number;
            const active = activeStep === number;

            return (
              <button
                type="button"
                key={number}
                onClick={() => {
                  if (number === 1 || number === 2) {
                    setActiveStep(number);
                  }
                }}
                disabled={number === 3}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition ${
                  active
                    ? "border-black bg-black text-white"
                    : completed
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {completed ? <Check size={17} /> : <Icon size={17} />}
                <span className="hidden sm:inline">
                  {number}. {label}
                </span>
                <span className="sm:hidden">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* STEP 1: ADDRESS */}
            {activeStep === 1 && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                      <MapPin size={21} />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Delivery address
                      </h2>
                      <p className="text-xs text-gray-500">
                        Choose where we should deliver your order.
                      </p>
                    </div>
                  </div>

                  {!showAddressForm && (
                    <button
                      type="button"
                      onClick={startAddAddress}
                      className={secondaryButton}
                    >
                      <Plus size={17} />
                      Add address
                    </button>
                  )}
                </div>

                {/* Address list */}
                {!showAddressForm && (
                  <div className="space-y-3">
                    {addresses.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center">
                        <MapPin size={30} className="mx-auto text-gray-400" />

                        <p className="mt-3 font-semibold text-gray-800">
                          No delivery address found
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Add an address to continue.
                        </p>

                        <button
                          type="button"
                          onClick={startAddAddress}
                          className={`${primaryButton} mt-5`}
                        >
                          <Plus size={17} />
                          Add your first address
                        </button>
                      </div>
                    ) : (
                      addresses.map((address) => {
                        const selected =
                          selectedAddressId === String(address.id);

                        return (
                          <article
                            key={address.id}
                            className={`rounded-xl border p-4 transition ${
                              selected
                                ? "border-black bg-gray-50 ring-1 ring-black"
                                : "border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="delivery-address"
                                checked={selected}
                                onChange={() =>
                                  setSelectedAddressId(String(address.id))
                                }
                                className="mt-1 h-4 w-4 accent-black"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <strong className="text-sm text-gray-900">
                                    {address.full_name}
                                  </strong>

                                  <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase text-gray-600">
                                    {address.address_type}
                                  </span>

                                  {address.is_default && (
                                    <span className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
                                      Default
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 text-sm text-gray-600">
                                  {address.phone}
                                </p>

                                <p className="mt-1 text-sm leading-6 text-gray-600">
                                  {address.address_line1}
                                  {address.address_line2 &&
                                    `, ${address.address_line2}`}
                                  {address.landmark && `, ${address.landmark}`}
                                </p>

                                <p className="text-sm text-gray-600">
                                  {address.city}, {address.state}{" "}
                                  {address.postal_code}, {address.country}
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
                                  {!address.is_default && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefault(address)}
                                      disabled={settingDefaultId === address.id}
                                      className="text-xs font-semibold text-gray-600 hover:text-black disabled:opacity-50"
                                    >
                                      {settingDefaultId === address.id
                                        ? "Updating..."
                                        : "Set as default"}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => startEditAddress(address)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-black"
                                  >
                                    <Pencil size={13} />
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAddress(address)}
                                    disabled={deletingAddressId === address.id}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                                  >
                                    <Trash2 size={13} />
                                    {deletingAddressId === address.id
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Address form */}
                {showAddressForm && (
                  <form
                    onSubmit={handleSaveAddress}
                    className="rounded-xl border border-gray-200 p-4 sm:p-5"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">
                        {editingAddressId
                          ? "Edit delivery address"
                          : "Add new address"}
                      </h3>

                      <button
                        type="button"
                        onClick={resetAddressForm}
                        disabled={savingAddress}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        aria-label="Close address form"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Full name *</label>
                        <input
                          name="full_name"
                          value={addressForm.full_name}
                          onChange={handleAddressField}
                          className={inputClass}
                          placeholder="Enter full name"
                          maxLength={150}
                          autoComplete="name"
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Phone number *</label>
                        <input
                          name="phone"
                          type="tel"
                          value={addressForm.phone}
                          onChange={handleAddressField}
                          className={inputClass}
                          placeholder="Enter phone number"
                          maxLength={13}
                          autoComplete="tel"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Address line 1 *</label>
                        <input
                          name="address_line1"
                          value={addressForm.address_line1}
                          onChange={handleAddressField}
                          className={inputClass}
                          placeholder="House number, street, area"
                          maxLength={255}
                          autoComplete="address-line1"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Address line 2</label>
                        <input
                          name="address_line2"
                          value={addressForm.address_line2}
                          onChange={handleAddressField}
                          className={inputClass}
                          placeholder="Apartment, building, locality"
                          maxLength={255}
                          autoComplete="address-line2"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Landmark</label>
                        <input
                          name="landmark"
                          value={addressForm.landmark}
                          onChange={handleAddressField}
                          className={inputClass}
                          placeholder="Nearby landmark"
                          maxLength={150}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>City *</label>
                        <input
                          name="city"
                          value={addressForm.city}
                          onChange={handleAddressField}
                          className={inputClass}
                          maxLength={100}
                          autoComplete="address-level2"
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>State *</label>
                        <input
                          name="state"
                          value={addressForm.state}
                          onChange={handleAddressField}
                          className={inputClass}
                          maxLength={100}
                          autoComplete="address-level1"
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>PIN code *</label>
                        <input
                          name="postal_code"
                          type="tel"
                          value={addressForm.postal_code}
                          onChange={handleAddressField}
                          className={inputClass}
                          maxLength={6}
                          autoComplete="postal-code"
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Country *</label>
                        <input
                          name="country"
                          value={addressForm.country}
                          onChange={handleAddressField}
                          className={inputClass}
                          maxLength={100}
                          autoComplete="country-name"
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Address type</label>
                        <select
                          name="address_type"
                          value={addressForm.address_type}
                          onChange={handleAddressField}
                          className={inputClass}
                        >
                          <option value="home">Home</option>
                          <option value="work">Work</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 self-center text-sm text-gray-700">
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={addressForm.is_default}
                          onChange={handleAddressField}
                          className="h-4 w-4 accent-black"
                        />
                        Set as default address
                      </label>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className={primaryButton}
                      >
                        {savingAddress ? (
                          <>
                            <LoaderCircle size={16} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            Save address
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={resetAddressForm}
                        disabled={savingAddress}
                        className={secondaryButton}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {!showAddressForm && addresses.length > 0 && (
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      disabled={!selectedAddressId}
                      onClick={() => {
                        setError("");
                        setActiveStep(2);
                      }}
                      className={primaryButton}
                    >
                      Continue to summary
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* STEP 2: ORDER SUMMARY */}
            {activeStep === 2 && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                      <ShoppingBag size={21} />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Order summary
                      </h2>
                      <p className="text-xs text-gray-500">
                        {itemCount} items in your order
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-600">
                    {session?.mode === "buy_now" ? "Buy Now" : "Cart"}
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {checkoutItems.map((item) => (
                    <article
                      key={item.id}
                      className="flex gap-4 py-5 first:pt-0 last:pb-0"
                    >
                      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {item.main_image ? (
                          <img
                            src={item.main_image}
                            alt={item.product_title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-400">
                            <ShoppingBag size={25} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                          {item.product_title}
                        </h3>

                        {item.variant_label && (
                          <p className="mt-1 text-xs text-gray-500">
                            {item.variant_label}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-gray-900">
                          {formatPrice(item.unit_price)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(item.line_total)}
                        </p>

                        {Number(item.mrp) > Number(item.unit_price) && (
                          <p className="mt-1 text-xs text-gray-400 line-through">
                            {formatPrice(
                              Number(item.mrp) * Number(item.quantity),
                            )}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className={secondaryButton}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className={primaryButton}
                  >
                    Continue to payment
                    <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            )}

            {/* STEP 3: PAYMENT */}

            {/* STEP 3: PAYMENT */}
            {activeStep === 3 && (
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                    <Wallet size={21} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Payment method
                    </h2>
                    <p className="text-xs text-gray-500">
                      Choose how you would like to pay.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* RAZORPAY */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    disabled={placingOrder}
                    className={`w-full rounded-xl border p-5 text-left transition ${
                      paymentMethod === "razorpay"
                        ? "border-black bg-gray-50 ring-1 ring-black"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
                        <CreditCard size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-sm text-gray-900">
                            Online Payment
                          </strong>

                          {paymentMethod === "razorpay" && (
                            <CheckCircle2
                              size={21}
                              className="text-green-600"
                            />
                          )}
                        </div>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Pay securely using UPI, debit card, credit card, net
                          banking and other available payment methods.
                        </p>

                        <p className="mt-2 text-xs font-semibold text-gray-700">
                          Powered by Razorpay
                        </p>
                      </div>
                    </div>
                  </button>
                  {/* CASH ON DELIVERY */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    disabled={placingOrder}
                    className={`w-full rounded-xl border p-5 text-left transition ${
                      paymentMethod === "cod"
                        ? "border-black bg-gray-50 ring-1 ring-black"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
                        <Wallet size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-sm text-gray-900">
                            Cash on Delivery
                          </strong>

                          {paymentMethod === "cod" && (
                            <CheckCircle2
                              size={21}
                              className="text-green-600"
                            />
                          )}
                        </div>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Pay the delivery partner when you receive your order.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* DELIVERY ADDRESS */}
                <div className="mt-6 rounded-xl bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Delivery address
                  </h3>

                  {addresses
                    .filter(
                      (address) => String(address.id) === selectedAddressId,
                    )
                    .map((address) => (
                      <div
                        key={address.id}
                        className="mt-3 text-sm text-gray-600"
                      >
                        <p className="font-semibold text-gray-900">
                          {address.full_name}
                        </p>
                        <p>{address.phone}</p>
                        <p className="mt-1">
                          {address.address_line1}, {address.city},{" "}
                          {address.state} {address.postal_code}
                        </p>
                      </div>
                    ))}

                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    disabled={placingOrder}
                    className="mt-3 text-xs font-semibold text-gray-700 underline"
                  >
                    Change address
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    disabled={placingOrder}
                    className={secondaryButton}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || !selectedAddressId}
                    className={primaryButton}
                  >
                    {placingOrder ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {paymentMethod === "cod" ? "Place order" : "Pay now"}
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}

            {/* Security */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <ShieldCheck size={16} />
              Your order is processed securely.
            </div>
          </div>

          {/* RIGHT: PRICE DETAILS */}
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Price details</h2>

              {/* COUPON */}
              <div className="mt-5 border-b border-gray-100 pb-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">
                  Apply coupon
                </h3>

                {appliedCoupon ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                          <CheckCircle2 size={16} />
                          Coupon applied
                        </div>

                        <p className="mt-2 text-sm font-bold text-gray-900">
                          {appliedCoupon.code}
                        </p>

                        {appliedCoupon.name && (
                          <p className="mt-1 text-xs text-gray-600">
                            {appliedCoupon.name}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-green-700">
                          You saved {formatPrice(couponDiscount)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(event) =>
                        setCouponCode(event.target.value.toUpperCase())
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter coupon code"
                      maxLength={50}
                      className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-3 text-sm uppercase outline-none transition focus:border-black"
                      disabled={applyingCoupon || placingOrder}
                    />

                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={
                        applyingCoupon || placingOrder || !couponCode.trim()
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {applyingCoupon ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-3 text-gray-500">
                  <span>Items ({itemCount})</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-gray-500">
                  <span>Shipping</span>
                  <span className="font-semibold text-green-600">
                    {shipping === 0 ? "FREE" : formatPrice(shipping)}
                  </span>
                </div>

                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex justify-between gap-3 text-green-700">
                    <span className="min-w-0">
                      Coupon discount ({appliedCoupon.code})
                    </span>
                    <span className="shrink-0 font-semibold">
                      -{formatPrice(couponDiscount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="my-5 border-t border-dashed border-gray-200" />

              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-gray-800">
                  Total payable
                </span>

                <strong className="text-xl text-gray-900">
                  {formatPrice(total)}
                </strong>
              </div>

              {activeStep === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedAddressId) {
                      setError("Please select a delivery address.");
                      return;
                    }

                    setError("");
                    setActiveStep(2);
                  }}
                  disabled={!selectedAddressId}
                  className={`${primaryButton} mt-7 w-full`}
                >
                  Continue
                  <ArrowRight size={17} />
                </button>
              )}

              {activeStep === 2 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className={`${primaryButton} mt-7 w-full`}
                >
                  Continue to payment
                  <ArrowRight size={17} />
                </button>
              )}

              {activeStep === 3 && (
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || !selectedAddressId}
                  className={`${primaryButton} mt-7 w-full`}
                >
                  {placingOrder ? "Processing..." : "Place order"}
                </button>
              )}

              <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <Truck size={17} />
                  Reliable delivery
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <ShieldCheck size={17} />
                  Secure checkout
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <CreditCard size={17} />
                  Secure online payments and COD
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
