# Notification System Design

## Stage 1 — Priority Inbox Algorithm

### Notification types & weights
- **Placement** → weight **3**
- **Result** → weight **2**
- **Event** → weight **1**

### Priority score
The backend ranks notifications using:

```text
priority_score(notification) = type_weight + (timestamp_ms / 1e12)
```

- **type_weight** is based on the notification’s `Type`.
- `(timestamp_ms / 1e12)` is the **tiebreaker** for notifications of the same type.
- More recent notifications produce a larger score and are returned first.

### Priority endpoint behavior
- `GET /api/notifications/priority?n=10`
  - Fetches up to **100** notifications from the external API.
  - Sorts by `priority_score` descending.
  - Returns the **top N** notifications.

## Stage 2 — Architecture (Frontend + Backend)

### Backend (`notification-app-be`)
Express server:
- Runs on **port 5000**
- Enables **CORS**
- Logs **every request** with required format

Logging format:
- `[timestamp] [INFO/ERROR] --> METHOD URL`
- `[timestamp] [INFO/ERROR] <-- METHOD URL STATUS (ms)`

Routes:
- `GET /api/notifications`
  - Proxies: `http://4.224.186.213/evaluation-service/notifications`
  - Supports query params:
    - `limit`, `page`, `notification_type`
- `GET /api/notifications/priority?n=10`
  - Computes and returns top-N priority notifications
- `GET /api/health`
  - Returns `{ status: "ok" }`

Auth note:
- The backend forwards the caller’s `Authorization` header (if present) as `Authorization: Bearer ...` to the external API.

### Frontend (`notification-app-fe`)
React + Material UI.
- Runs on **port 3000**
- Keeps **viewed state in memory only** (no localStorage/sessionStorage)

Pages:
1. **Priority Inbox**
   - Slider for N in range **5–30**
   - Shows weight scheme (Placement/Result/Event)
   - Cards render **New vs Viewed**:
     - New: bold + blue border
     - Viewed: grey + faded
   - Clicking a card marks it as viewed

2. **All Notifications**
   - Filter: All / Placement / Result / Event
   - Pagination
   - “Mark all read” button

Logging:
- Frontend uses Axios interceptors.
- Every API call logs:
  - request start (method + full URL)
  - response end (status + duration)

## How to Run

### Backend (port 5000)
```bash
cd notification-app-be
npm install
node index.js
```

Test health:
- http://localhost:5000/api/health

### Frontend (port 3000)
```bash
cd notification-app-fe
npm install
npm run dev
```

Open:
- http://localhost:3000

