import { useCallback, useEffect, useState } from "react";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

type ClinicBlockRow = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdAt: string;
  createdBy: { email: string } | null;
};

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };
  return `${s.toLocaleString(undefined, opts)} → ${e.toLocaleString(undefined, opts)}`;
}

export function AdminTimeManagementPage() {
  const [rows, setRows] = useState<ClinicBlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startAt, setStartAt] = useState<Dayjs | null>(() => dayjs().add(1, "hour").startOf("hour"));
  const [endAt, setEndAt] = useState<Dayjs | null>(() => dayjs().add(2, "hour").startOf("hour"));
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<ClinicBlockRow[]>("/api/admin/clinic-time-blocks");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load blocks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBlock() {
    if (!startAt || !endAt) {
      setError("Choose a start and end time.");
      return;
    }
    if (!startAt.isBefore(endAt)) {
      setError("End must be after start.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api("/api/admin/clinic-time-blocks", {
        method: "POST",
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          reason: reason.trim() || undefined,
        }),
      });
      setReason("");
      await load();
      setSuccess("Clinic time block created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create block");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    setSuccess(null);
    try {
      await api(`/api/admin/clinic-time-blocks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await load();
      setSuccess("Clinic time block removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Typography variant="h5" gutterBottom>
        Clinic time blocks
      </Typography>
      <Typography color="text.secondary" paragraph>
        Blocked intervals apply to the whole clinic: no appointment slots are offered while they overlap
        a block. Times below use your browser&apos;s local timezone; the server stores UTC.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          maxWidth: 560,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Add block
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <DateTimePicker
            label="Start"
            value={startAt}
            onChange={(v) => setStartAt(v)}
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
          <DateTimePicker
            label="End"
            value={endAt}
            onChange={(v) => setEndAt(v)}
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            size="small"
            fullWidth
            placeholder="e.g. Holiday, maintenance"
          />
          <Button variant="contained" onClick={() => void createBlock()} disabled={saving}>
            {saving ? "Saving…" : "Block time range"}
          </Button>
        </Box>
      </Paper>

      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Active blocks
      </Typography>
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Created by</TableCell>
              <TableCell align="right" width={56} />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: "text.secondary" }}>
                  No clinic blocks yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatRange(r.startAt, r.endAt)}</TableCell>
                  <TableCell>{r.reason ?? "—"}</TableCell>
                  <TableCell>{r.createdBy?.email ?? "—"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove block">
                      <IconButton
                        size="small"
                        aria-label="Delete block"
                        onClick={() => void remove(r.id)}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </LocalizationProvider>
  );
}
