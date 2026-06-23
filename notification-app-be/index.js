const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ─── Logging Middleware (required format) ─────────────────────────────────────
// [timestamp] [INFO/ERROR] --> METHOD URL
// [timestamp] [INFO/ERROR] <-- METHOD URL STATUS (ms)
function logLine(level, text) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${text}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  logLine("INFO", `--> ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Always log status; use INFO for 2xx/3xx, ERROR otherwise.
    const level = res.statusCode >= 400 ? "ERROR" : "INFO";
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [${level}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

// ─── Priority Weights ─────────────────────────────────────────────────────────
const PRIORITY_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

const EXTERNAL_API_URL =
  "http://4.224.186.213/evaluation-service/notifications";

// NOTE: requirement mentions Authorization Bearer token.
// If your environment already injects token via headers, the pass-through
// will work. Otherwise this endpoint will forward any Authorization header
// present in the incoming request.
function getAuthHeader(req) {
  const auth = req.headers.authorization;
  if (!auth) return undefined;
  return auth;
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

  const response = await axios.get(EXTERNAL_API_URL, { params, headers });
  return response.data?.notifications || [];
}

function getPriorityScore(notification) {
  const typeWeight = PRIORITY_WEIGHT[notification.Type] || 0;
  // timestamp as tiebreaker (more recent = higher)
  const timeScore = new Date(notification.Timestamp).getTime() / 1e12;
  return typeWeight + timeScore;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// Proxy external notifications API
app.get("/api/notifications", async (req, res) => {
  try {
    const { limit, page, notification_type } = req.query;

    const notifications = await fetchExternalNotifications({
      limit: limit !== undefined ? Number(limit) : undefined,
      page: page !== undefined ? Number(page) : undefined,
      notification_type,
      req,
    });

    res.json({ notifications, total: notifications.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Priority inbox: top N ranked by weight+timestamp
app.get("/api/notifications/priority", async (req, res) => {
  try {
    const n = Number.parseInt(req.query.n, 10) || 10;

    // Fetch more to rank (requirement: use timestamp as tiebreaker)
    // Keep it bounded; backend can tune later.
    const notifications = await fetchExternalNotifications({
      limit: 100,
      req,
    });

    const sorted = [...notifications].sort(
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
    res.status(500).json({ error: "Failed to compute priority inbox" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "notification-app-be", port: PORT });
});

app.listen(PORT, () => {
  console.log(`[INFO] notification-app-be running on http://localhost:${PORT}`);
});

