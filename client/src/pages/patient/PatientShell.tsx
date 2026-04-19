import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { AppointmentsPage } from "./AppointmentsPage";
import { ConsultationsPage } from "./ConsultationsPage";
import { ProfilePage } from "./ProfilePage";
import { ToothChartPage } from "./ToothChartPage";

const navBtn = { color: "inherit" as const, sx: { whiteSpace: "nowrap" } };

export function PatientShell() {
  const { user, logout } = useAuth();
  if (user?.role !== "PATIENT") return <Navigate to="/" replace />;

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, minWidth: 160 }}>
            Patient portal
          </Typography>
          <Button component={RouterLink} to="/patient/profile" {...navBtn}>
            Profile
          </Button>
          <Button component={RouterLink} to="/patient/appointments" {...navBtn}>
            Appointments
          </Button>
          <Button component={RouterLink} to="/patient/consultations" {...navBtn}>
            Consultations
          </Button>
          <Button component={RouterLink} to="/patient/chart" {...navBtn}>
            Tooth chart
          </Button>
          <Button color="inherit" onClick={() => logout()}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Routes>
          <Route index element={<Navigate to="/patient/profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="consultations" element={<ConsultationsPage />} />
          <Route path="chart" element={<ToothChartPage />} />
          <Route path="*" element={<Navigate to="/patient/profile" replace />} />
        </Routes>
      </Container>
    </Box>
  );
}
