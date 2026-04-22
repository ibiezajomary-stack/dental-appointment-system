import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { api } from "../../lib/api";

export function PatientNotificationsPage() {
  const [rows, setRows] = useState<
    { id: string; title: string; message: string; createdAt: string; readAt: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<typeof rows>("/api/notifications");
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
      setError(null);
      setSuccess(null);
      await api(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", body: JSON.stringify({}) });
      await load();
      setSuccess("Notification marked as read.");
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
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {rows.length === 0 ? (
        <Typography color="text.secondary">No new notifications right now.</Typography>
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
