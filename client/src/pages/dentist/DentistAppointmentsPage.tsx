import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "../../lib/api";

type Row = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  patient: { id: string; firstName: string; lastName: string };
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatAppointmentWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusPillStyle(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case "CONFIRMED":
      return { label: "Confirmed", bg: "#e8f5e9", color: "#00695c" };
    case "PENDING":
      return { label: "Pending", bg: "#e3f2fd", color: "#1565c0" };
    case "COMPLETED":
      return { label: "Completed", bg: "#ede7f6", color: "#4527a0" };
    case "CANCELLED":
      return { label: "Cancelled", bg: "#ffebee", color: "#c62828" };
    default:
      return { label: status, bg: "#f5f5f5", color: "#424242" };
  }
}

function parseBookingNotes(notes: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = (notes ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

export function DentistAppointmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [detailForId, setDetailForId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null);
  const [startHour, setStartHour] = useState<number | "">("");
  const [endHour, setEndHour] = useState<number | "">("");
  const [tab, setTab] = useState<(typeof STATUS_ORDER)[number]>("PENDING");

  async function load() {
    try {
      const data = await api<Row[]>("/api/appointments");
      const now = Date.now();
      setRows(
        [...data].sort((a, b) => {
          const ta = new Date(a.startAt).getTime();
          const tb = new Date(b.startAt).getTime();
          const aUpcoming = ta >= now;
          const bUpcoming = tb >= now;
          if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1; // upcoming first
          if (aUpcoming && bUpcoming) return ta - tb; // soonest upcoming first
          return tb - ta; // most recent past first
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const dateKey = filterDate ? filterDate.format("YYYY-MM-DD") : null;
    const startH = typeof startHour === "number" ? startHour : null;
    const endH = typeof endHour === "number" ? endHour : null;

    return rows.filter((r) => {
      const d = new Date(r.startAt);
      if (dateKey) {
        const k = dayjs(d).format("YYYY-MM-DD");
        if (k !== dateKey) return false;
      }
      if (startH !== null || endH !== null) {
        const h = d.getHours();
        if (startH !== null && h < startH) return false;
        if (endH !== null && h > endH) return false;
      }
      return true;
    });
  }, [rows, filterDate, startHour, endHour]);

  const countsByStatus = useMemo(() => {
    const base = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<(typeof STATUS_ORDER)[number], number>;
    for (const r of filtered) {
      const k = r.status as (typeof STATUS_ORDER)[number];
      if (k in base) base[k] += 1;
    }
    return base;
  }, [filtered]);

  const tabbed = useMemo(() => {
    return filtered.filter((r) => r.status === tab);
  }, [filtered, tab]);

  function resetFilters() {
    setFilterDate(null);
    setStartHour("");
    setEndHour("");
  }

  async function setStatus(id: string, status: string) {
    setError(null);
    setSuccess(null);
    try {
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      setSuccess(`Appointment marked as ${statusPillStyle(status).label}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setMenuAnchor(null);
      setMenuForId(null);
    }
  }

  function openMenu(e: React.MouseEvent<HTMLElement>, id: string) {
    setMenuAnchor(e.currentTarget);
    setMenuForId(id);
  }

  const detailRow = detailForId ? rows.find((r) => r.id === detailForId) ?? null : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          bgcolor: "grey.200",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          width: "100%",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            mb: 1.5,
            letterSpacing: "0.02em",
          }}
        >
          Appointments
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2,
            bgcolor: "background.paper",
            borderRadius: 2,
            px: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {STATUS_ORDER.map((s) => (
            <Tab
              key={s}
              value={s}
              label={`${STATUS_LABEL[s]} (${countsByStatus[s]})`}
              sx={{ textTransform: "none", fontWeight: 800 }}
            />
          ))}
        </Tabs>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
            mb: 2,
          }}
        >
          <DatePicker
            label="Date"
            value={filterDate}
            onChange={(v) => setFilterDate(v)}
            slotProps={{ textField: { size: "small" as const, sx: { minWidth: 180 } } }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="start-hour-label">Start hour</InputLabel>
            <Select
              labelId="start-hour-label"
              label="Start hour"
              value={startHour}
              onChange={(e) => setStartHour(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <MenuItem value="">Any</MenuItem>
              {Array.from({ length: 24 }, (_, h) => (
                <MenuItem key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="end-hour-label">End hour</InputLabel>
            <Select
              labelId="end-hour-label"
              label="End hour"
              value={endHour}
              onChange={(e) => setEndHour(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <MenuItem value="">Any</MenuItem>
              {Array.from({ length: 24 }, (_, h) => (
                <MenuItem key={h} value={h}>
                  {String(h).padStart(2, "0")}:59
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button size="small" variant="outlined" onClick={resetFilters} sx={{ textTransform: "none" }}>
            Clear filters
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            Showing {tabbed.length} {STATUS_LABEL[tab].toLowerCase()} of {filtered.length} filtered
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tabbed.length === 0 && !error && (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No {STATUS_LABEL[tab].toLowerCase()} appointments match your filters.
            </Typography>
          )}
          {tabbed.map((r) => {
            const noteParsed = parseBookingNotes(r.notes);
            const service = noteParsed["Requested services"] ?? r.notes?.trim() ?? "Visit";
            const when = formatAppointmentWhen(r.startAt);
            const pill = statusPillStyle(r.status);
            const name = `${r.patient.firstName} ${r.patient.lastName}`;

            return (
              <Card
                key={r.id}
                elevation={0}
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                    py: 2.5,
                    "&:last-child": { pb: 2.5 },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      {name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {service} — {when}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setDetailForId(r.id)}
                    sx={{ textTransform: "none" }}
                  >
                    View details
                  </Button>
                  <Box
                    component="button"
                    type="button"
                    onClick={(e) => openMenu(e, r.id)}
                    sx={{
                      border: "none",
                      cursor: "pointer",
                      font: "inherit",
                      px: 2,
                    py: 0.75,
                    borderRadius: 999,
                    bgcolor: pill.bg,
                    color: pill.color,
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    flexShrink: 0,
                    "&:hover": { filter: "brightness(0.97)" },
                  }}
                >
                  {pill.label}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor) && Boolean(menuForId)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuForId(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {STATUS_ORDER.map((st) => (
          <MenuItem
            key={st}
            onClick={() => menuForId && void setStatus(menuForId, st)}
            selected={rows.find((x) => x.id === menuForId)?.status === st}
          >
            {statusPillStyle(st).label}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={Boolean(detailRow)} onClose={() => setDetailForId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Booking details</DialogTitle>
        <DialogContent>
          {detailRow ? (
            <Box sx={{ display: "grid", gap: 1.25 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Patient
                </Typography>
                <Typography fontWeight={800}>
                  {detailRow.patient.firstName} {detailRow.patient.lastName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Schedule
                </Typography>
                <Typography>
                  {new Date(detailRow.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} –{" "}
                  {new Date(detailRow.endAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{statusPillStyle(detailRow.status).label}</Typography>
              </Box>

              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={900} gutterBottom>
                  Patient-provided booking info
                </Typography>
                {(() => {
                  const parsed = parseBookingNotes(detailRow.notes);
                  const rows2: { label: string; value: string }[] = [];
                  const keys = [
                    "Requested services",
                    "Visit",
                    "Gender",
                    "Patient comments",
                  ];
                  for (const k of keys) {
                    if (parsed[k]) rows2.push({ label: k, value: parsed[k] });
                  }
                  if (rows2.length === 0) {
                    return (
                      <Typography variant="body2" color="text.secondary">
                        No additional booking details were provided.
                      </Typography>
                    );
                  }
                  return (
                    <Box sx={{ display: "grid", gap: 0.75 }}>
                      {rows2.map((x) => (
                        <Box key={x.label}>
                          <Typography variant="body2" color="text.secondary">
                            {x.label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {x.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
              </Box>

              {detailRow.notes && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" fontWeight={900} gutterBottom>
                    Raw notes
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: "grey.50",
                      whiteSpace: "pre-wrap",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: "0.85rem",
                    }}
                  >
                    {detailRow.notes}
                  </Paper>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailForId(null)}>Close</Button>
          {detailRow ? (
            <Button component={RouterLink} to={`/dentist/patients/${detailRow.patient.id}`} variant="contained">
              Open patient record
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
