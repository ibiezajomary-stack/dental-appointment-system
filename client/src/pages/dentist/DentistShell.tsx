import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { dentistTheme } from "../../theme/dentistTheme";
import { DentistHome } from "./DentistHome";
import { DentistAppointmentsPage } from "./DentistAppointmentsPage";
import { DentistConsultationsPage } from "./DentistConsultationsPage";
import { DentistChartPage } from "./DentistChartPage";
import { DentistHoursPage } from "./DentistHoursPage";
import { DentistPaymentsPage } from "./DentistPaymentsPage";
import { DentistGcashQrPage } from "./DentistGcashQrPage";
import { DentistProfilePage } from "./DentistProfilePage";
import { DentistPatientsPage } from "./DentistPatientsPage";
import { DentistPatientDetailPage } from "./DentistPatientDetailPage";
import { DentistNotificationsPage } from "./DentistNotificationsPage";
import { VideoConsultation } from "../../components/VideoConsultation";

const NAV = [
  { label: "Home", to: "/dentist" },
  { label: "Appointments", to: "/dentist/appointments" },
  { label: "Virtual consultation", to: "/dentist/consultations" },
  { label: "Patient history", to: "/dentist/patients" },
  { label: "Unavailable times", to: "/dentist/hours" },
  { label: "Payments", to: "/dentist/payments" },
  { label: "GCash QR", to: "/dentist/payment-method" },
  { label: "Profile", to: "/dentist/profile" },
  { label: "Notification", to: "/dentist/notifications" },
] as const;

function DentistNavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const isHome = to === "/dentist";
  const active = isHome
    ? pathname === "/dentist" || pathname === "/dentist/"
    : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Button
      component={RouterLink}
      to={to}
      color="inherit"
      disableElevation
      sx={{
        color: active ? "primary.main" : "text.secondary",
        fontWeight: active ? 700 : 600,
        minWidth: "auto",
        px: 1.25,
        py: 0.5,
        borderRadius: 0,
        borderBottom: active ? 2 : 0,
        borderColor: "primary.main",
      }}
    >
      {label}
    </Button>
  );
}

export function DentistShell() {
  const { user, logout } = useAuth();
  if (user?.role !== "DENTIST") return <Navigate to="/" replace />;

  return (
    <ThemeProvider theme={dentistTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "#fff",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Toolbar
            sx={{
              flexWrap: "wrap",
              gap: 1,
              py: 1,
              width: "100%",
              px: { xs: 2, sm: 3 },
            }}
          >
            <Typography
              component={RouterLink}
              to="/dentist"
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "primary.main",
                textDecoration: "none",
                mr: 2,
                letterSpacing: "-0.02em",
              }}
            >
              iSmile
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flexGrow: 1, alignItems: "center" }}>
              {NAV.map((item) => (
                <DentistNavLink key={item.to} to={item.to} label={item.label} />
              ))}
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={() => logout()}
              sx={{ px: 3, fontWeight: 700 }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3 }, width: "100%" }}>
          <Routes>
            <Route index element={<DentistHome />} />
            <Route path="appointments" element={<DentistAppointmentsPage />} />
            <Route path="consultations" element={<DentistConsultationsPage />} />
            <Route path="consultations/:id/video" element={<VideoConsultation />} />
            <Route path="patients" element={<DentistPatientsPage />} />
            <Route path="patients/:id" element={<DentistPatientDetailPage />} />
            <Route path="hours" element={<DentistHoursPage />} />
            <Route path="payments" element={<DentistPaymentsPage />} />
            <Route path="payment-method" element={<DentistGcashQrPage />} />
            <Route path="profile" element={<DentistProfilePage />} />
            <Route path="notifications" element={<DentistNotificationsPage />} />
            <Route path="chart" element={<DentistChartPage />} />
            <Route path="*" element={<Typography sx={{ p: 2 }}>Page not found</Typography>} />
          </Routes>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
