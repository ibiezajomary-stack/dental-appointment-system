import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
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
  const [showPassword, setShowPassword] = useState(false);
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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 6 },
        background: "linear-gradient(145deg, #eef8f7 0%, #f7fbfc 48%, #e9f2fb 100%)",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 520 }}>
        <Box sx={{ textAlign: "center", mb: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              mx: "auto",
              mb: 2,
              display: "grid",
              placeItems: "center",
              borderRadius: "16px",
              color: "#087f8c",
              bgcolor: "rgba(255, 255, 255, 0.85)",
              boxShadow: "0 10px 24px rgba(8, 127, 140, 0.14)",
              fontSize: "1.45rem",
            }}
          >
            ✦
          </Box>
          <Typography
            component="h1"
            sx={{
              maxWidth: 500,
              mx: "auto",
              color: "#123642",
              fontSize: { xs: "1.55rem", sm: "2rem" },
              lineHeight: 1.2,
              fontWeight: 800,
              letterSpacing: "0.01em",
            }}
          >
            Welcome to Ismile: A Digital Dental Appointment and Patient Care System
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 4.5 },
            borderRadius: { xs: 3, sm: 4 },
            border: "1px solid rgba(18, 54, 66, 0.1)",
            boxShadow: "0 24px 60px rgba(18, 54, 66, 0.12)",
            bgcolor: "rgba(255, 255, 255, 0.94)",
          }}
        >
          <Typography variant="h5" sx={{ color: "#123642", fontWeight: 800, mb: 0.5 }}>
            Sign in to your account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your details and we&apos;ll take you to the right portal.
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
            type={showPassword ? "text" : "password"}
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                    edge="end"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {showPassword ? (
                        <>
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      ) : (
                        <>
                          <path d="m3 3 18 18" />
                          <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 4.1M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10.8 10.8 0 0 0 3.4-.5" />
                        </>
                      )}
                    </svg>
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={busy}
              sx={{
                py: 1.5,
                mt: 1,
                fontWeight: 700,
                fontSize: "1rem",
                borderRadius: 2,
                bgcolor: "#087f8c",
                "&:hover": { bgcolor: "#066b76" },
              }}
            >
              {busy ? "Signing in…" : "Sign In"}
            </Button>
          </Box>

           
          <Typography variant="body2" color="text.secondary" sx={{   mt: 1, textAlign: "center"}}>
            or
          </Typography>

          <Button
            component={RouterLink}
            to="/register"
            variant="outlined"
            fullWidth
            disabled={busy}
            sx={{
              mt: 1.5,
              py: 1.25,
              borderRadius: 2,
              borderColor: "#b8d4d8",
              color: "#087f8c",
              fontWeight: 700,
              "&:hover": { borderColor: "#087f8c", bgcolor: "#f0fbfb" },
            }}
          >
            Create an account
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

