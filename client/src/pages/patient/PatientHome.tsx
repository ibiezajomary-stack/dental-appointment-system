import { Link as RouterLink } from "react-router-dom";
import { Button, Paper, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";

export function PatientHome() {
  const { user } = useAuth();
  const name = user?.patient
    ? `${user.patient.firstName} ${user.patient.lastName}`
    : user?.email;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Welcome, {name}
      </Typography>
      <Typography color="text.secondary" paragraph>
        Book visits, manage tele-dental consultations, and review your dental chart from this portal.
      </Typography>
      <Button variant="contained" component={RouterLink} to="/patient/book" sx={{ mr: 1, mb: 1 }}>
        Book appointment
      </Button>
      <Button variant="outlined" component={RouterLink} to="/patient/consultations" sx={{ mb: 1 }}>
        Consultations
      </Button>
    </Paper>
  );
}
