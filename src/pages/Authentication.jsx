import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../context/AuthContext";
import api, { refreshCSRFToken } from "../services/api";

// Django API endpoints
const SIGNIN_URL = "/accounts/login/";
const SIGNUP_URL = "/accounts/signup/";
const SEND_OTP_URL = "/accounts/otp/send/";
const VERIFY_OTP_URL = "/accounts/otp/verify/";
const RESET_PASSWORD_URL = "/accounts/password/reset/";

// Reusable password input
function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  setVisible,
  placeholder = "Enter your password",
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5" htmlFor={id}>
      {label && (
        <span className="text-xs font-semibold text-gray-800">{label}</span>
      )}

      <span className="flex h-11 min-w-0 items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
        <LockKeyhole size={17} className="shrink-0 text-gray-400" />

        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={
            id === "login-password" ? "current-password" : "new-password"
          }
          required
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0"
        />

        <button
          className="grid shrink-0 place-items-center rounded p-1 text-gray-400 transition hover:text-indigo-600"
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}

// Reusable OTP section
function OtpSection({
  purpose,
  destination,
  otp,
  setOtp,
  otpSent,
  otpVerified,
  otpPurpose,
  countdown,
  loading,
  sendOtp,
  verifyOtp,
  setMessage,
}) {
  const isCurrentPurpose = otpPurpose === purpose && otpSent;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 px-3 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={loading || !destination.trim()}
          onClick={() => sendOtp(purpose, destination)}
        >
          {isCurrentPurpose ? "Send OTP Again" : "Send OTP"}
        </button>

        {isCurrentPurpose && (
          <button
            className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-gray-400"
            type="button"
            disabled={loading || countdown > 0}
            onClick={() => sendOtp(purpose, destination)}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
          </button>
        )}
      </div>

      {isCurrentPurpose && (
        <>
          <label
            className="flex min-w-0 flex-col gap-1.5"
            htmlFor={`otp-${purpose}`}
          >
            <span className="text-xs font-semibold text-gray-800">
              Enter 6-digit OTP
            </span>

            <span className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
              <KeyRound size={17} className="shrink-0 text-gray-400" />

              <input
                id={`otp-${purpose}`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                placeholder="Enter OTP"
                required
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setMessage(null);
                }}
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm tracking-widest text-gray-900 outline-none placeholder:tracking-normal placeholder:text-gray-400 focus:ring-0"
              />
            </span>
          </label>

          <button
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={loading || otp.length !== 6 || otpVerified}
            onClick={verifyOtp}
          >
            {otpVerified ? (
              <>
                <CheckCircle2 size={16} />
                Email Verified
              </>
            ) : (
              "Verify OTP"
            )}
          </button>
        </>
      )}
    </div>
  );
}

