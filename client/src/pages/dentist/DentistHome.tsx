import { useEffect, useMemo, useState } from "react";
import { Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { api } from "../../lib/api";

type Row = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  patient: { firstName: string; lastName: string };
};

export function DentistHome() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void api<Row[]>("/api/appointments").then(setRows);
  }, []);

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return rows.filter((r) => {
      const t = new Date(r.startAt);
      return t >= start && t < end && r.status !== "CANCELLED";
    });
  }, [rows]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Today&apos;s schedule
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Patient</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {today.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                {new Date(r.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                – {new Date(r.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </TableCell>
              <TableCell>
                {r.patient.firstName} {r.patient.lastName}
              </TableCell>
              <TableCell>{r.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {today.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No appointments today.
        </Typography>
      )}
    </Paper>
  );
}
