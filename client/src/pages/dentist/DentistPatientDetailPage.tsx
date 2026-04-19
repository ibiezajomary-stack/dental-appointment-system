import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";
import { DentistOdontogramPanel } from "../../modules/dentist";

const MH_KEYS = [
  { key: "generalHealth", label: "General health" },
  { key: "headaches", label: "Headaches" },
  { key: "allergies", label: "Allergies" },
  { key: "bleedingGums", label: "Bleeding of gums" },
  { key: "heartBp", label: "Heart / blood pressure" },
  { key: "sinusTrouble", label: "Sinus trouble" },
  { key: "frequentColds", label: "Frequent colds" },
  { key: "diabetes", label: "Diabetes" },
  { key: "selfMedication", label: "Self-medication" },
] as const;

const CE_TEXT_KEYS = [
  { key: "faceLips", label: "Face & lips" },
  { key: "cheeks", label: "Cheeks" },
  { key: "tongue", label: "Tongue" },
  { key: "palate", label: "Palate" },
  { key: "oropharynx", label: "Oropharynx" },
  { key: "missingTeeth", label: "Missing teeth" },
  { key: "malocclusion", label: "Malocclusion" },
  { key: "previousDentalCare", label: "Previous dental care" },
] as const;

type Dossier = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  referredBy?: string | null;
  physicianName?: string | null;
  physicianAddress?: string | null;
  physicianPhone?: string | null;
  user: { email: string };
  age: number | null;
  dentalReport: {
    presentOralComplaint?: string | null;
    familyHistory?: string | null;
    remarks?: string | null;
    medicalHistory?: Record<string, unknown> | null;
    clinicalExamination?: Record<string, unknown> | null;
  } | null;
  appointments: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    notes?: string | null;
  }[];
  consultations: {
    id: string;
    status: string;
    createdAt: string;
    notes: { diagnosis?: string | null; notes?: string | null }[];
  }[];
  toothRecords: {
    id: string;
    toothFdi: string;
    condition?: string | null;
    procedure?: string | null;
    recordedAt: string;
  }[];
};

