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
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PatientShell } from "./modules/patient";
import { DentistShell } from "./modules/dentist";
import { AdminPage } from "./pages/AdminPage";

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
  if (user.role === "PATIENT") return <Navigate to="/patient/profile" replace />;
  if (user.role === "DENTIST") return <Navigate to="/dentist" replace />;
  return <Navigate to="/admin" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Typography sx={{ p: 4 }}>Page not found</Typography>} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
