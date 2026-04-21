import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
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
  status: string;
  videoRoomId: string | null;
  startedAt: string | null;
  updatedAt: string;
  dentist: { user: { email: string } };
  appointment: { startAt: string } | null;
};

const ACTIVE_STATUSES = new Set(["SCHEDULED", "IN_PROGRESS"]);
const JOIN_STATUSES = new Set(["IN_PROGRESS"]);

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ConsultationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const active = useMemo(() => {
    const list = rows.filter((r) => ACTIVE_STATUSES.has(r.status) && Boolean(r.appointment));
    if (list.length === 0) return null;
    const now = new Date();
    const todays = list.filter((r) => {
      const t = r.appointment?.startAt;
      if (!t) return false;
      return isSameDay(new Date(t), now);
    });
    const pickFrom = todays.length > 0 ? todays : list;
    return [...pickFrom].sort((a, b) => {
      const ta = new Date(a.appointment?.startAt ?? a.startedAt ?? a.updatedAt).getTime();
      const tb = new Date(b.appointment?.startAt ?? b.startedAt ?? b.updatedAt).getTime();
      return tb - ta;
    })[0];
  }, [rows]);

  return (
    <Box>
      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Virtual consultation
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Your call session will appear here when the dentist starts the consultation. You can join once it is started.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {active ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Dentist: {active.dentist.user.email}
            </Typography>
            {JOIN_STATUSES.has(active.status) ? (
              <Button component={RouterLink} to={`/patient/consultations/${active.id}/video`} variant="contained">
                Join call
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Waiting for doctor to start the call…
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No active call session right now.
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          Consultation history
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Dentist</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.dentist.user.email}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>
                  {r.videoRoomId && JOIN_STATUSES.has(r.status) && (
                    <Button component={RouterLink} to={`/patient/consultations/${r.id}/video`} size="small">
                      Join
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
