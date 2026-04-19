import { Paper, Typography } from "@mui/material";

/** Placeholder for alerts / system notifications (matches main nav). */
export function DentistNotificationsPage() {
  return (
    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
        Notifications
      </Typography>
      <Typography color="text.secondary">
        No new notifications. Appointment and consultation updates will appear here.
      </Typography>
    </Paper>
  );
}
