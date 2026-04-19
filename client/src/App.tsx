import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import {
  Box,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthShell } from "./pages/auth/AuthShell";
import { LoginFormPage } from "./pages/auth/LoginFormPage";
import { LoginSelectionPage } from "./pages/auth/LoginSelectionPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PatientShell } from "./modules/patient";
import { DentistShell } from "./modules/dentist";
import { AdminShell } from "./pages/admin/AdminShell";

const theme = createTheme({
  palette: {
    primary: { main: "#0d47a1" },
    secondary: { main: "#00838f" },
  },
});

function RequireAuth({ roles }: { roles?: ("ADMIN" | "DENTIST" | "PATIENT")[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "PATIENT") return <Navigate to="/patient" replace />;
  if (user.role === "DENTIST") return <Navigate to="/dentist" replace />;
  return <Navigate to="/admin" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthShell />}>
        <Route path="/login" element={<Outlet />}>
          <Route index element={<LoginSelectionPage />} />
          <Route path="patient" element={<LoginFormPage />} />
          <Route path="admin" element={<LoginFormPage />} />
        </Route>
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomeRedirect />} />
      </Route>

      <Route element={<RequireAuth roles={["PATIENT"]} />}>
        <Route path="/patient/*" element={<PatientShell />} />
      </Route>

      <Route element={<RequireAuth roles={["DENTIST"]} />}>
        <Route path="/dentist/*" element={<DentistShell />} />
      </Route>

      <Route element={<RequireAuth roles={["ADMIN"]} />}>
        <Route path="/admin/*" element={<AdminShell />} />
      </Route>

      <Route path="*" element={<Typography sx={{ p: 4 }}>Page not found</Typography>} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box component="div" sx={{ width: "100%", minHeight: "100vh" }}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </Box>
    </ThemeProvider>
  );
}

export default App;
