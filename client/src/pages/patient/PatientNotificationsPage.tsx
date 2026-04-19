import { Paper, Typography } from "@mui/material";

export function PatientNotificationsPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Notifications
      </Typography>
      <Typography color="text.secondary">No new notifications right now.</Typography>
    </Paper>
  );
}