// Main authentication component
export default function Authentication() {
  const { refreshUser } = useAuth();

  const [view, setView] = useState("signin");
  const [signupStep, setSignupStep] = useState("email");
  const [resetStep, setResetStep] = useState("email");

  // Sign-in fields
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // OTP fields
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState("signup");
  const [countdown, setCountdown] = useState(0);

  // Reset password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Loading and messages
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // OTP countdown
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);



  function showMessage(type, text) {
    setMessage({ type, text });
  }

  // Django error handling
  function getErrorMessage(error, fallback) {
    const data = error.response?.data;

    if (typeof data === "string") return data;

    if (data?.error) {
      return Array.isArray(data.error) ? data.error[0] : data.error;
    }

    if (data?.detail) return data.detail;
    if (data?.message) return data.message;

    if (data && typeof data === "object") {
      const firstError = Object.values(data)[0];

      if (Array.isArray(firstError)) {
        return String(firstError[0]);
      }

      if (typeof firstError === "string") {
        return firstError;
      }
    }

    return fallback || "Something went wrong. Please try again.";
  }

  // Switch between pages
  const switchView = (nextView) => {
    setView(nextView);

    setUsername("");
    setEmail("");
    setSignupPassword("");

    setIdentifier("");
    setLoginPassword("");

    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setOtpPurpose(null);
    setCountdown(0);

    setNewPassword("");
    setConfirmPassword("");

    setSignupStep("email");
    setResetStep("email");

    setMessage(null);
  };

  // Send or resend OTP
  async function sendOtp(purpose, destination) {
    if (!destination.trim()) {
      showMessage("error", "Please enter your email address first.");
      return false;
    }

    const trimmedUsername = username.trim();

    if (purpose === "signup" && trimmedUsername.length < 3) {
      showMessage("error", "Username must contain at least 3 characters.");
      return false;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post(SEND_OTP_URL, {
        email: destination.trim(),
        purpose,
        ...(purpose === "signup" && {
          username: trimmedUsername,
        }),
      });

      setOtpPurpose(purpose);
      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");
      setCountdown(30);

      if (purpose === "signup") {
        setSignupStep("otp");
      } else if (purpose === "reset") {
        setResetStep("otp");
      }

      showMessage("success", "OTP sent. Please check your email.");

      return true;
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Failed to send OTP."));

      return false;
    } finally {
      setLoading(false);
    }
  }

  // Verify OTP
  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) {
      showMessage("error", "Enter the 6-digit OTP.");
      return false;
    }

    const destination = otpPurpose === "signup" ? email : identifier;

    if (!destination.trim()) {
      showMessage("error", "Please enter your email address.");
      return false;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post(VERIFY_OTP_URL, {
        email: destination.trim(),
        otp,
        purpose: otpPurpose,
      });

      setOtpVerified(true);

      if (otpPurpose === "signup") {
        setSignupStep("create");
      } else if (otpPurpose === "reset") {
        setResetStep("password");
      }

      showMessage("success", "Email verified successfully.");

      return true;
    } catch (error) {
      setOtpVerified(false);

      showMessage("error", getErrorMessage(error, "Invalid or expired OTP."));

      return false;
    } finally {
      setLoading(false);
    }
  }

  // Sign in
  async function handleSignIn(event) {
    event.preventDefault();

    setLoading(true);
    setMessage(null);

    try {
      await api.post(SIGNIN_URL, {
        identifier: identifier.trim(),
        password: loginPassword,
      });

      await refreshCSRFToken();

      const loggedInUser = await refreshUser();

      if (!loggedInUser) {
        showMessage(
          "error",
          "Login succeeded, but we could not verify your session. Please try again.",
        );
        return;
      }

      if (loggedInUser.is_staff || loggedInUser.is_superuser) {
        navigate("/admin/controls", { replace: true });
      } else {
        const from = location.state?.from;
        const resumeAction = location.state?.resumeAction;

        if (from?.pathname) {
          navigate(`${from.pathname}${from.search || ""}${from.hash || ""}`, {
            replace: true,
            state: resumeAction ? { resumeAction } : null,
          });
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }

  // Sign up
  async function handleSignUp(event) {
    event.preventDefault();

    if (loading) return;

    if (signupStep === "email") {
      if (username.trim().length < 3) {
        showMessage("error", "Username must contain at least 3 characters.");
        return;
      }

      if (signupPassword.length < 8) {
        showMessage("error", "Password must contain at least 8 characters.");
        return;
      }

      if (!/[A-Z]/.test(signupPassword)) {
        showMessage(
          "error",
          "Password must contain at least one uppercase letter.",
        );
        return;
      }

      if (!/[a-z]/.test(signupPassword)) {
        showMessage(
          "error",
          "Password must contain at least one lowercase letter.",
        );
        return;
      }

      if (!/[0-9]/.test(signupPassword)) {
        showMessage("error", "Password must contain at least one number.");
        return;
      }

      await sendOtp("signup", email);
      return;
    }

    if (signupStep === "otp") {
      await verifyOtp();
      return;
    }

    if (signupStep === "create") {
      if (!otpVerified) {
        showMessage(
          "error",
          "Please verify your email before creating your account.",
        );
        setSignupStep("otp");
        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        await api.post(SIGNUP_URL, {
          username: username.trim(),
          email: email.trim(),
          password: signupPassword,
          otp,
        });

        await refreshCSRFToken();

        switchView("signin");

        showMessage("success", "Account created successfully.");

        setTimeout(() => {
          setMessage(null);
        }, 3100);
      } catch (error) {
        showMessage(
          "error",
          getErrorMessage(error, "Account creation failed."),
        );
      } finally {
        setLoading(false);
      }
    }
  }

  // Reset password
  async function handleResetPassword(event) {
    event.preventDefault();

    if (loading) return;

    if (resetStep === "email") {
      await sendOtp("reset", identifier);
      return;
    }

    if (resetStep === "otp") {
      await verifyOtp();
      return;
    }

    if (!otpVerified || otpPurpose !== "reset") {
      showMessage("error", "Please verify your OTP first.");
      return;
    }

    if (newPassword.length < 8) {
      showMessage("error", "Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post(RESET_PASSWORD_URL, {
        email: identifier.trim(),
        otp,
        password: newPassword,
        confirm_password: confirmPassword,
      });

      const accountEmail = identifier.trim();

      switchView("signin");

      setIdentifier(accountEmail);
      setLoginPassword("");

      showMessage("success", "Password reset successfully. Please sign in.");
    } catch (error) {
      showMessage("error", getErrorMessage(error, "Password reset failed."));
    } finally {
      setLoading(false);
    }
  }

  // Shared message component
  const Message = () =>
    message && (
      <div
        className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
          message.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-indigo-200 bg-indigo-50 text-indigo-700"
        }`}
        role="status"
        aria-live="polite"
      >
        {message.text}
      </div>
    );

  return (
    <main className="relative flex  w-full items-center justify-center overflow-hidden bg-[#faf9ff] px-3 py-5 text-[#172039] sm:px-6 sm:py-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-purple-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-6xl items-center justify-center gap-12 lg:gap-16">
        {/* Left illustration */}
        <section className="hidden flex-1 items-center justify-center lg:flex">
          <img
            src="/authentication-bg.svg"
            alt="Authentication illustration"
            className="h-auto w-full max-w-[500px] object-contain"
          />
        </section>

        {/* Authentication card */}
        <section className="w-full max-w-[440px] shrink-0 rounded-2xl border border-[#e2e2ef] bg-white p-5 shadow-[0_4px_20px_rgba(29,32,70,0.06)] sm:p-8">
          {/* Back button */}
          {view === "forgot" && (
            <button
              className="mb-6 inline-flex items-center gap-2 text-xs font-semibold cursor-pointer text-indigo-600 transition hover:text-indigo-800"
              type="button"
              onClick={() => switchView("signin")}
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          )}

          {/* Sign in */}
          {view === "signin" && (
            <form className="flex flex-col gap-4" onSubmit={handleSignIn}>
              <div className="mb-1">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <LockKeyhole size={22} />
                </div>

                <h1 className="text-xl text-center font-bold tracking-tight text-gray-900">
                  Welcome back
                </h1>

                <p className="mt-1 text-xs leading-relaxed text-gray-500 text-center">
                  Sign in to continue shopping with Aura Fashions.
                </p>
              </div>

              <label
                className="flex flex-col gap-1.5"
                htmlFor="login-identifier"
              >
                <span className="text-xs font-semibold text-gray-800">
                  Email or Username
                </span>

                <span className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                  <UserRound size={17} className="shrink-0 text-gray-400" />

                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="alex.chen@example.com"
                    required
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400 focus:ring-0"
                  />
                </span>
              </label>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800">
                  Password
                </span>

                <button
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  type="button"
                  onClick={() => switchView("forgot")}
                >
                  Forgot password?
                </button>
              </div>

              <PasswordField
                id="login-password"
                label=""
                value={loginPassword}
                onChange={setLoginPassword}
                visible={showLogin}
                setVisible={setShowLogin}
              />

              <Message />

              <button
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white transition cursor-pointer  disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Please wait..." : "Sign In"}
                <ArrowRight size={17} />
              </button>

              <p className="text-center text-xs text-gray-500">
                New to Aura Fashions?{" "}
                <button
                  className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  type="button"
                  onClick={() => switchView("signup")}
                >
                  Create an account
                </button>
              </p>

              <div className="my-1 flex items-center gap-3">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-medium text-gray-400">
                  OR
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <GoogleSignInButton />
            </form>
          )}

          {/* Sign up */}
          {view === "signup" && (
            <form className="flex flex-col gap-4" onSubmit={handleSignUp}>
              <div className="mb-1">
                <div className=" mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <UserRound size={22} />
                </div>

                <h1 className="text-xl font-bold tracking-tight text-gray-900 text-center">
                  Create your account
                </h1>

                <p className="mt-1 text-xs leading-relaxed text-gray-500 text-center">
                  Join Aura Fashions and discover your style.
                </p>
              </div>

              <label
                className="flex flex-col gap-1.5"
                htmlFor="signup-username"
              >
                <span className="text-xs font-semibold text-gray-800">
                  Username
                </span>

                <span className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                  <UserRound size={17} className="shrink-0 text-gray-400" />

                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setMessage(null);
                    }}
                    placeholder="Choose a username"
                    required
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400 focus:ring-0"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-1.5" htmlFor="signup-email">
                <span className="text-xs font-semibold text-gray-800">
                  Email Address
                </span>

                <span className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                  <Mail size={17} className="shrink-0 text-gray-400" />

                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setOtpSent(false);
                      setOtpVerified(false);
                      setOtp("");
                      setOtpPurpose("signup");
                      setSignupStep("email");
                      setCountdown(0);
                      setMessage(null);
                    }}
                    placeholder="you@example.com"
                    required
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400 focus:ring-0"
                  />
                </span>
              </label>

              <PasswordField
                id="signup-password"
                label="Password"
                value={signupPassword}
                onChange={(value) => {
                  setSignupPassword(value);
                  setMessage(null);
                }}
                visible={showSignup}
                setVisible={setShowSignup}
                placeholder="At least 8 characters"
              />

              {/* Signup OTP */}
              {otpSent && otpPurpose === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      className="text-xs font-semibold text-gray-800"
                      htmlFor="signup-otp"
                    >
                      Enter 6-digit OTP
                    </label>

                    <button
                      type="button"
                      className="shrink-0 text-[11px] font-semibold text-indigo-600 disabled:text-gray-400"
                      onClick={() => sendOtp(otpPurpose, email)}
                      disabled={loading || countdown > 0}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                    </button>
                  </div>

                  <span className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                    <KeyRound size={17} className="shrink-0 text-gray-400" />

                    <input
                      id="signup-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      placeholder="Enter OTP"
                      required
                      onChange={(event) => {
                        setOtp(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        );
                        setOtpVerified(false);
                        setSignupStep("otp");
                        setMessage(null);
                      }}
                      className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm tracking-widest outline-none placeholder:tracking-normal placeholder:text-gray-400 focus:ring-0"
                    />
                  </span>
                </div>
              )}

              <Message />

              <button
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-black cursor-pointer px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={loading || (signupStep === "create" && !otpVerified)}
              >
                {loading
                  ? "Please wait..."
                  : signupStep === "email"
                    ? "Verify Email"
                    : signupStep === "otp"
                      ? "Verify OTP"
                      : "Create Account"}

                <ArrowRight size={17} />
              </button>

              <p className="text-center text-xs text-gray-500">
                Already have an account?{" "}
                <button
                  className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  type="button"
                  onClick={() => switchView("signin")}
                >
                  Sign in
                </button>
              </p>
              <div className="my-1 flex items-center gap-3">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-medium text-gray-400">
                  OR
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <GoogleSignInButton />
            </form>
          )}

          {/* Forgot password */}
          {view === "forgot" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={handleResetPassword}
            >
              <div className="mb-1">
                <div className="mb-3 mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <KeyRound size={22} />
                </div>

                <h1 className="text-xl font-bold tracking-tight text-gray-900 text-center">
                  Reset your password
                </h1>

                <p className="mt-1 text-xs leading-relaxed text-gray-500 text-center">
                  Verify your email address to create a new password.
                </p>
              </div>

              <label
                className="flex flex-col gap-1.5"
                htmlFor="reset-identifier"
              >
                <span className="text-xs font-semibold text-gray-800">
                  Account Email
                </span>

                <span className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                  <Mail size={17} className="shrink-0 text-gray-400" />

                  <input
                    id="reset-identifier"
                    type="email"
                    autoComplete="email"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setResetStep("email");
                      setOtpSent(false);
                      setOtpVerified(false);
                      setOtp("");
                      setOtpPurpose(null);
                      setCountdown(0);
                      setMessage(null);
                    }}
                    placeholder="you@example.com"
                    required
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400 focus:ring-0"
                  />
                </span>
              </label>

              {/* Reset OTP */}
              {resetStep === "otp" && otpSent && otpPurpose === "reset" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      className="text-xs font-semibold text-gray-800"
                      htmlFor="reset-otp"
                    >
                      Enter 6-digit OTP
                    </label>

                    <button
                      type="button"
                      className="shrink-0 text-[11px] font-semibold text-indigo-600 disabled:text-gray-400"
                      disabled={loading || countdown > 0}
                      onClick={() => sendOtp("reset", identifier)}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                    </button>
                  </div>

                  <span className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 px-3 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                    <KeyRound size={17} className="shrink-0 text-gray-400" />

                    <input
                      id="reset-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => {
                        setOtp(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        );
                        setOtpVerified(false);
                        setMessage(null);
                      }}
                      placeholder="Enter OTP"
                      required
                      className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm tracking-widest outline-none placeholder:tracking-normal placeholder:text-gray-400 focus:ring-0"
                    />
                  </span>
                </div>
              )}

              {/* New password fields */}
              {resetStep === "password" && otpVerified && (
                <>
                  <PasswordField
                    id="new-password"
                    label="New Password"
                    value={newPassword}
                    onChange={(value) => {
                      setNewPassword(value);
                      setMessage(null);
                    }}
                    visible={showNew}
                    setVisible={setShowNew}
                    placeholder="At least 8 characters"
                  />

                  <PasswordField
                    id="confirm-password"
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value);
                      setMessage(null);
                    }}
                    visible={showConfirm}
                    setVisible={setShowConfirm}
                    placeholder="Re-enter new password"
                  />
                </>
              )}

              <Message />

              <button
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={
                  loading ||
                  (resetStep === "otp" && otp.length !== 6) ||
                  (resetStep === "password" && !otpVerified)
                }
              >
                {loading
                  ? "Please wait..."
                  : resetStep === "email"
                    ? "Verify Email"
                    : resetStep === "otp"
                      ? "Verify OTP"
                      : "Reset Password"}

                <ArrowRight size={17} />
              </button>
            </form>
          )}

          {/* Security footer */}
          <footer className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[10px] text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Secure Authentication
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
