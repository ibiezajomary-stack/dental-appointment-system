import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api, downloadPdf, getApiBase, getToken } from "../../lib/api";
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
    files?: { id: string; createdAt: string; originalName: string; mimeType: string }[];
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
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxMeds, setRxMeds] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [rxPlan, setRxPlan] = useState("");
  const [certTreatment, setCertTreatment] = useState("");
  const [certRestDays, setCertRestDays] = useState("one (1) day");
  const [certStartDate, setCertStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [certEndDate, setCertEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [certRequester, setCertRequester] = useState("");

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

  async function openFile(fileId: string) {
    const token = getToken();
    const res = await fetch(`${getApiBase()}/api/files/${encodeURIComponent(fileId)}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
  }

  async function openPatientId(side: "front" | "back") {
    if (!id) return;
    const token = getToken();
    const res = await fetch(
      `${getApiBase()}/api/patients/${encodeURIComponent(id)}/id-document/${encodeURIComponent(side)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    );
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
  }

  async function openPdf(path: string) {
    try {
      await downloadPdf(path, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF failed");
    }
  }

  async function savePrescription() {
    if (!id) return;
    if (!rxMeds.trim()) {
      setError("Prescribed medication is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/patients/${encodeURIComponent(id)}/clinical-notes`, {
        method: "POST",
        body: JSON.stringify({
          diagnosis: rxDiagnosis.trim() || undefined,
          prescribedMedication: rxMeds.trim(),
          notes: rxNotes.trim() || undefined,
          treatmentPlan: rxPlan.trim() || undefined,
        }),
      });
      setRxOpen(false);
      setSaveMsg("Prescription saved. You can print or the patient can download it from My documents.");
      setRxDiagnosis("");
      setRxMeds("");
      setRxNotes("");
      setRxPlan("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save prescription");
    } finally {
      setBusy(false);
    }
  }

  async function issueCertificate() {
    if (!id || !dossier) return;
    if (!certTreatment.trim()) {
      setError("Treatment / procedure details are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${getApiBase()}/api/print/patients/${encodeURIComponent(id)}/dental-certificate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          treatmentDetails: certTreatment.trim(),
          restDays: certRestDays.trim(),
          startDate: certStartDate,
          endDate: certEndDate,
          requesterName: certRequester.trim() || `${dossier.firstName} ${dossier.lastName}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      window.open(objUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
      setCertOpen(false);
      setSaveMsg("Dental certificate issued. The patient can download it from My documents.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue certificate");
    } finally {
      setBusy(false);
    }
  }

  function openCertificateDialog() {
    if (!dossier) return;
    setCertRequester(`${dossier.firstName} ${dossier.lastName}`);
    setCertOpen(true);
  }

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

  const historyQ = historySearch.trim().toLowerCase();
  const filteredAppointments = useMemo(() => {
    if (!dossier) return [];
    if (!historyQ) return dossier.appointments;
    return dossier.appointments.filter((a) => {
      const hay = `${a.status} ${a.notes ?? ""} ${new Date(a.startAt).toLocaleString()}`.toLowerCase();
      return hay.includes(historyQ);
    });
  }, [dossier, historyQ]);

  const filteredConsultations = useMemo(() => {
    if (!dossier) return [];
    if (!historyQ) return dossier.consultations;
    return dossier.consultations.filter((c) => {
      const noteText = c.notes.map((n) => `${n.diagnosis ?? ""} ${n.notes ?? ""}`).join(" ");
      const hay = `${c.status} ${noteText} ${new Date(c.createdAt).toLocaleString()}`.toLowerCase();
      return hay.includes(historyQ);
    });
  }, [dossier, historyQ]);

  const filteredToothRecords = useMemo(() => {
    if (!dossier) return [];
    if (!historyQ) return dossier.toothRecords;
    return dossier.toothRecords.filter((t) => {
      const hay = `${t.toothFdi} ${t.condition ?? ""} ${t.procedure ?? ""} ${new Date(t.recordedAt).toLocaleString()}`.toLowerCase();
      return hay.includes(historyQ);
    });
  }, [dossier, historyQ]);

  async function deletePatientRecord() {
    if (!id) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await api(`/api/patients/${encodeURIComponent(id)}`, { method: "DELETE" });
      navigate("/dentist/patients");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
      setDeleteOpen(false);
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
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
        <Button component={RouterLink} to="/dentist/patients">
          ← Patients
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" sx={{ textTransform: "none" }} onClick={() => setRxOpen(true)}>
          Add prescription
        </Button>
        <Button variant="outlined" sx={{ textTransform: "none" }} onClick={() => void openPdf(`/api/print/patients/${id}/prescription`)}>
          Print prescription (PDF)
        </Button>
        <Button variant="outlined" sx={{ textTransform: "none" }} onClick={openCertificateDialog}>
          Issue dental certificate
        </Button>
        <Button variant="outlined" sx={{ textTransform: "none" }} onClick={() => void openPdf(`/api/print/patients/${id}/history`)}>
          Print history (PDF)
        </Button>
        <Button color="error" variant="contained" sx={{ textTransform: "none" }} onClick={() => setDeleteOpen(true)}>
          Delete patient record
        </Button>
      </Stack>

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
          Uploaded ID
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => void openPatientId("front")} sx={{ textTransform: "none" }}>
            View ID (front)
          </Button>
          <Button variant="outlined" onClick={() => void openPatientId("back")} sx={{ textTransform: "none" }}>
            View ID (back)
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          These are the ID images/PDF uploaded during account creation.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Patient history
        </Typography>
        <TextField
          label="Search history"
          fullWidth
          size="small"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          placeholder="Search appointments, consultations, chart entries…"
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          Appointments
        </Typography>
        {filteredAppointments.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No matching appointments.
          </Typography>
        ) : (
          filteredAppointments.map((a) => (
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
              {a.files && a.files.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  {a.files.map((f) => (
                    <Button
                      key={f.id}
                      size="small"
                      variant="outlined"
                      onClick={() => void openFile(f.id)}
                      sx={{ textTransform: "none" }}
                    >
                      View teeth photo
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          ))
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, mt: 2 }}>
          Consultations
        </Typography>
        {filteredConsultations.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No matching consultations.
          </Typography>
        ) : (
          filteredConsultations.map((c) => (
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

        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, mt: 2 }}>
          Tooth chart entries
        </Typography>
        {filteredToothRecords.length === 0 ? (
          <Typography color="text.secondary">No matching chart entries.</Typography>
        ) : (
          filteredToothRecords.map((t) => (
            <Typography key={`${t.toothFdi}-${t.recordedAt}`} variant="body2" sx={{ py: 0.5 }}>
              <strong>{new Date(t.recordedAt).toLocaleString()}</strong> — FDI {t.toothFdi}: {t.condition ?? "—"} /{" "}
              {t.procedure ?? "—"}
            </Typography>
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

      <Button variant="contained" size="large" disabled={busy} onClick={() => void saveReport()}>
        Save consultation report &amp; patient details
      </Button>

      <Dialog open={rxOpen} onClose={() => !busy && setRxOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add prescription</DialogTitle>
        <DialogContent>
          <TextField
            label="Diagnosis"
            fullWidth
            margin="normal"
            value={rxDiagnosis}
            onChange={(e) => setRxDiagnosis(e.target.value)}
          />
          <TextField
            label="Prescribed medication"
            fullWidth
            margin="normal"
            required
            multiline
            minRows={3}
            value={rxMeds}
            onChange={(e) => setRxMeds(e.target.value)}
            placeholder="e.g. Amoxicillin 500mg — 1 capsule 3x daily for 7 days"
          />
          <TextField
            label="Notes"
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            value={rxNotes}
            onChange={(e) => setRxNotes(e.target.value)}
          />
          <TextField
            label="Treatment plan"
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            value={rxPlan}
            onChange={(e) => setRxPlan(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRxOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void savePrescription()} disabled={busy}>
            {busy ? "Saving…" : "Save prescription"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={certOpen} onClose={() => !busy && setCertOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Issue dental certificate</DialogTitle>
        <DialogContent>
          <TextField
            label="Treatment / procedure details"
            fullWidth
            margin="normal"
            required
            multiline
            minRows={2}
            value={certTreatment}
            onChange={(e) => setCertTreatment(e.target.value)}
            placeholder="e.g. extraction of tooth #36 and minor oral surgery"
          />
          <TextField
            label="Rest period"
            fullWidth
            margin="normal"
            value={certRestDays}
            onChange={(e) => setCertRestDays(e.target.value)}
            placeholder="e.g. three (3) days"
          />
          <TextField
            label="Rest start date"
            type="date"
            fullWidth
            margin="normal"
            value={certStartDate}
            onChange={(e) => setCertStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Rest end date"
            type="date"
            fullWidth
            margin="normal"
            value={certEndDate}
            onChange={(e) => setCertEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Requested by (Mr./Mrs.)"
            fullWidth
            margin="normal"
            value={certRequester}
            onChange={(e) => setCertRequester(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void issueCertificate()} disabled={busy}>
            {busy ? "Issuing…" : "Issue & print certificate"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => (!deleteBusy ? setDeleteOpen(false) : null)}>
        <DialogTitle>Delete patient record?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This permanently deletes this patient&apos;s account and associated clinic data. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button color="error" variant="contained" disabled={deleteBusy} onClick={() => void deletePatientRecord()}>
            {deleteBusy ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
