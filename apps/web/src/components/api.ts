import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api/v1",
  withCredentials: true, // Required to send cookies (tokens) back and forth
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to handle active Organization ID injection
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const orgId = localStorage.getItem("active_org_id");
    if (orgId) {
      config.headers["x-organization-id"] = orgId;
    }
  }
  return config;
});

// Interceptor to catch 401 Unauthorized errors and clear sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        localStorage.removeItem("active_org_id");
        localStorage.removeItem("user_profile");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
