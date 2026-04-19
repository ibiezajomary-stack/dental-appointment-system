import { useEffect, useState } from "react";
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
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

type Wh = { dayOfWeek: number; startMinutes: number; endMinutes: number };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DentistHoursPage() {
  const [rows, setRows] = useState<Wh[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<Wh[]>("/api/dentists/me/working-hours");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function addRow() {
    setRows([...rows, { dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60 }]);
  }

  function update(i: number, patch: Partial<Wh>) {
    const next = [...rows];
    next[i] = { ...next[i], ...patch };
    setRows(next);
  }

  async function save() {
    setError(null);
    try {
      await api("/api/dentists/me/working-hours", {
        method: "PUT",
        body: JSON.stringify({ workingHours: rows }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Weekly availability
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Times use the server&apos;s timezone for slot generation (see thesis notes). Minutes from
        midnight (e.g. 9:00 = 540, 17:00 = 1020).
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Day</TableCell>
            <TableCell>Start (min)</TableCell>
            <TableCell>End (min)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>
                <TextField
                  select
                  SelectProps={{ native: true }}
                  value={r.dayOfWeek}
                  onChange={(e) => update(i, { dayOfWeek: Number(e.target.value) })}
                >
                  {DAYS.map((d, dow) => (
                    <option key={d} value={dow}>
                      {d}
                    </option>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={r.startMinutes}
                  onChange={(e) => update(i, { startMinutes: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={r.endMinutes}
                  onChange={(e) => update(i, { endMinutes: Number(e.target.value) })}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ mt: 2 }} display="flex" gap={1}>
        <Button onClick={addRow}>Add row</Button>
        <Button variant="contained" onClick={() => void save()}>
          Save hours
        </Button>
      </Box>
    </Paper>
  );
}
