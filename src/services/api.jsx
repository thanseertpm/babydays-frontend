import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.API_BASE_URL,
  withCredentials: true,
});



// Keep the CSRF token in memory.
let csrfToken = null;
let csrfTokenPromise = null;

// Fetch a fresh CSRF token from Django.
export const refreshCSRFToken = async () => {
  if (!csrfTokenPromise) {
    csrfTokenPromise = api
      .get("/accounts/csrf/")
      .then((response) => {
        csrfToken = response.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
};

// Automatically attach CSRF token to unsafe requests.
api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();

  const unsafeMethods = ["post", "put", "patch", "delete"];

  if (unsafeMethods.includes(method)) {
    if (!csrfToken) {
      await refreshCSRFToken();
    }

    config.headers = config.headers || {};
    config.headers["X-CSRFToken"] = csrfToken;
  }

  return config;
});







export default api;