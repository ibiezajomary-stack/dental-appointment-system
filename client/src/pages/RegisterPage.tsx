import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { api, setToken } from "../lib/api";

export function RegisterPage() {
  const { refresh, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
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
      const fn = [firstName, middleName].filter(Boolean).join(" ").trim();
      if (!fn || !lastName.trim()) {
        setError("Please enter your first and last name.");
        setBusy(false);
        return;
      }
      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      fd.set("firstName", fn);
      fd.set("lastName", lastName.trim());
      if (idFront) fd.set("idFront", idFront);
      if (idBack) fd.set("idBack", idBack);

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
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <TextField
            label="First name"
            fullWidth
            margin="normal"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <TextField
            label="Middle name"
            fullWidth
            margin="normal"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="sex-label">Sex</InputLabel>
              <Select
                labelId="sex-label"
                label="Sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select</em>
                </MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Age"
              type="number"
              fullWidth
              margin="normal"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              inputProps={{ min: 0, max: 120 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 0.5 }}>
            Valid ID (front)
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
            Valid ID (back)
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
            ID uploads are optional. Accepted: images or PDF (max 12MB each).
          </Typography>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Password (min 8 characters)"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2, py: 1.25 }} disabled={busy}>
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
