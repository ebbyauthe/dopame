import axios from "axios";

const backendUrl = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const API = backendUrl ? `${backendUrl}/api` : "/api";

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 12000,
});

export function formatApiError(detail) {
  if (detail?.response) return formatApiError(detail.response.data?.detail || detail.response.data);
  if (detail?.request) return "Could not reach the backend. Check REACT_APP_BACKEND_URL and CORS settings.";
  if (detail?.message) return detail.message;
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
