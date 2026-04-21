import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
  Link,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

type Row = {
  id: string;
  status: string;
  videoRoomId: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  appointmentId?: string | null;
  patient: { firstName: string; lastName: string; id: string };
  appointment: { startAt: string; notes: string | null } | null;
};

type ApptRow = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
  patient: { firstName: string; lastName: string; id: string };
};

function isVirtualFromNotes(notes: string | null | undefined): boolean {
  return /Visit:\s*Virtual/i.test(notes ?? "");
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function statusDisplay(status: string): string {
  switch (status) {
    case "REQUESTED":
      return "Pending";
    case "SCHEDULED":
      return "Confirmed";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function statusTextColor(status: string): string {
  switch (status) {
    case "SCHEDULED":
    case "COMPLETED":
      return "#2e7d32";
    case "REQUESTED":
      return "#1565c0";
    case "IN_PROGRESS":
      return "#ef6c00";
    case "CANCELLED":
      return "#c62828";
    default:
      return "inherit";
  }
}

function formatTableDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatTableTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatRecentSubtitle(r: Row): string {
  const label = statusDisplay(r.status);
  const ref = r.endedAt ?? r.startedAt ?? r.updatedAt ?? r.createdAt;
  const d = new Date(ref);
  const now = new Date();
  const timeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isSameDay(d, now)) {
    return `${label} — Today, ${timeStr}`;
  }
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (isSameDay(d, yest)) {
    return `${label} — Yesterday, ${timeStr}`;
  }
  return `${label} — ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}, ${timeStr}`;
}

const FILTER_ALL = "ALL";

export function DentistConsultationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState("");
  const [plan, setPlan] = useState("");

  async function load() {
    try {
      const [consultations, appointments] = await Promise.all([
        api<Row[]>("/api/consultations"),
        api<ApptRow[]>("/api/appointments"),
      ]);
      setRows(consultations);
      setAppts(appointments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const recentCall = useMemo(() => {
    if (rows.length === 0) return null;
    const completed = rows
      .filter((r) => r.status === "COMPLETED")
      .sort((a, b) => {
        const ea = a.endedAt ?? a.updatedAt;
        const eb = b.endedAt ?? b.updatedAt;
        return new Date(eb).getTime() - new Date(ea).getTime();
      });
    if (completed.length > 0) return completed[0];
    return [...rows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [rows]);

  const consultationByAppointmentId = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of rows) {
      if (r.appointmentId) m.set(r.appointmentId, r);
    }
    return m;
  }, [rows]);

  const virtualAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appts.filter((a) => {
      if (!isVirtualFromNotes(a.notes)) return false;
      if (statusFilter !== FILTER_ALL && a.status !== statusFilter) return false;
      if (!q) return true;
      const name = `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase();
      return name.includes(q);
    });
  }, [appts, search, statusFilter]);

  const todaysRows = useMemo(() => {
    const today = new Date();
    return virtualAppointments
      .filter((a) => isSameDay(new Date(a.startAt), today))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [virtualAppointments]);

  async function setStatus(id: string, status: string) {
    try {
      await api(`/api/consultations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function startCall(id: string) {
    try {
      await api(`/api/consultations/${encodeURIComponent(id)}/start-call`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start call");
    }
  }

  async function startCallForAppointment(appointmentId: string) {
    try {
      await api(`/api/consultations/by-appointment/${encodeURIComponent(appointmentId)}/start-call`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start call");
    }
  }

  async function saveNote() {
    if (!noteFor) return;
    try {
      await api(`/api/consultations/${noteFor}/notes`, {
        method: "POST",
        body: JSON.stringify({
          diagnosis,
          notes,
          prescribedMedication: meds,
          treatmentPlan: plan,
        }),
      });
      setNoteFor(null);
      setDetailFor(null);
      setDiagnosis("");
      setNotes("");
      setMeds("");
      setPlan("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    }
  }

  const detailRow = detailFor ? rows.find((r) => r.id === detailFor) : null;

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "grey.200",
        borderRadius: 3,
        p: { xs: 2, sm: 3 },
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Recent Calls */}
      <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 1.5 }}>
        Recent calls
      </Typography>
      {recentCall ? (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 2,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
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
            }}
          >
            <Box>
              <Typography fontWeight={700}>
                {recentCall.patient.firstName} {recentCall.patient.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {formatRecentSubtitle(recentCall)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              sx={{
                bgcolor: "#1976d2",
                borderRadius: 999,
                px: 3,
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { bgcolor: "#1565c0" },
              }}
              onClick={() => navigate(`/dentist/patients/${recentCall.patient.id}`)}
            >
              Call back
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No consultations yet.
        </Typography>
      )}

      {/* Search + filter */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
          alignItems: "flex-start",
        }}
      >
        <TextField
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{
            flex: "1 1 240px",
            maxWidth: { sm: "100%", md: "calc(100% - 200px)" },
            "& .MuiOutlinedInput-root": { borderRadius: 2 },
          }}
        />
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel id="vc-filter">Filter</InputLabel>
          <Select
            labelId="vc-filter"
            label="Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value={FILTER_ALL}>All statuses</MenuItem>
            <MenuItem value="REQUESTED">Pending</MenuItem>
            <MenuItem value="SCHEDULED">Confirmed</MenuItem>
            <MenuItem value="IN_PROGRESS">In progress</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Today's schedule (from virtual appointments) */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ px: 2, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Today&apos;s virtual schedule
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {todaysRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No virtual appointments scheduled for today.
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1.25 }}>
              {todaysRows.map((a) => {
                const d = new Date(a.startAt);
                const c = consultationByAppointmentId.get(a.id) ?? null;
                const status = c?.status ?? a.status;
                return (
                  <Box
                    key={a.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      flexWrap: "wrap",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      px: 1.75,
                      py: 1.25,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={800}>
                        {a.patient.firstName} {a.patient.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatTableTime(d)} •{" "}
                        <span style={{ color: statusTextColor(status), fontWeight: 700 }}>
                          {statusDisplay(status)}
                        </span>
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                      {c && (
                        <Button size="small" variant="outlined" onClick={() => setDetailFor(c.id)}>
                          Details
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        disabled={status === "IN_PROGRESS"}
                        onClick={() => void startCallForAppointment(a.id)}
                      >
                        Start call
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Paper>

      {/* All Virtual Appointments table (from patient-booked appointments) */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <Box sx={{ px: 2, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            All virtual appointments
          </Typography>
        </Box>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
                  PATIENT NAME
                </TableCell>
                <TableCell sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
                  DATE
                </TableCell>
                <TableCell sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
                  TIME
                </TableCell>
                <TableCell sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
                  STATUS
                </TableCell>
                <TableCell sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
                  ACTION
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {virtualAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No virtual appointments match your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                virtualAppointments.map((a) => {
                  const d = new Date(a.startAt);
                  const c = consultationByAppointmentId.get(a.id) ?? null;
                  const status = c?.status ?? a.status;
                  return (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {a.patient.firstName} {a.patient.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatTableDate(d)}</TableCell>
                      <TableCell>{formatTableTime(d)}</TableCell>
                      <TableCell>
                        <Typography sx={{ color: statusTextColor(status), fontWeight: 600 }}>
                          {statusDisplay(status)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {c ? (
                            <Link
                              component="button"
                              type="button"
                              underline="hover"
                              sx={{ cursor: "pointer", fontWeight: 600 }}
                              onClick={() => setDetailFor(c.id)}
                            >
                              Details
                            </Link>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Not started
                            </Typography>
                          )}
                          <Button
                            size="small"
                            variant="contained"
                            disabled={status === "IN_PROGRESS"}
                            onClick={() => void startCallForAppointment(a.id)}
                          >
                            Start call
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Details dialog */}
      <Dialog open={Boolean(detailRow)} onClose={() => setDetailFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Consultation details</DialogTitle>
        <DialogContent>
          {detailRow && (
            <>
              <Typography variant="body2" color="text.secondary">
                Patient
              </Typography>
              <Typography fontWeight={700} gutterBottom>
                {detailRow.patient.firstName} {detailRow.patient.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography sx={{ color: statusTextColor(detailRow.status), fontWeight: 600 }} gutterBottom>
                {statusDisplay(detailRow.status)}
              </Typography>
              {detailRow.videoRoomId && (
                <Button
                  component={RouterLink}
                  to={`/dentist/consultations/${detailRow.id}/video`}
                  variant="outlined"
                  sx={{ mt: 1, mb: 2 }}
                >
                  Join video
                </Button>
              )}
              <Button
                variant="contained"
                sx={{ mt: detailRow.videoRoomId ? 0 : 1, mb: 2, ml: detailRow.videoRoomId ? 1 : 0 }}
                onClick={() => void startCall(detailRow.id)}
              >
                Start call
              </Button>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                <Button size="small" variant="outlined" onClick={() => void setStatus(detailRow.id, "SCHEDULED")}>
                  Mark confirmed
                </Button>
                <Button size="small" variant="outlined" onClick={() => void setStatus(detailRow.id, "COMPLETED")}>
                  Mark completed
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button onClick={() => setDetailFor(null)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (detailFor) {
                setNoteFor(detailFor);
                setDetailFor(null);
              }
            }}
          >
            Add clinical note
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clinical note dialog */}
      <Dialog open={!!noteFor} onClose={() => setNoteFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Consultation note</DialogTitle>
        <DialogContent>
          <TextField
            label="Diagnosis"
            fullWidth
            margin="normal"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
          <TextField
            label="Prescribed medication"
            fullWidth
            margin="normal"
            value={meds}
            onChange={(e) => setMeds(e.target.value)}
          />
          <TextField
            label="Notes"
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <TextField
            label="Treatment plan"
            fullWidth
            margin="normal"
            multiline
            minRows={2}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveNote()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
