import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let csrfToken = "";
let csrfRequest;

export async function primeCsrf(force = false) {
  if (csrfToken && !force) return csrfToken;
  if (!csrfRequest || force) {
    csrfRequest = api.get("auth/csrf").then(({ data }) => {
      csrfToken = data.csrfToken;
      return csrfToken;
    }).finally(() => {
      csrfRequest = undefined;
    });
  }
  return csrfRequest;
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method)) {
    const token = await primeCsrf();
    config.headers.set("X-CSRF-Token", token);
  }
  return config;
});

export function getApiError(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail || error?.response?.data?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item?.msg).filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return error?.message || fallback;
}

export default api;
