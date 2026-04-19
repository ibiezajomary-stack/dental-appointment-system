import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Paper,
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
  firstName: string;
  lastName: string;
  phone?: string | null;
  user: { email: string };
};

export function DentistPatientsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Row[]>("/api/patients")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load patients"));
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Patients
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select a patient to open the full record: demographics, appointments, consultation report, and
        odontogram.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell>
                {r.lastName}, {r.firstName}
              </TableCell>
              <TableCell>{r.user.email}</TableCell>
              <TableCell>{r.phone ?? "—"}</TableCell>
              <TableCell>
                <RouterLink to={`/dentist/patients/${r.id}`}>Open record</RouterLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && !error && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No patients registered yet.
        </Typography>
      )}
    </Paper>
  );
}
