import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../../auth/AuthContext";

export function UnifiedLoginPage() {
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

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use the email and password for your account. We&apos;ll redirect you to the correct portal after login.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "text.secondary",
              display: "block",
              mb: 0.5,
            }}
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
            sx={{ mb: 2 }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "text.secondary",
              display: "block",
              mb: 0.5,
            }}
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
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={busy}
            sx={{ py: 1.5, fontWeight: 700, fontSize: "1rem" }}
          >
            {busy ? "Signing in…" : "Sign In"}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          Don&apos;t have an account?{" "}
          <Link component={RouterLink} to="/register" fontWeight={700}>
            Create one
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

