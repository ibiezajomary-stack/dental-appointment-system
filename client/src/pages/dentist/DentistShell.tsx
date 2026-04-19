import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { DentistHome } from "./DentistHome";
import { DentistAppointmentsPage } from "./DentistAppointmentsPage";
import { DentistConsultationsPage } from "./DentistConsultationsPage";
import { DentistChartPage } from "./DentistChartPage";
import { DentistHoursPage } from "./DentistHoursPage";
import { DentistPatientsPage } from "./DentistPatientsPage";
import { DentistPatientDetailPage } from "./DentistPatientDetailPage";
import { VideoConsultation } from "../../components/VideoConsultation";

const navBtn = { color: "inherit" as const, sx: { whiteSpace: "nowrap" } };

export function DentistShell() {
  const { user, logout } = useAuth();
  if (user?.role !== "DENTIST") return <Navigate to="/" replace />;

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, minWidth: 160 }}>
            Dentist dashboard
          </Typography>
          <Button component={RouterLink} to="/dentist" {...navBtn}>
            Today
          </Button>
          <Button component={RouterLink} to="/dentist/patients" {...navBtn}>
            Patients
          </Button>
          <Button component={RouterLink} to="/dentist/appointments" {...navBtn}>
            Appointments
          </Button>
          <Button component={RouterLink} to="/dentist/consultations" {...navBtn}>
            Consultations
          </Button>
          <Button component={RouterLink} to="/dentist/chart" {...navBtn}>
            Tooth chart
          </Button>
          <Button component={RouterLink} to="/dentist/hours" {...navBtn}>
            Hours
          </Button>
          <Button color="inherit" onClick={() => logout()}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Routes>
          <Route index element={<DentistHome />} />
          <Route path="patients" element={<DentistPatientsPage />} />
          <Route path="patients/:id" element={<DentistPatientDetailPage />} />
          <Route path="appointments" element={<DentistAppointmentsPage />} />
          <Route path="consultations" element={<DentistConsultationsPage />} />
          <Route path="consultations/:id/video" element={<VideoConsultation />} />
          <Route path="chart" element={<DentistChartPage />} />
          <Route path="hours" element={<DentistHoursPage />} />
          <Route path="*" element={<Typography sx={{ p: 2 }}>Page not found</Typography>} />
        </Routes>
      </Container>
    </Box>
  );
}
