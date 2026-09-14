import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

type ClinicSettings = {
  clinicPhone: string | null;
  supportPhone: string | null;
  updatedAt: string;
};

export function AdminClinicContactPage() {
  const [clinicPhone, setClinicPhone] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<ClinicSettings>("/api/admin/clinic-settings");
      setClinicPhone(data.clinicPhone ?? "");
      setSupportPhone(data.supportPhone ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clinic contact numbers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api<ClinicSettings>("/api/admin/clinic-settings", {
        method: "PATCH",
        body: JSON.stringify({
          clinicPhone: clinicPhone.trim() || null,
          supportPhone: supportPhone.trim() || null,
        }),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Clinic contact
      </Typography>
      <Typography color="text.secondary" paragraph>
        These numbers are shown in the patient app, help dialogs, and SMS appointment reminders.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {saved ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Contact numbers saved.
        </Alert>
      ) : null}

      <Paper sx={{ p: 3, maxWidth: 480 }}>
        <Stack spacing={2.5}>
          <TextField
            label="Clinic phone"
            value={clinicPhone}
            onChange={(e) => setClinicPhone(e.target.value)}
            placeholder="e.g. 0917-123-4567"
            disabled={loading || saving}
            fullWidth
            helperText="Main clinic contact number for patients"
          />
          <TextField
            label="Support phone"
            value={supportPhone}
            onChange={(e) => setSupportPhone(e.target.value)}
            placeholder="e.g. 0917-123-4567"
            disabled={loading || saving}
            fullWidth
            helperText="Shown for registration and login help"
          />
          <Box>
            <Button variant="contained" onClick={() => void handleSave()} disabled={loading || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </>
  );
}