export function DentistPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [address, setAddress] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [physicianAddress, setPhysicianAddress] = useState("");
  const [physicianPhone, setPhysicianPhone] = useState("");
  const [complaint, setComplaint] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [remarks, setRemarks] = useState("");
  const [mh, setMh] = useState<Record<string, string>>({});
  const [ce, setCe] = useState<Record<string, string>>({});
  const [gingSpongy, setGingSpongy] = useState(false);
  const [gingRetracted, setGingRetracted] = useState(false);
  const [gingBleeding, setGingBleeding] = useState(false);


  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const d = await api<Dossier>(`/api/patients/${encodeURIComponent(id)}/dossier`);
      setDossier(d);
      setAddress(d.address ?? "");
      setReferredBy(d.referredBy ?? "");
      setPhysicianName(d.physicianName ?? "");
      setPhysicianAddress(d.physicianAddress ?? "");
      setPhysicianPhone(d.physicianPhone ?? "");
      const r = d.dentalReport;
      setComplaint(r?.presentOralComplaint ?? "");
      setFamilyHistory(r?.familyHistory ?? "");
      setRemarks(r?.remarks ?? "");
      const m = (r?.medicalHistory ?? {}) as Record<string, string>;
      const nextMh: Record<string, string> = {};
      for (const { key } of MH_KEYS) {
        nextMh[key] = typeof m[key] === "string" ? m[key] : m[key] != null ? String(m[key]) : "";
      }
      setMh(nextMh);
      const c = (r?.clinicalExamination ?? {}) as Record<string, unknown>;
      const nextCe: Record<string, string> = {};
      for (const { key } of CE_TEXT_KEYS) {
        nextCe[key] = typeof c[key] === "string" ? c[key] : c[key] != null ? String(c[key]) : "";
      }
      setCe(nextCe);
      setGingSpongy(c.gingivaeSpongy === true || c.gingivaeSpongy === "yes");
      setGingRetracted(c.gingivaeRetracted === true || c.gingivaeRetracted === "yes");
      setGingBleeding(c.gingivaeBleeding === true || c.gingivaeBleeding === "yes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load record");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveReport() {
    if (!id) return;
    setBusy(true);
    setSaveMsg(null);
    setError(null);
    try {
      const medicalHistory: Record<string, string> = { ...mh };
      const clinicalExamination: Record<string, unknown> = {
        ...ce,
        gingivaeSpongy: gingSpongy,
        gingivaeRetracted: gingRetracted,
        gingivaeBleeding: gingBleeding,
      };
      const updated = await api<Dossier>(`/api/patients/${encodeURIComponent(id)}/dossier`, {
        method: "PATCH",
        body: JSON.stringify({
          address: address || null,
          referredBy: referredBy || null,
          physicianName: physicianName || null,
          physicianAddress: physicianAddress || null,
          physicianPhone: physicianPhone || null,
          dentalReport: {
            presentOralComplaint: complaint || null,
            familyHistory: familyHistory || null,
            remarks: remarks || null,
            medicalHistory,
            clinicalExamination,
          },
        }),
      });
      setDossier(updated);
      setSaveMsg("Record saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!id) return null;

  if (error && !dossier) {
    return (
      <Alert severity="error">
        {error}{" "}
        <RouterLink to="/dentist/patients">Back to patients</RouterLink>
      </Alert>
    );
  }

  if (!dossier) {
    return <Typography sx={{ p: 2 }}>Loading…</Typography>;
  }

  return (
    <Box>
      <Button component={RouterLink} to="/dentist/patients" sx={{ mb: 2 }}>
        ← Patients
      </Button>

      {saveMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveMsg(null)}>
          {saveMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Patient information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Name"
              fullWidth
              margin="dense"
              value={`${dossier.firstName} ${dossier.lastName}`}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              fullWidth
              margin="dense"
              value={dossier.user.email}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Phone"
              fullWidth
              margin="dense"
              value={dossier.phone ?? ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Birthdate"
              fullWidth
              margin="dense"
              value={
                dossier.dateOfBirth
                  ? new Date(dossier.dateOfBirth).toLocaleDateString()
                  : "—"
              }
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Age"
              fullWidth
              margin="dense"
              value={dossier.age != null ? String(dossier.age) : "—"}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Address"
              fullWidth
              margin="dense"
              multiline
              minRows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Referred by"
              fullWidth
              margin="dense"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Physician
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Physician name"
              fullWidth
              margin="dense"
              value={physicianName}
              onChange={(e) => setPhysicianName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Physician phone"
              fullWidth
              margin="dense"
              value={physicianPhone}
              onChange={(e) => setPhysicianPhone(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Physician address"
              fullWidth
              margin="dense"
              multiline
              minRows={2}
              value={physicianAddress}
              onChange={(e) => setPhysicianAddress(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Appointments
        </Typography>
        {dossier.appointments.length === 0 ? (
          <Typography color="text.secondary">No appointments.</Typography>
        ) : (
          dossier.appointments.map((a) => (
            <Box
              key={a.id}
              sx={{
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2">
                <strong>{new Date(a.startAt).toLocaleString()}</strong> — {a.status}
              </Typography>
              {a.notes && (
                <Typography variant="caption" color="text.secondary">
                  {a.notes}
                </Typography>
              )}
            </Box>
          ))
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Consultation report
        </Typography>
        <TextField
          label="Present oral complaint"
          fullWidth
          margin="normal"
          multiline
          minRows={3}
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
        />
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Medical history
        </Typography>
        <Grid container spacing={1}>
          {MH_KEYS.map(({ key, label }) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <TextField
                label={label}
                fullWidth
                size="small"
                value={mh[key] ?? ""}
                onChange={(e) => setMh((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </Grid>
          ))}
        </Grid>
        <TextField
          label="Family history"
          fullWidth
          margin="normal"
          multiline
          minRows={2}
          value={familyHistory}
          onChange={(e) => setFamilyHistory(e.target.value)}
        />
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Clinical examination
        </Typography>
        <Grid container spacing={1}>
          {CE_TEXT_KEYS.map(({ key, label }) => (
            <Grid item xs={12} sm={6} key={key}>
              <TextField
                label={label}
                fullWidth
                size="small"
                value={ce[key] ?? ""}
                onChange={(e) => setCe((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </Grid>
          ))}
        </Grid>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Gingivae
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          <FormControlLabel
            control={
              <Checkbox
                checked={gingSpongy}
                onChange={(e) => setGingSpongy(e.target.checked)}
              />
            }
            label="Spongy"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={gingRetracted}
                onChange={(e) => setGingRetracted(e.target.checked)}
              />
            }
            label="Retracted"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={gingBleeding}
                onChange={(e) => setGingBleeding(e.target.checked)}
              />
            }
            label="Bleeding"
          />
        </Box>
        <TextField
          label="Remarks"
          fullWidth
          margin="normal"
          multiline
          minRows={4}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Dental chart (odontogram)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Click a tooth to add or update a chart entry. Highlighted teeth have records.
        </Typography>
        <DentistOdontogramPanel patientId={dossier.id} ageYears={dossier.age ?? null} />
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent consultation notes (tele-dental / visits)
        </Typography>
        {dossier.consultations.length === 0 ? (
          <Typography color="text.secondary">None.</Typography>
        ) : (
          dossier.consultations.map((c) => (
            <Box key={c.id} sx={{ mb: 2 }}>
              <Typography variant="body2">
                {new Date(c.createdAt).toLocaleString()} — {c.status}
              </Typography>
              {c.notes.map((n, i) => (
                <Typography key={i} variant="caption" display="block" color="text.secondary">
                  {n.diagnosis || n.notes || "—"}
                </Typography>
              ))}
            </Box>
          ))
        )}
      </Paper>

      <Button variant="contained" size="large" disabled={busy} onClick={() => void saveReport()}>
        Save consultation report &amp; patient details
      </Button>
    </Box>
  );
}
