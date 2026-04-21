import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import { api, getApiBase, getToken } from "../../lib/api";

type Dentist = {
  id: string;
  specialty?: string | null;
  user: { email: string };
};

type Slot = { startAt: string; endAt: string };

type ApptRow = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  dentist: { user: { email: string } };
};

type PatientMe = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
};

type DentistGcash = {
  provider: "GCASH";
  phoneNumber?: string | null;
  originalName: string;
  qrUrl: string;
  updatedAt: string;
};

const DENTAL_SERVICES: { id: string; label: string; price: string }[] = [
  { id: "cleaning", label: "Dental Cleaning", price: "P800 - 1.5k" },
  { id: "extraction", label: "Tooth Extraction", price: "P800 - 3k" },
  { id: "dentures", label: "Dentures", price: "P3.5k - 20k" },
  { id: "restoration", label: "Teeth Restoration", price: "P1k - 2.5k" },
  { id: "crowns", label: "Jacket Crowns", price: "P5k - 15k" },
  { id: "consult", label: "General Consultation", price: "P500" },
];

function splitFullName(full: string): { firstName: string; lastName: string } {
  const t = full.trim().split(/\s+/).filter(Boolean);
  if (t.length === 0) return { firstName: "", lastName: "" };
  if (t.length === 1) return { firstName: t[0], lastName: t[0] };
  return { firstName: t[0], lastName: t.slice(1).join(" ") };
}

function buildAppointmentNotes(params: {
  services: string[];
  visitMode: "in-person" | "virtual";
  gender: string;
  comments: string;
  photoName: string | null;
}): string {
  const lines = [
    `Requested services: ${params.services.join(", ") || "Not specified"}`,
    `Visit: ${params.visitMode === "virtual" ? "Virtual" : "In-person"}`,
    `Gender: ${params.gender || "Not specified"}`,
  ];
  if (params.photoName) lines.push(`Photo filename (reference): ${params.photoName}`);
  if (params.comments.trim()) lines.push(`Patient comments: ${params.comments.trim()}`);
  return lines.join("\n");
}

function primaryServiceLabel(notes: string | null | undefined): string {
  if (!notes) return "Scheduled visit";
  const m = /Requested services:\s*([^\n]+)/i.exec(notes);
  if (m) {
    const first = m[1].split(",")[0]?.trim();
    if (first) return first;
  }
  return "Scheduled visit";
}

