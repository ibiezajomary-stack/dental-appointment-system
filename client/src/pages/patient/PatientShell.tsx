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
  { label: "Appointments", to: "/patient/book" },
  { label: "Virtual consultation", to: "/patient/consultations" },
  { label: "Tooth chart", to: "/patient/chart" },
  { label: "Services", to: "/patient/services" },
  { label: "Notification", to: "/patient/notifications" },
] as const;

function PatientNavLink({ to, label }: { to: string; label: ReactNode }) {
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  if (user?.role !== "PATIENT") return <Navigate to="/" replace />;

  const isHome = location.pathname === "/patient" || location.pathname === "/patient/";

  const navWithBadges = useMemo(() => {
    return NAV.map((item) => ({
      ...item,
      labelNode:
        item.to === "/patient/notifications" ? (
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
        const res = await api<{ unread: number }>("/api/notifications/unread-count");
        if (!cancelled) setUnread(res.unread);
      } catch {
        // ignore polling errors (e.g., transient network)
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
              to="/patient"
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "primary.main",
                textDecoration: "none",
                mr: { xs: 0, md: 2 },
                letterSpacing: "-0.02em",
                flexShrink: 0,
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
                <PatientNavLink key={item.to} to={item.to} label={item.labelNode} />
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
              Patient menu
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
