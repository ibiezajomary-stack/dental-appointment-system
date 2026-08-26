import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { api, setToken } from "../lib/api";

// Validation helper functions
const validateNameInput = (value: string): string => {
  // Allow only letters, spaces, and hyphens
  return value.replace(/[^a-zA-Z\s\-]/g, "");
};

const validateEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) || value === "";
};

export function RegisterPage() {
  const { refresh, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [sex, setSex] = useState("");
  const [birthday, setBirthday] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [consentIdSubmission, setConsentIdSubmission] = useState(false);
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
      if (!acceptTerms || !consentIdSubmission) {
        setError("Please accept the Terms & Conditions and consent to ID submission.");
        setBusy(false);
        return;
      }
      if (!email.trim()) {
        setError("Email is required.");
        setBusy(false);
        return;
      }
      if (!validateEmail(email)) {
        setError("Please enter a valid email address.");
        setBusy(false);
        return;
      }
      if (!password || password.length < 8) {
        setError("Password must be at least 8 characters.");
        setBusy(false);
        return;
      }
      const fn = [firstName, middleName].filter(Boolean).join(" ").trim();
      if (!fn || !lastName.trim()) {
        setError("Please enter your first and last name.");
        setBusy(false);
        return;
      }
      // Validate that names contain only letters, spaces, and hyphens
      const nameRegex = /^[a-zA-Z\s\-]+$/;
      if (!nameRegex.test(fn) || !nameRegex.test(lastName)) {
        setError("Names can only contain letters, spaces, and hyphens.");
        setBusy(false);
        return;
      }
      if (!sex) {
        setError("Please select your sex.");
        setBusy(false);
        return;
      }
      if (!birthday) {
        setError("Birthday is required.");
        setBusy(false);
        return;
      }
      if (!idFront || !idBack) {
        setError("Valid ID front and back uploads are required.");
        setBusy(false);
        return;
      }
      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      fd.set("firstName", fn);
      fd.set("lastName", lastName.trim());
      fd.set("sex", sex);
      fd.set("dateOfBirth", birthday);
      fd.set("acceptTerms", "true");
      fd.set("consentIdSubmission", "true");
      fd.set("idFront", idFront);
      fd.set("idBack", idBack);

      const res = await api<{ token: string; user: unknown }>("/api/auth/register/patient", {
        method: "POST",
        body: fd,
      });
      setToken(res.token);
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
      <Paper elevation={4} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
          Create an Account
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={onSubmit}>
          <TextField
            label="Last name"
            fullWidth
            margin="normal"
            value={lastName}
            onChange={(e) => setLastName(validateNameInput(e.target.value))}
            required
            helperText="Letters only"
          />
          <TextField
            label="First name"
            fullWidth
            margin="normal"
            value={firstName}
            onChange={(e) => setFirstName(validateNameInput(e.target.value))}
            required
            helperText="Letters only"
          />
          <TextField
            label="Middle name"
            fullWidth
            margin="normal"
            value={middleName}
            onChange={(e) => setMiddleName(validateNameInput(e.target.value))}
            helperText="Letters only"
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="sex-label">Sex</InputLabel>
              <Select
                labelId="sex-label"
                label="Sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                required
              >
                <MenuItem value="">
                  <em>Select</em>
                </MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Birthday"
              type="date"
              fullWidth
              margin="normal"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 0.5 }}>
            Valid ID (front) — required
          </Typography>
          <Box
            sx={{
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
              px: 2,
              py: 2.5,
              textAlign: "center",
              color: "text.secondary",
              mb: 1,
            }}
          >
            <Button component="label" variant="outlined" disabled={busy}>
              Choose file
              <input
                hidden
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
              />
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {idFront ? idFront.name : "No file selected"}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Valid ID (back) — required
          </Typography>
          <Box
            sx={{
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
              px: 2,
              py: 2.5,
              textAlign: "center",
              color: "text.secondary",
              mb: 2,
            }}
          >
            <Button component="label" variant="outlined" disabled={busy}>
              Choose file
              <input
                hidden
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
              />
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {idBack ? idBack.name : "No file selected"}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Accepted: images or PDF (max 12MB each). Your dentist/admin will be notified to verify your ID.
          </Typography>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={email !== "" && !validateEmail(email)}
            helperText={email !== "" && !validateEmail(email) ? "Valid email required" : ""}
            required
          />
          <TextField
            label="Password (min 8 characters)"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
          />
          <Box sx={{ mt: 1, display: "grid", gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                  disabled={busy}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  I agree to the Terms & Conditions and clinic data processing, in accordance with applicable privacy
                  laws.
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={consentIdSubmission}
                  onChange={(e) => setConsentIdSubmission(e.target.checked)}
                  required
                  disabled={busy}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  I consent to submitting my government ID for verification by the clinic.
                </Typography>
              }
            />
          </Box>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, py: 1.25 }}
            disabled={busy || !acceptTerms || !consentIdSubmission}
          >
            {busy ? "Creating…" : "Create account"}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          Already have an account?{" "}
          <Link component={RouterLink} to="/login" fontWeight={700}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}
