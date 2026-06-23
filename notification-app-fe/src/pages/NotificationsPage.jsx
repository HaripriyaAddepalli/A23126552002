import React, { useState } from "react";
import {
  Box, Typography, Tabs, Tab, CircularProgress, Alert, Button,
  Card, CardContent, Chip, Pagination, Stack, Slider, Paper,
  Divider,
} from "@mui/material";
import {
  FiberNew as NewIcon, Refresh as RefreshIcon,
  Work as PlacementIcon, EmojiEvents as ResultIcon,
  Event as EventIcon, DoneAll as DoneAllIcon,
  PriorityHigh as PriorityIcon,
} from "@mui/icons-material";
import NotificationFilter from "../components/NotificationFilter";
import {
  useAllNotifications,
  usePriorityNotifications,
  useViewedNotifications,
} from "../hooks/useNotifications";
import { loggingMiddleware } from "../api/notifications";

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  Placement: { color: "success", icon: <PlacementIcon fontSize="small" /> },
  Result:    { color: "warning", icon: <ResultIcon fontSize="small" /> },
  Event:     { color: "info",    icon: <EventIcon fontSize="small" /> },
};

// ─── Notification Card ────────────────────────────────────────────────────────
const NotificationCard = ({ notification, isViewed, onClick }) => {
  const { ID, Type, Message, Timestamp } = notification;
  const config = TYPE_CONFIG[Type] || { color: "default", icon: null };
  const time = new Date(Timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const viewed = isViewed(ID);

  return (
    <Card
      onClick={() => { onClick(ID); loggingMiddleware.info(`Notification viewed: ${ID}`); }}
      sx={{
        mb: 1.5, cursor: "pointer",
        border: viewed ? "1px solid" : "2px solid",
        borderColor: viewed ? "divider" : "primary.main",
        bgcolor: viewed ? "background.paper" : "#EBF4FF",
        opacity: viewed ? 0.8 : 1,
        transition: "all 0.2s",
        "&:hover": { boxShadow: 4, transform: "translateY(-1px)" },
      }}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
              {!viewed && <NewIcon color="primary" fontSize="small" />}
              <Typography variant="body1" fontWeight={viewed ? 400 : 600}>{Message}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{time}</Typography>
          </Box>
          <Chip icon={config.icon} label={Type} color={config.color} size="small" variant={viewed ? "outlined" : "filled"} />
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── All Notifications Tab ────────────────────────────────────────────────────
const AllNotificationsTab = ({ isViewed, markAsViewed, markAllAsViewed }) => {
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const { notifications, total, loading, error, refetch } = useAllNotifications(filter, page);

  const handleFilterChange = (val) => { setFilter(val); setPage(1); };
  const unread = notifications.filter((n) => !isViewed(n.ID)).length;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={700}>All Notifications</Typography>
          {unread > 0 && <Chip label={`${unread} new`} color="primary" size="small" />}
        </Box>
        <Box display="flex" gap={1}>
          <Button size="small" startIcon={<DoneAllIcon />} variant="outlined"
            disabled={unread === 0}
            onClick={() => { markAllAsViewed(notifications.map((n) => n.ID)); }}>
            Mark all read
          </Button>
          <Button size="small" startIcon={<RefreshIcon />} variant="outlined" onClick={refetch}>
            Refresh
          </Button>
        </Box>
      </Box>

      <NotificationFilter value={filter} onChange={handleFilterChange} />
      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error" action={<Button size="small" onClick={refetch}>Retry</Button>}>{error}</Alert>
      ) : notifications.length === 0 ? (
        <Alert severity="info">No notifications found for this filter.</Alert>
      ) : (
        <>
          {notifications.map((n) => (
            <NotificationCard key={n.ID} notification={n} isViewed={isViewed} onClick={markAsViewed} />
          ))}
          <Stack alignItems="center" mt={3}>
            <Pagination count={Math.max(1, Math.ceil(total / 10))} page={page}
              onChange={(_, v) => setPage(v)} color="primary" />
          </Stack>
        </>
      )}
    </Box>
  );
};

// ─── Priority Inbox Tab ───────────────────────────────────────────────────────
const PriorityInboxTab = ({ isViewed, markAsViewed }) => {
  const [n, setN] = useState(10);
  const { notifications, meta, loading, error, refetch } = usePriorityNotifications(n);
  const unread = notifications.filter((notif) => !isViewed(notif.ID)).length;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <PriorityIcon color="error" />
          <Typography variant="h6" fontWeight={700}>Priority Inbox</Typography>
          {unread > 0 && <Chip label={`${unread} unread`} color="error" size="small" />}
        </Box>
        <Button size="small" startIcon={<RefreshIcon />} variant="outlined" onClick={refetch}>Refresh</Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "grey.50" }}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          Priority weights (higher = shown first)
        </Typography>
        <Stack direction="row" spacing={1}>
          {[["Placement", 3], ["Result", 2], ["Event", 1]].map(([t, w]) => (
            <Chip key={t} label={`${t}: ${w}`} size="small" variant="outlined" />
          ))}
        </Stack>
      </Paper>

      <Box mb={2}>
        <Typography variant="body2" gutterBottom>Show top <strong>{n}</strong> notifications</Typography>
        <Slider value={n} onChange={(_, v) => setN(v)} onChangeCommitted={refetch}
          min={5} max={30} step={5} valueLabelDisplay="auto"
          marks={[5,10,15,20,25,30].map(v => ({ value: v, label: String(v) }))}
          sx={{ maxWidth: 400 }} />
      </Box>

      {meta && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Ranked from {meta.total_fetched} notifications · showing {meta.returned}
        </Typography>
      )}
      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress color="error" /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : notifications.length === 0 ? (
        <Alert severity="info">No priority notifications found.</Alert>
      ) : (
        notifications.map((n) => (
          <NotificationCard key={n.ID} notification={n} isViewed={isViewed} onClick={markAsViewed} />
        ))
      )}
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const [tab, setTab] = useState(0);
  const { isViewed, markAsViewed, markAllAsViewed } = useViewedNotifications();

  loggingMiddleware.info("NotificationsPage rendered");

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tab icon={<PriorityIcon fontSize="small" />} iconPosition="start" label="Priority Inbox" />
        <Tab label="All Notifications" />
      </Tabs>
      {tab === 0 ? (
        <PriorityInboxTab isViewed={isViewed} markAsViewed={markAsViewed} />
      ) : (
        <AllNotificationsTab isViewed={isViewed} markAsViewed={markAsViewed} markAllAsViewed={markAllAsViewed} />
      )}
    </Box>
  );
};

export default NotificationsPage;