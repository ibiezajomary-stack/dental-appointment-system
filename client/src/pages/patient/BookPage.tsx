import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

type Dentist = {
  id: string;
  specialty?: string | null;
  user: { email: string };
};

type Slot = { startAt: string; endAt: string };

export function BookPage() {
  const navigate = useNavigate();
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [dentistId, setDentistId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
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

  const loadSlots = useCallback(async () => {
    if (!dentistId || !date) return;
    setError(null);
    try {
      const s = await api<Slot[]>(
        `/api/dentists/${encodeURIComponent(dentistId)}/slots?date=${encodeURIComponent(date)}`,
      );
      setSlots(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load slots");
    }
  }, [dentistId, date]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function book(slot: Slot) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          dentistId,
          startAt: slot.startAt,
          endAt: slot.endAt,
        }),
      });
      const when = new Date(slot.startAt).toLocaleString(undefined, {
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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Book an appointment
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="dentist-label">Dentist</InputLabel>
          <Select
            labelId="dentist-label"
            label="Dentist"
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
          >
            {dentists.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.user.email}
                {d.specialty ? ` — ${d.specialty}` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: 16, borderRadius: 4, border: "1px solid #ccc" }}
        />
      </Box>
      <Typography variant="subtitle2" gutterBottom>
        Available slots (30 minutes)
      </Typography>
      {slots.length === 0 ? (
        <Typography color="text.secondary">No open slots for this day.</Typography>
      ) : (
        <Box display="flex" flexWrap="wrap" gap={1}>
          {slots.map((s) => (
            <Button
              key={s.startAt}
              variant="outlined"
              size="small"
              disabled={busy}
              onClick={() => void book(s)}
            >
              {new Date(s.startAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Button>
          ))}
        </Box>
      )}
    </Paper>
  );
}
