import { useEffect, useState } from "react";
import {
  Alert,
  Button,
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
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";
type Row = {
  id: string;
  status: string;
  dentist: { user: { email: string } };
};

export function ConsultationsPage() {
  const [dentists, setDentists] = useState<{ id: string; user: { email: string } }[]>([]);
  const [dentistId, setDentistId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ id: string; user: { email: string } }[]>("/api/dentists")
      .then((d) => {
        setDentists(d);
        if (d[0]) setDentistId(d[0].id);
      })
      .catch(() => {});
  }, []);

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

  async function requestConsult() {
    if (!dentistId) return;
    setError(null);
    try {
      await api("/api/consultations", {
        method: "POST",
        body: JSON.stringify({ dentistId }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tele-dental consultations
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Request a virtual visit. When the dentist schedules it, they will contact you with next steps.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <FormControl sx={{ minWidth: 280, mr: 2, mb: 2 }}>
        <InputLabel id="dc-dentist">Dentist</InputLabel>
        <Select
          labelId="dc-dentist"
          label="Dentist"
          value={dentistId}
          onChange={(e) => setDentistId(e.target.value)}
        >
          {dentists.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.user.email}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant="contained"
        sx={{ mr: 1, mb: 2 }}
        onClick={() => void requestConsult()}
        disabled={!dentistId}
      >
        Request consultation
      </Button>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Dentist</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.dentist.user.email}</TableCell>
              <TableCell>{r.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
