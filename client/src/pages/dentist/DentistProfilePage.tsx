import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Snackbar, TextField, Typography } from "@mui/material";
import { api, getApiBase, getToken } from "../../lib/api";

type Profile = {
  id: string;
  displayName: string | null;
  phone: string | null;
  licenseNumber: string | null;
  specialty: string | null;
  clinicAddress: string | null;
  bio: string | null;
  user: { email: string };
  signature: { mimeType: string; updatedAt: string } | null;
};

export function DentistProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    phone: "",
    licenseNumber: "",
    specialty: "",
    clinicAddress: "",
    bio: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string | null>(null);

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
        clinicAddress: p.clinicAddress ?? "",
        bio: p.bio ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!data?.signature) {
      setSavedSignatureUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      const token = getToken();
      const res = await fetch(`${getApiBase()}/api/dentists/me/signature`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setSavedSignatureUrl(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data?.signature?.updatedAt]);

  useEffect(() => {
    if (!signatureFile) {
      setSignaturePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(signatureFile);
    setSignaturePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [signatureFile]);

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
          clinicAddress: form.clinicAddress.trim() || null,
          bio: form.bio.trim() || null,
        }),
      });
      if (signatureFile) {
        const fd = new FormData();
        fd.set("signature", signatureFile);
        const token = getToken();
        const res = await fetch(`${getApiBase()}/api/dentists/me/signature`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof payload.error === "string" ? payload.error : "Signature upload failed";
          throw new Error(msg);
        }
        const uploaded = payload as { mimeType?: string; updatedAt?: string };
        updated.signature = {
          mimeType: uploaded.mimeType ?? signatureFile.type,
          updatedAt: uploaded.updatedAt ?? new Date().toISOString(),
        };
        setSignatureFile(null);
      }
      setData(updated);
      setSuccess("Profile updated successfully.");
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
        <TextField
          label="Clinic Address"
          name="clinic_address"
          value={form.clinicAddress}
          onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })}
          placeholder="123 Main St, Calinog, Iloilo"
          sx={{ gridColumn: { sm: "1 / -1" } }}
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

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          Digital signature
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          PNG or JPEG. This image is placed above your name on dental certificates and prescriptions.
        </Typography>
        {(signaturePreview || savedSignatureUrl) && (
          <Box
            component="img"
            src={signaturePreview ?? savedSignatureUrl ?? undefined}
            alt="Dentist signature"
            sx={{ display: "block", maxWidth: 240, maxHeight: 100, mb: 1.5, objectFit: "contain" }}
          />
        )}
        <Button variant="outlined" component="label" disabled={busy}>
          {signatureFile ? signatureFile.name : "Choose signature image"}
          <input
            hidden
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSignatureFile(file);
              e.target.value = "";
            }}
          />
        </Button>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button variant="contained" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </Box>
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccess(null)} sx={{ width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

