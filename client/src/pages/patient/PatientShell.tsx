import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
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
import { AppointmentsPage } from "./AppointmentsPage";
import { BookPage } from "./BookPage";
import { ConsultationsPage } from "./ConsultationsPage";
import { PatientHome } from "./PatientHome";
import { PatientNotificationsPage } from "./PatientNotificationsPage";
import { PatientServicesPage } from "./PatientServicesPage";
import { ProfilePage } from "./ProfilePage";
import { ToothChartPage } from "./ToothChartPage";
import { VideoPage } from "./VideoPage";

const NAV = [
  { label: "Home", to: "/patient" },
  { label: "Appointments", to: "/patient/appointments" },
  { label: "Virtual consultation", to: "/patient/consultations" },
  { label: "Tooth chart", to: "/patient/chart" },
  { label: "Services", to: "/patient/services" },
  { label: "Notification", to: "/patient/notifications" },
] as const;

function PatientNavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const isHome = to === "/patient";
  const active = isHome
    ? pathname === "/patient" || pathname === "/patient/"
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

function ShellContent({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3 }, width: "100%" }}>
      {children}
    </Container>
  );
}

export function PatientShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  if (user?.role !== "PATIENT") return <Navigate to="/" replace />;

  const isHome = location.pathname === "/patient" || location.pathname === "/patient/";

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
              to="/patient"
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "primary.main",
                textDecoration: "none",
                mr: 2,
                letterSpacing: "-0.02em",
                flexShrink: 0,
              }}
            >
              iSmile
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flexGrow: 1, alignItems: "center" }}>
              {NAV.map((item) => (
                <PatientNavLink key={item.to} to={item.to} label={item.label} />
              ))}
            </Box>
            <Button variant="contained" color="primary" onClick={() => logout()} sx={{ px: 3, fontWeight: 700 }}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            ...(isHome
              ? {}
              : {
                  minHeight: "calc(100vh - 64px)",
                }),
          }}
        >
          <Routes>
            <Route index element={<PatientHome />} />
            <Route
              path="book"
              element={
                <ShellContent>
                  <BookPage />
                </ShellContent>
              }
            />
            <Route
              path="profile"
              element={
                <ShellContent>
                  <ProfilePage />
                </ShellContent>
              }
            />
            <Route
              path="appointments"
              element={
                <ShellContent>
                  <AppointmentsPage />
                </ShellContent>
              }
            />
            <Route
              path="consultations"
              element={
                <ShellContent>
                  <ConsultationsPage />
                </ShellContent>
              }
            />
            <Route path="consultations/:id/video" element={<VideoPage />} />
            <Route
              path="services"
              element={
                <ShellContent>
                  <PatientServicesPage />
                </ShellContent>
              }
            />
            <Route
              path="notifications"
              element={
                <ShellContent>
                  <PatientNotificationsPage />
                </ShellContent>
              }
            />
            <Route
              path="chart"
              element={
                <ShellContent>
                  <ToothChartPage />
                </ShellContent>
              }
            />
            <Route path="*" element={<Navigate to="/patient" replace />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
