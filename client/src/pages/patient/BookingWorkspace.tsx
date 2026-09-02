import { useCallback, useEffect, useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import { api, getApiBase, getToken } from "../../lib/api";
import { NeedHelpButton } from "../../components/NeedHelpButton";

type Dentist = {
  id: string;
  displayName?: string | null;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  clinicAddress?: string | null;
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
  sex?: string | null;
  dateOfBirth?: string | null;
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

type ClinicSupport = {
  clinicPhone: string | null;
  supportPhone?: string | null;
  clinicEmail?: string | null;
  clinicName: string;
  clinicAddress?: string | null;
  dentistName?: string | null;
};

function phoneToTel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) return `+63${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+63${digits}`;
  if (digits.length === 12 && digits.startsWith("63")) return `+${digits}`;
  return raw.replace(/\s/g, "");
}

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

const APPOINTMENT_FOR_OPTIONS = [
  "Self",
  "Parent",
  "Spouse",
  "Child",
  "Sibling",
  "Friend",
  "Other",
] as const;
type AppointmentFor = (typeof APPOINTMENT_FOR_OPTIONS)[number];

function buildAppointmentNotes(params: {
  services: string[];
  visitMode: "in-person" | "virtual";
  gender: string;
  comments: string;
  appointmentFor: AppointmentFor;
  appointmentForOther?: string;
  patientAgeYears: number | null;
}): string {
  const lines = [
    `Appointment for: ${params.appointmentFor}${
      params.appointmentFor === "Other" && params.appointmentForOther?.trim()
        ? ` (${params.appointmentForOther.trim()})`
        : ""
    }`,
    `Requested services: ${params.services.join(", ") || "Not specified"}`,
    `Visit: ${params.visitMode === "virtual" ? "Virtual" : "In-person"}`,
    `Gender: ${params.gender || "Not specified"}`,
  ];
  if (params.patientAgeYears != null) lines.push(`Age (years): ${params.patientAgeYears}`);
  if (params.comments.trim()) lines.push(`Patient comments: ${params.comments.trim()}`);
  return lines.join("\n");
}