function isVirtualFromNotes(notes: string | null | undefined): boolean {
  return /Visit:\s*Virtual/i.test(notes ?? "");
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        display: "block",
        mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

export function BookingWorkspace({
  showAppointmentHistory = false,
}: {
  showAppointmentHistory?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [dentistId, setDentistId] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [appointments, setAppointments] = useState<ApptRow[]>([]);

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [contact, setContact] = useState("");
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [visitMode, setVisitMode] = useState<"in-person" | "virtual">("in-person");
  const [comments, setComments] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [gcash, setGcash] = useState<DentistGcash | null>(null);
  const [gcashError, setGcashError] = useState<string | null>(null);
  const [amountPhp, setAmountPhp] = useState("500");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<Dentist[]>("/api/dentists")
      .then((d) => {
        setDentists(d);
        if (d[0]) setDentistId(d[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dentists"));
  }, []);

  const onlyDentist = useMemo(() => dentists[0] ?? null, [dentists]);

  useEffect(() => {
    void api<PatientMe>("/api/patients/me")
      .then((p) => {
        setFullName(`${p.firstName} ${p.lastName}`.trim());
        setContact(p.phone ?? "");
        setAddress(p.address ?? "");
      })
      .catch(() => {});
  }, []);

  async function loadAppointments() {
    try {
      const list = await api<ApptRow[]>("/api/appointments");
      setAppointments(list);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadAppointments();
  }, []);

  useEffect(() => {
    const st = location.state as { bookingSuccess?: boolean; message?: string } | null;
    if (st?.bookingSuccess) {
      setSuccessMsg(st.message ?? "Your appointment was booked successfully.");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const dateStr = date?.format("YYYY-MM-DD") ?? "";

  useEffect(() => {
    if (!dentistId) return;
    setGcash(null);
    setGcashError(null);
    void api<DentistGcash>(`/api/public-payment-methods/dentists/${encodeURIComponent(dentistId)}/gcash`)
      .then(setGcash)
      .catch((e) => setGcashError(e instanceof Error ? e.message : "No GCash method"));
  }, [dentistId]);

  const loadSlots = useCallback(async () => {
    if (!dentistId || !dateStr) return;
    setError(null);
    setSelectedSlot(null);
    try {
      const s = await api<Slot[]>(
        `/api/dentists/${encodeURIComponent(dentistId)}/slots?date=${encodeURIComponent(dateStr)}`,
      );
      setSlots(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load slots");
    }
  }, [dentistId, dateStr]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function cancelAppointment(id: string) {
    setError(null);
    try {
      await api(`/api/appointments/${id}`, { method: "DELETE" });
      await loadAppointments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const upcoming = appointments
      .filter((a) => a.status !== "CANCELLED" && new Date(a.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return upcoming[0] ?? null;
  }, [appointments]);

  const toggleService = (id: string) => {
    setServices((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  async function handleConfirm() {
    if (!dentistId || !selectedSlot) {
      setError("Choose a dentist, date, and available time.");
      return;
    }
    if (visitMode === "virtual" && !paymentProof) {
      setError("Please upload your payment proof before confirming.");
      return;
    }
    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName) {
      setError("Please enter your full name.");
      return;
    }
    const selectedLabels = DENTAL_SERVICES.filter((s) => services[s.id]).map((s) => s.label);
    const notes = buildAppointmentNotes({
      services: selectedLabels,
      visitMode,
      gender,
      comments,
      photoName,
    });

    setBusy(true);
    setError(null);
    try {
      await api("/api/patients/me", {
        method: "PATCH",
        body: JSON.stringify({
          firstName,
          lastName,
          phone: contact || undefined,
          address: address || null,
        }),
      });
      const cents = Math.round((Number(amountPhp || "0") || 0) * 100);
      const fd = new FormData();
      fd.set("dentistId", dentistId);
      fd.set("startAt", selectedSlot.startAt);
      fd.set("endAt", selectedSlot.endAt);
      fd.set("notes", notes);
      fd.set("amountCents", String(cents));
      if (paymentProof) fd.set("proof", paymentProof);

      const token = getToken();
      const res = await fetch(`${getApiBase()}/api/payments/appointments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof payload.error === "string" ? payload.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      await loadAppointments();
      const when = new Date(selectedSlot.startAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      navigate("/patient/appointments", {
        replace: false,
        state: {
          bookingSuccess: true,
          message: `Appointment confirmed for ${when}.`,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr min(380px, 100%)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main", mb: 0.5 }}>
            Book Your Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please provide accurate details for your dental record.
          </Typography>

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
              {successMsg}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
              <FieldLabel>Full name</FieldLabel>
              <TextField
                fullWidth
                placeholder="Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                size="small"
              />
            </Box>
            <Box>
              <FieldLabel>Address</FieldLabel>
              <TextField
                fullWidth
                placeholder="City, Province"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                size="small"
              />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <FieldLabel>Gender</FieldLabel>
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">
                      <em>Select gender</em>
                    </MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FieldLabel>Contact number</FieldLabel>
                <TextField
                  fullWidth
                  placeholder="09123456789"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  size="small"
                />
              </Box>
            </Box>

            {onlyDentist ? (
              <Box>
                <FieldLabel>Dentist</FieldLabel>
                <TextField
                  fullWidth
                  size="small"
                  value={`${onlyDentist.user.email}${onlyDentist.specialty ? ` — ${onlyDentist.specialty}` : ""}`}
                  disabled
                />
              </Box>
            ) : null}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <FieldLabel>Preferred date</FieldLabel>
                <DatePicker
                  value={date}
                  onChange={(v) => setDate(v)}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </Box>
              <Box>
                <FieldLabel>Preferred time</FieldLabel>
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={selectedSlot?.startAt ?? ""}
                    onChange={(e) => {
                      const s = slots.find((x) => x.startAt === e.target.value);
                      setSelectedSlot(s ?? null);
                    }}
                    disabled={slots.length === 0}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">
                      <em>{slots.length === 0 ? "No slots — pick another date" : "Select time"}</em>
                    </MenuItem>
                    {slots.map((s) => (
                      <MenuItem key={s.startAt} value={s.startAt}>
                        {new Date(s.startAt).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box>
              <FieldLabel>Select dental services (estimated prices)</FieldLabel>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 0.5,
                  mt: 0.5,
                }}
              >
                {DENTAL_SERVICES.map((s) => (
                  <FormControlLabel
                    key={s.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={!!services[s.id]}
                        onChange={() => toggleService(s.id)}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {s.label} <Typography component="span" color="text.secondary">({s.price})</Typography>
                      </Typography>
                    }
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <FieldLabel>Upload photo</FieldLabel>
              <Button variant="outlined" component="label" size="small" sx={{ borderRadius: 2, textTransform: "none" }}>
                Choose file
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPhotoName(f ? f.name : null);
                  }}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {photoName ?? "No file chosen"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Filename is stored with your request; file upload to clinic systems may be added later.
              </Typography>
            </Box>

            {visitMode === "virtual" ? (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 1, color: "primary.main" }}>GCash payment</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Scan the QR code using the GCash app, then upload your payment proof (screenshot/receipt). Payment is
                  required for virtual visits.
                </Typography>
                {gcashError ? (
                  <Alert severity="warning" sx={{ mb: 1.5 }}>
                    {gcashError}
                  </Alert>
                ) : null}
                {gcash ? (
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                    <Box
                      component="img"
                      alt="GCash QR"
                      src={`${getApiBase()}${gcash.qrUrl}`}
                      sx={{
                        width: 180,
                        height: 180,
                        bgcolor: "#fff",
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        objectFit: "contain",
                      }}
                    />
                    <Box sx={{ flex: "1 1 240px" }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        GCash number: <strong>{gcash.phoneNumber ?? "—"}</strong>
                      </Typography>
                      <TextField
                        label="Amount (PHP)"
                        value={amountPhp}
                        onChange={(e) => setAmountPhp(e.target.value)}
                        size="small"
                        sx={{ mb: 1.5 }}
                        inputProps={{ inputMode: "decimal" }}
                      />
                      <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        sx={{ borderRadius: 2, textTransform: "none" }}
                      >
                        Upload payment proof
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setPaymentProof(f);
                          }}
                        />
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {paymentProof?.name ?? "No file chosen"}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No QR code uploaded for this dentist yet.
                  </Typography>
                )}
              </Box>
            ) : null}

            <Box sx={{ bgcolor: "rgba(0, 150, 136, 0.06)", borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontWeight: 700, color: "primary.main", mb: 1 }}>Mode of visit:</Typography>
              <RadioGroup
                row
                value={visitMode}
                onChange={(e) => setVisitMode(e.target.value as "in-person" | "virtual")}
              >
                <FormControlLabel value="in-person" control={<Radio size="small" color="primary" />} label="In-person" />
                <FormControlLabel value="virtual" control={<Radio size="small" color="primary" />} label="Virtual" />
              </RadioGroup>
            </Box>

            <Box>
              <FieldLabel>Additional comments</FieldLabel>
              <TextField
                fullWidth
                multiline
                minRows={3}
                placeholder="Any specific dental concerns..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                size="small"
              />
            </Box>

            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={busy || (visitMode === "virtual" && !paymentProof)}
              onClick={() => void handleConfirm()}
              sx={{ py: 1.5, fontWeight: 800, letterSpacing: "0.12em" }}
            >
              Confirm booking
            </Button>
          </Box>
        </Paper>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Appointment
            </Typography>
            {nextAppointment ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "rgba(0, 150, 136, 0.12)",
                  border: "1px solid",
                  borderColor: "rgba(0, 150, 136, 0.35)",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.dark" }}>
                  {primaryServiceLabel(nextAppointment.notes)}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em" }}>
                  {isVirtualFromNotes(nextAppointment.notes) ? "VIRTUAL" : "IN-PERSON"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {new Date(nextAppointment.startAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Typography>
                <Typography variant="body2">
                  {new Date(nextAppointment.startAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Typography>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No upcoming appointment yet. Book using the form.
              </Typography>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Typography sx={{ fontSize: "1.75rem", mb: 1 }}>
              🦷
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Need help?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              You can use our Virtual Consultation if you can&apos;t make it to the clinic. Just select &apos;Virtual&apos; in
              the form!
            </Typography>
          </Paper>
        </Box>
      </Box>

      {showAppointmentHistory && (
        <Paper sx={{ p: 2, mt: 3, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            My appointments
          </Typography>
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
              {appointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      No appointments yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {appointments.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {new Date(r.startAt).toLocaleString()} –{" "}
                    {new Date(r.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>{r.dentist.user.email}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.status !== "CANCELLED" && r.status !== "COMPLETED" && (
                      <Button size="small" onClick={() => void cancelAppointment(r.id)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </LocalizationProvider>
  );
}
