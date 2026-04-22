import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { api, getApiBase, getToken } from "../../lib/api";

type Gcash = {
  id: string;
  provider: "GCASH";
  originalName: string;
  phoneNumber?: string | null;
  downloadUrl: string;
  updatedAt: string;
};

export function DentistGcashQrPage() {
  const [row, setRow] = useState<Gcash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  async function load() {
    setError(null);
    try {
      const data = await api<Gcash>("/api/payments/dentists/me/gcash-qr");
      setRow(data);
      setPhoneNumber(data.phoneNumber ?? "");
    } catch (e) {
      setRow(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.set("qr", file);
      fd.set("phoneNumber", phoneNumber.trim());
      const token = getToken();
      const res = await fetch(`${getApiBase()}/api/payments/dentists/me/gcash-qr`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof payload.error === "string" ? payload.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      await load();
      setSuccess("GCash QR updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, maxWidth: 720, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800} gutterBottom textAlign="center">
        Payment Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph textAlign="center">
        Upload your GCash QR code so patients can scan it during appointment requests.
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

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.25, mb: 3 }}>
        {row ? (
          <>
            <Box
              component="img"
              alt="GCash QR"
              src={`${getApiBase()}${row.downloadUrl}`}
              sx={{
                width: { xs: 220, sm: 280 },
                height: { xs: 220, sm: 280 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "#fff",
                objectFit: "contain",
              }}
            />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              GCash number: <strong>{row.phoneNumber ?? "—"}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Updated {new Date(row.updatedAt).toLocaleString()}
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No QR uploaded yet.
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <TextField
          label="GCash phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          size="small"
          sx={{ width: "100%", maxWidth: 360 }}
          placeholder="09xxxxxxxxx"
          helperText="This will be shown under the QR for patients."
        />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button variant="contained" component="label" disabled={busy} sx={{ px: 4, fontWeight: 800 }}>
          {busy ? "Uploading…" : row ? "Replace QR" : "Upload QR"}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
        </Button>
      </Box>
    </Paper>
  );
}

