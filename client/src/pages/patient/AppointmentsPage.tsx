import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
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
  startAt: string;
  endAt: string;
  status: string;
  dentist: { user: { email: string } };
};

type LocationState = { bookingSuccess?: boolean; message?: string };

export function AppointmentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const st = location.state as LocationState | null;
    if (st?.bookingSuccess) {
      setSuccessMsg(st.message ?? "Your appointment was booked successfully.");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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

  async function cancel(id: string) {
    try {
      await api(`/api/appointments/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        My appointments
      </Typography>
      {successMsg && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>Dentist</TableCell>
            <TableCell>Status</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                {new Date(r.startAt).toLocaleString()} –{" "}
                {new Date(r.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </TableCell>
              <TableCell>{r.dentist.user.email}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>
                {r.status !== "CANCELLED" && r.status !== "COMPLETED" && (
                  <Button size="small" onClick={() => void cancel(r.id)}>
                    Cancel
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
