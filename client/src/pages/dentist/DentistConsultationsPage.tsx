import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

type Row = {
  id: string;
  status: string;
  videoRoomId: string | null;
  patient: { firstName: string; lastName: string; id: string };
};

export function DentistConsultationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState("");
  const [plan, setPlan] = useState("");

  async function load() {
    try {
      const data = await api<Row[]>("/api/consultations");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: string) {
    try {
      await api(`/api/consultations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function saveNote() {
    if (!noteFor) return;
    try {
      await api(`/api/consultations/${noteFor}/notes`, {
        method: "POST",
        body: JSON.stringify({
          diagnosis,
          notes,
          prescribedMedication: meds,
          treatmentPlan: plan,
        }),
      });
      setNoteFor(null);
      setDiagnosis("");
      setNotes("");
      setMeds("");
      setPlan("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Consultations
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Patient</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Video</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                {r.patient.firstName} {r.patient.lastName}
              </TableCell>
              <TableCell>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id={`cs-${r.id}`}>Status</InputLabel>
                  <Select
                    labelId={`cs-${r.id}`}
                    label="Status"
                    value={r.status}
                    onChange={(e) => void setStatus(r.id, e.target.value)}
                  >
                    <MenuItem value="REQUESTED">REQUESTED</MenuItem>
                    <MenuItem value="SCHEDULED">SCHEDULED</MenuItem>
                    <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
                    <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                    <MenuItem value="CANCELLED">CANCELLED</MenuItem>
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell>
                {r.videoRoomId && (
                  <Button
                    component={RouterLink}
                    to={`/dentist/consultations/${r.id}/video`}
                    size="small"
                    variant="outlined"
                  >
                    Join video
                  </Button>
                )}
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => setNoteFor(r.id)}>
                  Add clinical note
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!noteFor} onClose={() => setNoteFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Consultation note</DialogTitle>
        <DialogContent>
          <TextField
            label="Diagnosis"
            fullWidth
            margin="normal"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
          <TextField
            label="Prescribed medication"
            fullWidth
            margin="normal"
            value={meds}
            onChange={(e) => setMeds(e.target.value)}
          />
          <TextField
            label="Notes"
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <TextField
            label="Treatment plan"
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveNote()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
