
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api, { refreshCSRFToken } from "../services/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton() {
  const buttonRef = useRef(null);

  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const initializeGoogle = () => {
      if (
        cancelled ||
        !buttonRef.current ||
        !window.google?.accounts?.id
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,

        callback: async (response) => {
          if (loading) return;

          setLoading(true);
          setError("");

          try {
            // Obtain CSRF cookie/token before the login POST.
            await refreshCSRFToken();

            // Send Google's ID token to Django.
            await api.post("/accounts/google/", {
              credential: response.credential,
            });

            // Refresh CSRF after Django establishes the session.
            await refreshCSRFToken();

            // Read the authenticated Django session.
            const loggedInUser = await refreshUser();

            if (!loggedInUser) {
              throw new Error(
                "Google login succeeded, but session verification failed."
              );
            }

            // Redirect staff and superusers to admin.
            if (
              loggedInUser.is_staff ||
              loggedInUser.is_superuser
            ) {
              navigate("/admin/controls", {
                replace: true,
              });
              return;
            }

            // Restore the originally requested customer page.
            const from = location.state?.from;
            const resumeAction = location.state?.resumeAction;

            if (from?.pathname) {
              navigate(
                `${from.pathname}${from.search || ""}${from.hash || ""}`,
                {
                  replace: true,
                  state: resumeAction
                    ? { resumeAction }
                    : null,
                }
              );
            } else {
              navigate("/", { replace: true });
            }
          } catch (err) {
            console.error("Google authentication failed:", err);

            const data = err.response?.data;

            setError(
              data?.message ||
              data?.error ||
              err.message ||
              "Google sign-in failed. Please try again."
            );
          } finally {
            setLoading(false);
          }
        },
      });

      buttonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(
        buttonRef.current,
        {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: 320,
          logo_alignment: "left",
        }
      );
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initializeGoogle();
        }
      }, 100);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [refreshUser, navigate, location.state]);

  return (
    <div className="w-full">
      <div
        ref={buttonRef}
        className=""
      />

      {loading && (
        <p className="text-sm text-gray-500">
          Signing in with Google...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
