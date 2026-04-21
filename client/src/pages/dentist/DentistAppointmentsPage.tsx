import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Select,
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
  patient: { firstName: string; lastName: string };
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

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

export function DentistAppointmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null);
  const [startHour, setStartHour] = useState<number | "">("");
  const [endHour, setEndHour] = useState<number | "">("");

  async function load() {
    try {
      const data = await api<Row[]>("/api/appointments");
      setRows(
        [...data].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
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

  function resetFilters() {
    setFilterDate(null);
    setStartHour("");
    setEndHour("");
  }

  async function setStatus(id: string, status: string) {
    try {
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
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
          mb: 2,
          letterSpacing: "0.02em",
        }}
      >
        All appointments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
          Showing {filtered.length} of {rows.length}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.length === 0 && !error && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No appointments match your filters.
          </Typography>
        )}
        {filtered.map((r) => {
          const service = r.notes?.trim() || "Visit";
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
      </Box>
    </LocalizationProvider>
  );
}
