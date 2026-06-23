// ─── Logging Middleware (Frontend) ───────────────────────────────────────────
// Wraps API calls with structured console logging
// Mirrors the logging-middleware from the pre-test setup

const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

export const loggingMiddleware = {
  request: (method, url, params = {}) => {
    log("info", `---> ${method.toUpperCase()} ${url}`, params);
  },
  response: (method, url, status, durationMs, data = null) => {
    log(
      status >= 400 ? "error" : "info",
      `<--- ${method.toUpperCase()} ${url} ${status} (${durationMs}ms)`,
      data ? { count: Array.isArray(data) ? data.length : 1 } : null
    );
  },
  error: (method, url, error) => {
    log("error", `FAIL ${method.toUpperCase()} ${url}`, { message: error.message });
  },
  info: (message, data = null) => log("info", message, data),
  warn: (message, data = null) => log("warn", message, data),
};

// ─── Axios interceptor factory ────────────────────────────────────────────────
import axios from "axios";

export const createApiClient = (baseURL) => {
  const client = axios.create({ baseURL });

  client.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };
    loggingMiddleware.request(config.method, config.url, config.params);
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const duration = Date.now() - response.config.metadata.startTime;
      loggingMiddleware.response(
        response.config.method,
        response.config.url,
        response.status,
        duration,
        response.data
      );
      return response;
    },
    (error) => {
      loggingMiddleware.error(
        error.config?.method || "unknown",
        error.config?.url || "unknown",
        error
      );
      return Promise.reject(error);
    }
  );

  return client;
};