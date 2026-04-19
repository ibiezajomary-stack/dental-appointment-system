import { useMemo } from "react";
import { Alert, Paper, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { ageFromDateOfBirth } from "../../components/odontogram/dentition";
import { PatientOdontogramPanel } from "../../modules/patient";

export function ToothChartPage() {
  const { user } = useAuth();
  const patientId = user?.patient?.id;
  const ageYears = useMemo(
    () => (user?.patient?.dateOfBirth ? ageFromDateOfBirth(user.patient.dateOfBirth) : null),
    [user?.patient?.dateOfBirth],
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dental chart (FDI)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        View-only chart: surfaces show what your dentist has recorded. Editing is done at the clinic
        from the dentist dashboard.
      </Typography>
      {!patientId && (
        <Alert severity="warning">Patient profile not loaded.</Alert>
      )}
      {patientId && <PatientOdontogramPanel patientId={patientId} ageYears={ageYears} />}
    </Paper>
  );
}
