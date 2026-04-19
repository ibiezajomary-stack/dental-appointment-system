import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
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

const WAITING_STATUSES = new Set(["REQUESTED", "SCHEDULED", "IN_PROGRESS"]);

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

  const showWaitingBanner = useMemo(
    () => rows.some((r) => WAITING_STATUSES.has(r.status)),
    [rows],
  );

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
    <Box>
      {showWaitingBanner && (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: "secondary.main",
            mb: 3,
            textAlign: { xs: "left", md: "left" },
          }}
        >
          Waiting for doctor for call
        </Typography>
      )}

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Virtual consultation
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Request a virtual visit. When the dentist is ready, you will join from here or follow the link they send.
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
    </Box>
  );
}