function ageFromDobIso(dobIso: string | null | undefined): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
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
  const [dentistId, setDentistId] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [appointments, setAppointments] = useState<ApptRow[]>([]);

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [patientAgeYears, setPatientAgeYears] = useState<number | null>(null);
  const [appointmentFor, setAppointmentFor] = useState<AppointmentFor>("Self");
  const [appointmentForOther, setAppointmentForOther] = useState("");
  const [contact, setContact] = useState("");
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [visitMode, setVisitMode] = useState<"in-person" | "virtual">("in-person");
  const [comments, setComments] = useState("");
  const [teethPhoto, setTeethPhoto] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [refundGcashNumber, setRefundGcashNumber] = useState("");
  const [gcash, setGcash] = useState<DentistGcash | null>(null);
  const [gcashError, setGcashError] = useState<string | null>(null);
  const [amountPhp, setAmountPhp] = useState("500");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noSlotDates, setNoSlotDates] = useState<Set<string>>(new Set());
  const [prefetchBusy, setPrefetchBusy] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  const [patientMe, setPatientMe] = useState<PatientMe | null>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [clinicSupport, setClinicSupport] = useState<ClinicSupport | null>(null);

  useEffect(() => {
    void api<Dentist[]>("/api/dentists")
      .then((d) => {
        setDentists(d);
        if (d[0]) setDentistId(d[0].id);
        else setError("No dentist is configured yet.");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dentists"));

    void api<ClinicSupport>("/api/public/support")
      .then(setClinicSupport)
      .catch(() => {});
  }, []);

  // Single dentist system: dentistId is auto-selected from the first dentist record.

  useEffect(() => {
    void api<PatientMe>("/api/patients/me")
      .then((p) => {
        setPatientMe(p);
        setFullName(`${p.firstName} ${p.lastName}`.trim());
        setContact(p.phone ?? "");
        setAddress(p.address ?? "");
        setPatientAgeYears(ageFromDobIso(p.dateOfBirth));
        if (p.sex === "Male" || p.sex === "Female") setGender(p.sex);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (appointmentFor !== "Self" || !patientMe) return;
    setFullName(`${patientMe.firstName} ${patientMe.lastName}`.trim());
    setContact(patientMe.phone ?? "");
    setAddress(patientMe.address ?? "");
    setPatientAgeYears(ageFromDobIso(patientMe.dateOfBirth));
    if (patientMe.sex === "Male" || patientMe.sex === "Female") setGender(patientMe.sex);
  }, [appointmentFor, patientMe]);

  useEffect(() => {
    if (visitMode !== "virtual") return;
    setServices((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const k of Object.keys(next)) {
        if (k !== "consult") next[k] = false;
      }
      next.consult = true;
      return next;
    });
  }, [visitMode]);

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
      setSuccessMsg(st.message ?? "Your booking has been sent.");
      setSentOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const dateStr = date?.format("YYYY-MM-DD") ?? "";
  const monthKey = (date ?? dayjs()).format("YYYY-MM");

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

  useEffect(() => {
    let cancelled = false;
    async function prefetchMonth() {
      if (!dentistId) return;
      const anchor = date ?? dayjs();
      const start = anchor.startOf("month");
      const end = anchor.endOf("month");
      setPrefetchBusy(true);
      const next = new Set<string>();
      try {
        for (let d = start; d.isBefore(end) || d.isSame(end, "day"); d = d.add(1, "day")) {
          if (cancelled) return;
          const ds = d.format("YYYY-MM-DD");
          try {
            const s = await api<Slot[]>(
              `/api/dentists/${encodeURIComponent(dentistId)}/slots?date=${encodeURIComponent(ds)}`,
            );
            if (s.length === 0) next.add(ds);
          } catch {
            // If a day fails to load, don't block the calendar.
          }
        }
        if (!cancelled) setNoSlotDates(next);
      } finally {
        if (!cancelled) setPrefetchBusy(false);
      }
    }
    void prefetchMonth();
    return () => {
      cancelled = true;
    };
  }, [dentistId, monthKey, date]);

  async function cancelAppointment(id: string) {
    setError(null);
    try {
      await api(`/api/appointments/${id}`, { method: "DELETE" });
      await loadAppointments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  const toggleService = (id: string) => {
    if (visitMode === "virtual" && id !== "consult") return;
    setServices((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  async function handleConfirm() {
    if (!dentistId || !selectedSlot) {
      setError("Choose a dentist, date, and available time.");
      return;
    }
    if (date && date.startOf("day").isBefore(dayjs().startOf("day"))) {
      setError("Please choose a date starting today.");
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
    if (selectedLabels.length === 0) {
      setError("Please select at least one dental service.");
      return;
    }
    if (visitMode === "virtual") {
      if (selectedLabels.length !== 1 || selectedLabels[0] !== "General Consultation") {
        setError("Virtual visits may only select General Consultation.");
        return;
      }
    }
    const notes = buildAppointmentNotes({
      services: selectedLabels,
      visitMode,
      gender,
      comments,
      appointmentFor,
      appointmentForOther,
      patientAgeYears,
    });

    setBusy(true);
    setError(null);
    try {
      await api("/api/patients/me", {
        method: "PATCH",
        body: JSON.stringify({
          firstName,
          lastName,
          sex: gender === "Male" || gender === "Female" ? gender : undefined,
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
      if (teethPhoto) fd.set("teethPhoto", teethPhoto);
      if (visitMode === "virtual" && refundGcashNumber) fd.set("refundGcashNumber", refundGcashNumber.trim());

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
      navigate("/patient/appointments", {
        replace: false,
        state: {
          bookingSuccess: true,
          message: "Your booking has been sent.",
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
              <FieldLabel>Appointment for</FieldLabel>
              <FormControl fullWidth size="small">
                <Select
                  value={appointmentFor}
                  onChange={(e) => setAppointmentFor(e.target.value as AppointmentFor)}
                  sx={{ borderRadius: 2 }}
                >
                  {APPOINTMENT_FOR_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {appointmentFor === "Other" ? (
              <Box>
                <FieldLabel>Please specify (Other)</FieldLabel>
                <TextField
                  fullWidth
                  size="small"
                  value={appointmentForOther}
                  onChange={(e) => setAppointmentForOther(e.target.value)}
                  placeholder="Relationship / context"
                />
              </Box>
            ) : null}
            <Box>
              <FieldLabel>Full name</FieldLabel>
              <TextField
                fullWidth
                placeholder="Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                size="small"
                disabled={appointmentFor === "Self"}
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
                    disabled={appointmentFor === "Self"}
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
                <FieldLabel>Age (from profile)</FieldLabel>
                <TextField
                  fullWidth
                  value={patientAgeYears == null ? "" : String(patientAgeYears)}
                  size="small"
                  disabled
                  placeholder={appointmentFor === "Self" ? "" : "—"}
                />
              </Box>
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

            {/* Dentist is auto-selected (single dentist system), so no dentist input is shown. */}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <FieldLabel>Preferred date</FieldLabel>
                <DatePicker
                  value={date}
                  onChange={(v) => setDate(v)}
                  shouldDisableDate={(d) => {
                    const today = dayjs().startOf("day");
                    if (d.isBefore(today, "day")) return true;
                    const key = d.format("YYYY-MM-DD");
                    return noSlotDates.has(key);
                  }}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      helperText: prefetchBusy ? "Checking availability for this month…" : " ",
                    },
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
                        disabled={visitMode === "virtual" && s.id !== "consult"}
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
              {visitMode === "virtual" ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                  Virtual visits are limited to General Consultation.
                </Typography>
              ) : null}
            </Box>

            <Box>
              <FieldLabel>Photo of teeth (optional)</FieldLabel>
              <Button variant="outlined" component="label" size="small" sx={{ borderRadius: 2, textTransform: "none" }}>
                Choose file
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setTeethPhoto(f ?? null);
                  }}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {teethPhoto ? teethPhoto.name : "No file chosen"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                This photo will be saved to your record for the dentist to view.
              </Typography>
            </Box>

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
                      <TextField
                        label="Your GCash number (for refunds)"
                        placeholder="09xxxxxxxxx"
                        value={refundGcashNumber}
                        onChange={(e) => setRefundGcashNumber(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1.5 }}
                        helperText="Enter your GCash number for refunds"
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
          {(() => {
            const selectedDentist = dentists.find((d) => d.id === dentistId) ?? dentists[0];
            const clinicName =
              selectedDentist?.displayName?.trim() ||
              clinicSupport?.dentistName?.trim() ||
              clinicSupport?.clinicName ||
              "Dental Clinic";
            const clinicPhone =
              clinicSupport?.clinicPhone?.trim() || clinicSupport?.supportPhone?.trim() || null;
            const clinicAddress =
              selectedDentist?.clinicAddress?.trim() || clinicSupport?.clinicAddress || null;
            const clinicEmail =
              selectedDentist?.user.email || clinicSupport?.clinicEmail || null;

            return (
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

                <Box sx={{ mb: 2, pb: 2, borderBottom: "1px solid rgba(255,255,255,0.25)" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    {clinicName}
                  </Typography>
                  {clinicPhone ? (
                    <Typography
                      component="a"
                      href={`tel:${phoneToTel(clinicPhone)}`}
                      variant="body2"
                      sx={{
                        display: "block",
                        opacity: 0.95,
                        mb: 0.5,
                        color: "inherit",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      📞 {clinicPhone}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.5, fontStyle: "italic" }}>
                      Contact number not set
                    </Typography>
                  )}
                  {clinicEmail ? (
                    <Typography
                      component="a"
                      href={`mailto:${clinicEmail}`}
                      variant="body2"
                      sx={{
                        display: "block",
                        opacity: 0.95,
                        mb: 0.5,
                        color: "inherit",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      ✉️ {clinicEmail}
                    </Typography>
                  ) : null}
                  {clinicAddress ? (
                    <Typography variant="body2" sx={{ opacity: 0.95 }}>
                      📍 {clinicAddress}
                    </Typography>
                  ) : null}
                </Box>

                <Typography variant="body2" sx={{ opacity: 0.95, mb: 1.5 }}>
                  You can use our Virtual Consultation if you can&apos;t make it to the clinic. Just select &apos;Virtual&apos; in
                  the form!
                </Typography>
                <NeedHelpButton variant="outlined" color="inherit" size="small" sx={{ color: "inherit", borderColor: "rgba(255,255,255,0.5)" }} />
              </Paper>
            );
          })()}
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

      <Dialog open={sentOpen} onClose={() => setSentOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Booking sent</DialogTitle>
        <DialogContent>
          <Typography variant="body1">Your booking has been sent.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You&apos;ll be notified when the dentist accepts your appointment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSentOpen(false)} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
