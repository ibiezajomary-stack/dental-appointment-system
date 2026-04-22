import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../../auth/AuthContext";
import { dentistTheme } from "../../theme/dentistTheme";
import { api } from "../../lib/api";
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

function DentistNavLink({ to, label }: { to: string; label: ReactNode }) {
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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  if (user?.role !== "DENTIST") return <Navigate to="/" replace />;

  const navWithBadges = useMemo(() => {
    return NAV.map((item) => ({
      ...item,
      labelNode:
        item.to === "/dentist/notifications" ? (
          <Badge color="error" badgeContent={unread} invisible={unread === 0}>
            <span>{item.label}</span>
          </Badge>
        ) : (
          item.label
        ),
    }));
  }, [unread]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function tick() {
      try {
        const res = await api<{ unread: number }>("/api/dentist-notifications/me/unread-count");
        if (!cancelled) setUnread(res.unread);
      } catch {
        // ignore polling errors
      }
      if (!cancelled) timer = window.setTimeout(tick, 10_000);
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

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
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{ display: { xs: "inline-flex", md: "none" }, mr: 0.5 }}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
            <Typography
              component={RouterLink}
              to="/dentist"
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "primary.main",
                textDecoration: "none",
                mr: { xs: 0, md: 2 },
                letterSpacing: "-0.02em",
              }}
            >
              iSmile
            </Typography>
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                flexWrap: "wrap",
                gap: 0.5,
                flexGrow: 1,
                alignItems: "center",
              }}
            >
              {navWithBadges.map((item) => (
                <DentistNavLink key={item.to} to={item.to} label={item.labelNode} />
              ))}
            </Box>
            <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
            <Button
              variant="contained"
              color="primary"
              onClick={() => logout()}
              sx={{ px: 3, fontWeight: 700, display: { xs: "none", md: "inline-flex" } }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: 280 } }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={900} color="primary.main">
              iSmile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dentist menu
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {navWithBadges.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
              >
                <ListItemText primary={item.labelNode} />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ mt: "auto" }} />
          <Box sx={{ p: 2 }}>
            <Button variant="contained" fullWidth onClick={() => logout()}>
              Logout
            </Button>
          </Box>
        </Drawer>
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
