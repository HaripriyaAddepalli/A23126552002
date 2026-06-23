const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5000;

// ─── Auth Token ───────────────────────────────────────────────────────────────
const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhZGRlcGFsbGloYXJpcHJpeWEuMjMuY3NtQGFuaXRzLmVkdS5pbiIsImV4cCI6MTc4MjE5Mjc3OCwiaWF0IjoxNzgyMTkxODc4LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYTliOTEzYzYtZjg2Zi00OGM3LTk5MWUtOGY4MjE5N2VmMTRmIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiYWRkZXBhbGxpaGFyaXByaXlhIiwic3ViIjoiYmMxMjhhMzctY2Q0OC00MDFlLWEyNzMtOWNmOTMwYjY4MmM2In0sImVtYWlsIjoiYWRkZXBhbGxpaGFyaXByaXlhLjIzLmNzbUBhbml0cy5lZHUuaW4iLCJuYW1lIjoiYWRkZXBhbGxpaGFyaXByaXlhIiwicm9sbE5vIjoiYTEyMzI2NTUyMDAyIiwiYWNjZXNzQ29kZSI6Ik1UcXhhciIsImNsaWVudElEIjoiYmMxMjhhMzctY2Q0OC00MDFlLWEyNzMtOWNmOTMwYjY4MmM2IiwiY2xpZW50U2VjcmV0IjoibWd6dGZIVWNOek5WWmVocyJ9.5N7XKgn0CLxAqxAwRae16gYfJq2fJcBpUIxQ7Uy_B9U";

const AUTH_HEADERS = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

// ─── Logging Middleware ───────────────────────────────────────────────────────
const loggingMiddleware = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [INFO] --> ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const timestamp2 = new Date().toISOString();
    console.log(
      `[${timestamp2}] [${res.statusCode < 400 ? "INFO" : "ERROR"}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);

// ─── Priority Weight Map ──────────────────────────────────────────────────────
const PRIORITY_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

const NOTIFICATIONS_API =
  "http://4.224.186.213/evaluation-service/notifications";

// ─── Helper: fetch notifications from external API ────────────────────────────
async function fetchNotifications({ limit, page, notification_type } = {}) {
  const params = {};
  if (limit) params.limit = limit;
  if (page) params.page = page;
  if (notification_type) params.notification_type = notification_type;

  const response = await axios.get(NOTIFICATIONS_API, {
    params,
    headers: AUTH_HEADERS,
  });
  return response.data.notifications || [];
}

// ─── Helper: compute priority score ──────────────────────────────────────────
function getPriorityScore(notification) {
  const typeWeight = PRIORITY_WEIGHT[notification.Type] || 0;
  const timeScore = new Date(notification.Timestamp).getTime() / 1e12;
  return typeWeight + timeScore;
}

// ─── Route: GET /api/notifications ───────────────────────────────────────────
app.get("/api/notifications", async (req, res) => {
  try {
    console.log(`[INFO] Fetching all notifications with params:`, req.query);
    const notifications = await fetchNotifications(req.query);
    res.json({ notifications, total: notifications.length });
  } catch (err) {
    console.error(`[ERROR] Failed to fetch notifications:`, err.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ─── Route: GET /api/notifications/priority ──────────────────────────────────
app.get("/api/notifications/priority", async (req, res) => {
  const n = parseInt(req.query.n) || 10;

  try {
    console.log(`[INFO] Computing priority inbox, top N=${n}`);

    const notifications = await fetchNotifications({ limit: 100 });

    const sorted = [...notifications].sort(
      (a, b) => getPriorityScore(b) - getPriorityScore(a)
    );

    const topN = sorted.slice(0, n);

    console.log(`[INFO] Priority inbox computed: ${topN.length} notifications`);
    topN.forEach((item, i) => {
      console.log(
        `  #${i + 1} [${item.Type}] "${item.Message}" (score: ${getPriorityScore(item).toFixed(4)})`
      );
    });

    res.json({
      priority_notifications: topN,
      total_fetched: notifications.length,
      returned: topN.length,
      n_requested: n,
      weight_scheme: PRIORITY_WEIGHT,
    });
  } catch (err) {
    console.error(`[ERROR] Priority inbox failed:`, err.message);
    res.status(500).json({ error: "Failed to compute priority inbox" });
  }
});

// ─── Route: GET /api/health ───────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "notification-app-be", port: PORT });
});

app.listen(PORT, () => {
  console.log(`[INFO] notification-app-be running on http://localhost:${PORT}`);
  console.log(`[INFO] Priority weights: Placement=3, Result=2, Event=1`);
});