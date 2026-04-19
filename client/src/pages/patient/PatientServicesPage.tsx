import { Paper, Typography } from "@mui/material";

export function PatientServicesPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Services
      </Typography>
      <Typography color="text.secondary" paragraph>
        General dentistry, preventive care, cosmetic procedures, and emergency visits. Ask our front desk or your
        dentist during your next visit for details tailored to your needs.
      </Typography>
    </Paper>
  );
}
