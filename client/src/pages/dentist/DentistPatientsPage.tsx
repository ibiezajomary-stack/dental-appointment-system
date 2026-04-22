import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Paper,
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
  firstName: string;
  lastName: string;
  phone?: string | null;
  user: { email: string };
};

export function DentistPatientsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void api<Row[]>("/api/patients")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load patients"));
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!query) return true;
      const name = `${r.firstName} ${r.lastName}`.toLowerCase();
      const email = r.user.email.toLowerCase();
      const phone = (r.phone ?? "").toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [rows, q]);

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

      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
          mb: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ flex: "1 1 260px", maxWidth: 520 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
          Showing {filtered.length} of {rows.length}
        </Typography>
      </Box>

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
          {filtered.map((r) => (
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
      {filtered.length === 0 && !error && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No patients match your search/filter.
        </Typography>
      )}
    </Paper>
  );
}
