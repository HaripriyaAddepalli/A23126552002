console.log("🔥 FILE EXECUTING: index.js STARTED");

// ─── Safety handlers (IMPORTANT for debugging) ───────────────────────────────
process.on("uncaughtException", (err) => {
  console.log("❌ UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("❌ UNHANDLED REJECTION:", err);
});

// ─── Imports ────────────────────────────────────────────────────────────────
const express = require("express");
const axios = require("axios");
const cors = require("cors");

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const PORT = 5000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Logging Middleware ──────────────────────────────────────────────────────
function logLine(level, text) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${text}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  logLine("INFO", `--> ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "ERROR" : "INFO";

    console.log(
      `[${new Date().toISOString()}] [${level}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

// ─── Priority Weights ────────────────────────────────────────────────────────
const PRIORITY_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

// ─── External API ─────────────────────────────────────────────────────────────
const EXTERNAL_API_URL =
  "http://4.224.186.213/evaluation-service/notifications";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getAuthHeader(req) {
  return req.headers.authorization || undefined;
}

async function fetchExternalNotifications({
  limit,
  page,
  notification_type,
  req,
} = {}) {
  const params = {};
  if (limit !== undefined) params.limit = limit;
  if (page !== undefined) params.page = page;
  if (notification_type !== undefined) params.notification_type = notification_type;

  const headers = {};
  const auth = getAuthHeader(req);
  if (auth) headers.Authorization = auth;

  const response = await axios.get(EXTERNAL_API_URL, {
    params,
    headers,
    timeout: 10000,
  });

  return response.data?.notifications || [];
}

function getPriorityScore(notification) {
  const typeWeight = PRIORITY_WEIGHT[notification.Type] || 0;
  const timeScore =
    new Date(notification.Timestamp).getTime() / 1e12;

  return typeWeight + timeScore;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "notification-app-be",
    port: PORT,
  });
});

// Get notifications
app.get("/api/notifications", async (req, res) => {
  try {
    const { limit, page, notification_type } = req.query;

    const notifications = await fetchExternalNotifications({
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      notification_type,
      req,
    });

    res.json({
      notifications,
      total: notifications.length,
    });
  } catch (err) {
    console.log("❌ ERROR /notifications:", err.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Priority notifications
app.get("/api/notifications/priority", async (req, res) => {
  try {
    const n = parseInt(req.query.n, 10) || 10;

    const notifications = await fetchExternalNotifications({
      limit: 100,
      req,
    });

    const sorted = notifications.sort(
      (a, b) => getPriorityScore(b) - getPriorityScore(a)
    );

    const topN = sorted.slice(0, n);

    res.json({
      priority_notifications: topN,
      total_fetched: notifications.length,
      returned: topN.length,
      n_requested: n,
      weight_scheme: PRIORITY_WEIGHT,
    });
  } catch (err) {
    console.log("❌ ERROR /priority:", err.message);
    res.status(500).json({
      error: "Failed to compute priority inbox",
    });
  }
});

// ─── Server Start (IMPORTANT FIX HERE) ───────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[INFO] SERVER RUNNING on http://localhost:${PORT}`);
});

// Catch server errors
server.on("error", (err) => {
  console.log("❌ SERVER ERROR:", err);
});