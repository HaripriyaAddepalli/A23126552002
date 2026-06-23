import axios from "axios";

const BASE_URL = "http://localhost:5000";

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

function formatTimestamp(d = new Date()) {
  return d.toISOString();
}

// Required format:
// [timestamp] [INFO/ERROR] --> METHOD URL
// [timestamp] [INFO/ERROR] <-- METHOD URL STATUS (ms)
const loggingMiddleware = {
  info: (message) => {
    // Allow callers to still log via the same middleware object
    console.log(`[${formatTimestamp()}] [INFO] ${message}`);
  },
  error: (message) => {
    console.log(`[${formatTimestamp()}] [ERROR] ${message}`);
  },
};

axiosClient.interceptors.request.use(
  (config) => {
    const timestamp = formatTimestamp();
    const method = (config.method || "GET").toUpperCase();
    const url = `${config.baseURL || ""}${config.url || ""}`;
    config.__logStart = Date.now();
    console.log(`[${timestamp}] [INFO] --> ${method} ${url}`);
    return config;
  },
  (error) => {
    const timestamp = formatTimestamp();
    const method = (error.config?.method || "GET").toUpperCase();
    const url = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    console.log(`[${timestamp}] [ERROR] --> ${method} ${url}`);
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response) => {
    const timestamp = formatTimestamp();
    const method = (response.config.method || "GET").toUpperCase();
    const url = `${response.config.baseURL || ""}${response.config.url || ""}`;
    const duration = Date.now() - (response.config.__logStart || Date.now());
    console.log(
      `[${timestamp}] [INFO] <-- ${method} ${url} ${response.status} (${duration}ms)`
    );
    return response;
  },
  (error) => {
    const timestamp = formatTimestamp();
    const method = (error.config?.method || "GET").toUpperCase();
    const url = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    const status = error.response?.status || 500;
    const duration = Date.now() - (error.config?.__logStart || Date.now());
    console.log(
      `[${timestamp}] [ERROR] <-- ${method} ${url} ${status} (${duration}ms)`
    );
    return Promise.reject(error);
  }
);

export { loggingMiddleware };

export const fetchAllNotifications = async ({ limit, page, notification_type } = {}) => {
  const params = {};
  if (limit) params.limit = limit;
  if (page) params.page = page;
  if (notification_type && notification_type !== "All") params.notification_type = notification_type;

  const res = await axiosClient.get("/api/notifications", { params });
  return res.data;
};

export const fetchPriorityNotifications = async (n = 10) => {
  const res = await axiosClient.get("/api/notifications/priority", { params: { n } });
  return res.data;
};
