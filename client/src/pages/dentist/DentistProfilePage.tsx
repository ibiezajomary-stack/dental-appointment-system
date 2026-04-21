import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { api } from "../../lib/api";

type Profile = {
  id: string;
  displayName: string | null;
  phone: string | null;
  licenseNumber: string | null;
  specialty: string | null;
  bio: string | null;
  user: { email: string };
};

export function DentistProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    phone: "",
    licenseNumber: "",
    specialty: "",
    bio: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const p = await api<Profile>("/api/dentists/me/profile");
      setData(p);
      setForm({
        displayName: p.displayName ?? "",
        phone: p.phone ?? "",
        licenseNumber: p.licenseNumber ?? "",
        specialty: p.specialty ?? "",
        bio: p.bio ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api<Profile>("/api/dentists/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.displayName.trim() || null,
          phone: form.phone.trim() || null,
          licenseNumber: form.licenseNumber.trim() || null,
          specialty: form.specialty.trim() || null,
          bio: form.bio.trim() || null,
        }),
      });
      setData(updated);
      setSuccess("Profile saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, maxWidth: 820, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Profile settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Update your public information shown to patients. Your login email is <strong>{data?.user.email ?? "—"}</strong>.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField
          label="Display name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          placeholder="Dr. Juan Dela Cruz"
        />
        <TextField
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="09xxxxxxxxx"
        />
        <TextField
          label="License number"
          value={form.licenseNumber}
          onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
          placeholder="DDS-XXXXX"
        />
        <TextField
          label="Specialty"
          value={form.specialty}
          onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          placeholder="General Dentistry"
        />
      </Box>

      <TextField
        label="Bio"
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        multiline
        minRows={3}
        sx={{ mt: 2 }}
        fullWidth
        placeholder="Short description about your services, experience, etc."
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button variant="contained" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </Box>
    </Paper>
  );
}

