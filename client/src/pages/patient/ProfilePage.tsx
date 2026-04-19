import { useEffect, useState } from "react";
import { Alert, Button, Paper, TextField, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";

type PatientApi = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
};

type PatientForm = Omit<PatientApi, "dateOfBirth"> & {
  /** `yyyy-MM-dd` or "" for the date input */
  dateOfBirth: string;
};

function isoDateToInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m?.[1] ?? "";
}

function apiToForm(p: PatientApi): PatientForm {
  return {
    ...p,
    dateOfBirth: isoDateToInputValue(p.dateOfBirth),
  };
}

export function ProfilePage() {
  const { refresh } = useAuth();
  const [data, setData] = useState<PatientForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<PatientApi>("/api/patients/me")
      .then((p) => setData(apiToForm(p)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth.trim() === "" ? null : data.dateOfBirth,
      };
      const updated = await api<PatientApi>("/api/patients/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setData(apiToForm(updated));
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return error ? (
      <Alert severity="error">{error}</Alert>
    ) : (
      <Typography>Loading…</Typography>
    );
  }

  return (
    <Paper sx={{ p: 3 }} component="form" onSubmit={save}>
      <Typography variant="h6" gutterBottom>
        Health profile
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TextField
        label="First name"
        fullWidth
        margin="normal"
        value={data.firstName}
        onChange={(e) => setData({ ...data, firstName: e.target.value })}
      />
      <TextField
        label="Last name"
        fullWidth
        margin="normal"
        value={data.lastName}
        onChange={(e) => setData({ ...data, lastName: e.target.value })}
      />
      <TextField
        label="Phone"
        fullWidth
        margin="normal"
        value={data.phone ?? ""}
        onChange={(e) => setData({ ...data, phone: e.target.value })}
      />
      <TextField
        label="Date of birth"
        type="date"
        fullWidth
        margin="normal"
        value={data.dateOfBirth}
        onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
        InputLabelProps={{ shrink: true }}
        inputProps={{ max: new Date().toISOString().slice(0, 10) }}
      />
      <TextField
        label="Medical history"
        fullWidth
        margin="normal"
        multiline
        minRows={2}
        value={data.medicalHistory ?? ""}
        onChange={(e) => setData({ ...data, medicalHistory: e.target.value })}
      />
      <TextField
        label="Allergies"
        fullWidth
        margin="normal"
        value={data.allergies ?? ""}
        onChange={(e) => setData({ ...data, allergies: e.target.value })}
      />
      <TextField
        label="Emergency contact"
        fullWidth
        margin="normal"
        value={data.emergencyContact ?? ""}
        onChange={(e) => setData({ ...data, emergencyContact: e.target.value })}
      />
      <TextField
        label="Emergency phone"
        fullWidth
        margin="normal"
        value={data.emergencyPhone ?? ""}
        onChange={(e) => setData({ ...data, emergencyPhone: e.target.value })}
      />
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={busy}>
        Save
      </Button>
    </Paper>
  );
}
