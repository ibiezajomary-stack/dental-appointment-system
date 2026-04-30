import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { AdminNotificationsPage } from "./AdminNotificationsPage";
import { AdminTimeManagementPage } from "./AdminTimeManagementPage";

const NAV = [
  { label: "Overview", to: "/admin" },
  { label: "Time management", to: "/admin/time-management" },
  { label: "Notifications", to: "/admin/notifications" },
] as const;

function AdminNavLink({ to, label }: { to: string; label: ReactNode }) {
  const { pathname } = useLocation();
  const isHome = to === "/admin";
  const active = isHome
    ? pathname === "/admin" || pathname === "/admin/"
    : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Button
      component={RouterLink}
      to={to}
      color="inherit"
      sx={{
        fontWeight: active ? 700 : 500,
        borderBottom: active ? 2 : 0,
        borderRadius: 0,
        borderColor: "primary.main",
      }}
    >
      {label}
    </Button>
  );
}

export function AdminShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;

  const navItems = useMemo(() => {
    return NAV.map((item) => ({
      ...item,
      labelNode:
        item.to === "/admin/notifications" ? (
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
        const res = await api<{ unread: number }>("/api/admin-notifications/me/unread-count");
        if (!cancelled) setUnread(res.unread);
      } catch {
        /* ignore */
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
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="sticky" color="primary" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ flexWrap: "wrap", gap: 1, py: 1 }}>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: "inline-flex", md: "none" } }}
            aria-label="Open navigation menu"
            color="inherit"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            component={RouterLink}
            to="/admin"
            variant="h6"
            sx={{ flexGrow: { xs: 1, sm: 0 }, mr: 2, color: "inherit", textDecoration: "none" }}
          >
            Admin
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
            {navItems.map((item) => (
              <AdminNavLink key={item.to} to={item.to} label={item.labelNode} />
            ))}
          </Box>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
          <Typography variant="body2" sx={{ mr: 1, opacity: 0.9, display: { xs: "none", md: "block" } }}>
            {user.email}
          </Typography>
          <Button color="inherit" component={RouterLink} to="/" sx={{ display: { xs: "none", md: "inline-flex" } }}>
            Home
          </Button>
          <Button color="inherit" onClick={() => logout()} sx={{ display: { xs: "none", md: "inline-flex" } }}>
            Log out
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
          <Typography variant="h6" fontWeight={900}>
            Admin
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {user.email}
          </Typography>
        </Box>
        <Divider />
        <List disablePadding>
          {navItems.map((item) => (
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
          <ListItemButton component={RouterLink} to="/" onClick={() => setMobileOpen(false)}>
            <ListItemText primary="Home" />
          </ListItemButton>
        </List>
        <Divider sx={{ mt: "auto" }} />
        <Box sx={{ p: 2 }}>
          <Button variant="contained" fullWidth onClick={() => logout()}>
            Log out
          </Button>
        </Box>
      </Drawer>
      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        <Routes>
          <Route index element={<AdminDashboardPage />} />
          <Route path="time-management" element={<AdminTimeManagementPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="*" element={<Typography sx={{ p: 2 }}>Page not found</Typography>} />
        </Routes>
      </Container>
    </Box>
  );
}
