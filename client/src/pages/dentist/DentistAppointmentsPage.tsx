import { useEffect, useState } from "react";
import {
  Alert,
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
  startAt: string;
  endAt: string;
  status: string;
  patient: { firstName: string; lastName: string };
};

export function DentistAppointmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<Row[]>("/api/appointments");
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
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Appointments
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>Patient</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{new Date(r.startAt).toLocaleString()}</TableCell>
              <TableCell>
                {r.patient.firstName} {r.patient.lastName}
              </TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id={`st-${r.id}`}>Set</InputLabel>
                  <Select
                    labelId={`st-${r.id}`}
                    label="Set"
                    value={r.status}
                    onChange={(e) => void setStatus(r.id, e.target.value)}
                  >
                    <MenuItem value="PENDING">PENDING</MenuItem>
                    <MenuItem value="CONFIRMED">CONFIRMED</MenuItem>
                    <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                    <MenuItem value="CANCELLED">CANCELLED</MenuItem>
                  </Select>
                </FormControl>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
