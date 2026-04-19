import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../auth/AuthContext";

export function LoginFormPage() {
  const { pathname } = useLocation();
  const m = pathname.includes("/login/admin") ? "admin" : "patient";
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate("/");
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  const isStaff = m === "admin";

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        {isStaff ? (
          <>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  bgcolor: "rgba(26, 35, 126, 0.1)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1.5,
                  fontSize: "1.75rem",
                }}
              >
                🛡️
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "0.06em" }}>
                ADMIN PORTAL
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Authorized personnel only
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
              Patient Login
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Welcome back! Please enter your details.
            </Typography>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: "0.08em", color: "text.secondary", display: "block", mb: 0.5 }}
          >
            EMAIL ADDRESS
          </Typography>
          <TextField
            type="email"
            fullWidth
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            helperText={isStaff ? "Use the email address registered to your admin or dentist account." : undefined}
            sx={{ mb: 2 }}
          />
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: "0.08em", color: "text.secondary", display: "block", mb: 0.5 }}
          >
            PASSWORD
          </Typography>
          <TextField
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            sx={{ mb: 1 }}
          />

          {!isStaff && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <FormControlLabel control={<Checkbox defaultChecked />} label="Remember me" />
              <Link href="#" underline="hover" sx={{ fontSize: "0.875rem" }} onClick={(e) => e.preventDefault()}>
                Forgot password?
              </Link>
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            color={isStaff ? "secondary" : "primary"}
            fullWidth
            size="large"
            disabled={busy}
            sx={{ py: 1.5, fontWeight: 700, fontSize: "1rem" }}
          >
            {busy ? "Signing in…" : isStaff ? "Access Dashboard" : "Sign In"}
          </Button>
        </Box>

        {!isStaff && (
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            Don&apos;t have an account?{" "}
            <Link component={RouterLink} to="/register" fontWeight={700}>
              Create one
            </Link>
          </Typography>
        )}

        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          <Link component={RouterLink} to="/login" color="text.secondary" underline="hover">
            ← Back to selection
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}
