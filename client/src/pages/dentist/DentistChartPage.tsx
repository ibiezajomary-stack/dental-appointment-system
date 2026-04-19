import { useEffect, useMemo, useState } from "react";
import { Alert, FormControl, InputLabel, MenuItem, Paper, Select, Typography } from "@mui/material";
import { ageFromDateOfBirth } from "../../components/odontogram/dentition";
import { api } from "../../lib/api";
import { DentistOdontogramPanel } from "../../modules/dentist";

type PatientList = { id: string; firstName: string; lastName: string; user: { email: string } };

type PatientDetail = { id: string; dateOfBirth: string | null };

export function DentistChartPage() {
  const [patients, setPatients] = useState<PatientList[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientDob, setPatientDob] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<PatientList[]>("/api/patients")
      .then((p) => {
        setPatients(p);
        if (p[0]) setPatientId(p[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load patients"));
  }, []);

  useEffect(() => {
    if (!patientId) {
      setPatientDob(undefined);
      return;
    }
    setPatientDob(undefined);
    let cancelled = false;
    void api<PatientDetail>(`/api/patients/${encodeURIComponent(patientId)}`)
      .then((p) => {
        if (!cancelled) setPatientDob(p.dateOfBirth);
      })
      .catch(() => {
        if (!cancelled) setPatientDob(null);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const ageYears = useMemo(
    () => (patientDob === undefined ? undefined : patientDob ? ageFromDateOfBirth(patientDob) : null),
    [patientDob],
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Interactive tooth chart (paper style)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Anatomical crown with five-surface schematic per tooth (occlusal center, buccal, lingual, mesial,
        distal). The primary (deciduous) or permanent chart is chosen from the patient&apos;s age (date of
        birth).
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <FormControl fullWidth sx={{ mb: 2, maxWidth: 400 }}>
        <InputLabel id="pat-label">Patient</InputLabel>
        <Select
          labelId="pat-label"
          label="Patient"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        >
          {patients.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.lastName}, {p.firstName} ({p.user.email})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {patientId && <DentistOdontogramPanel patientId={patientId} ageYears={ageYears} />}
    </Paper>
  );
}
