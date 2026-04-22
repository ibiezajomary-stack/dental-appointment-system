import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";

type Row = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  patient: { id: string; firstName: string; lastName: string } | null;
};

export function DentistNotificationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<Row[]>("/api/dentist-notifications/me");
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
      await api(`/api/dentist-notifications/me/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await load();
      setSuccess("Notification marked as read.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark as read");
    }
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
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
        <Typography color="text.secondary">No new notifications.</Typography>
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
              <Typography fontWeight={900}>{n.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {n.message}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
                {n.patient && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => navigate(`/dentist/patients/${n.patient!.id}`)}
                  >
                    Review profile
                  </Button>
                )}
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
