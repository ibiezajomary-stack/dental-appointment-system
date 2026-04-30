import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { api } from "../../lib/api";

export function AdminNotificationsPage() {
  const [rows, setRows] = useState<{ id: string; title: string; message: string; createdAt: string; readAt: string | null }[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<typeof rows>("/api/admin-notifications/me");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    try {
      await api(`/api/admin-notifications/me/${encodeURIComponent(id)}/read`, { method: "PATCH", body: JSON.stringify({}) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark as read");
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Notifications
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {rows.length === 0 ? (
        <Typography color="text.secondary">No notifications.</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.25 }}>
          {rows.map((n) => (
            <Paper
              key={n.id}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: n.readAt ? "background.paper" : "rgba(33, 150, 243, 0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                <Box>
                  <Typography fontWeight={800}>{n.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {n.message}
                  </Typography>
                </Box>
                {!n.readAt && (
                  <Button size="small" onClick={() => void markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Paper>
  );
}
