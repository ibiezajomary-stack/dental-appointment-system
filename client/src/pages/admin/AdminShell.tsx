import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { AdminTimeManagementPage } from "./AdminTimeManagementPage";

const NAV = [
  { label: "Overview", to: "/admin" },
  { label: "Time management", to: "/admin/time-management" },
] as const;

function AdminNavLink({ to, label }: { to: string; label: string }) {
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
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="sticky" color="primary" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ flexWrap: "wrap", gap: 1, py: 1 }}>
          <Typography
            component={RouterLink}
            to="/admin"
            variant="h6"
            sx={{ flexGrow: { xs: 1, sm: 0 }, mr: 2, color: "inherit", textDecoration: "none" }}
          >
            Admin
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flexGrow: 1, alignItems: "center" }}>
            {NAV.map((item) => (
              <AdminNavLink key={item.to} to={item.to} label={item.label} />
            ))}
          </Box>
          <Typography variant="body2" sx={{ mr: 1, opacity: 0.9 }}>
            {user.email}
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">
            Home
          </Button>
          <Button color="inherit" onClick={() => logout()}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        <Routes>
          <Route index element={<AdminDashboardPage />} />
          <Route path="time-management" element={<AdminTimeManagementPage />} />
          <Route path="*" element={<Typography sx={{ p: 2 }}>Page not found</Typography>} />
        </Routes>
      </Container>
    </Box>
  );
}
