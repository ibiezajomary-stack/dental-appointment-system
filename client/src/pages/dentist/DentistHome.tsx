import { useCallback, useEffect, useMemo, useState } from "react";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import {
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

type AppointmentRow = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  patient: { firstName: string; lastName: string };
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function calendarWeeks(year: number, month: number): (number | null)[][] {
  const firstDow = new Date(year, month, 1).getDay();
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function formatHourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatScheduleHeading(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const TIMELINE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

export function DentistHome() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => startOfDay(new Date()));

  const load = useCallback(() => {
    void api<AppointmentRow[]>("/api/appointments").then(setRows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const weeks = useMemo(() => calendarWeeks(y, m), [y, m]);

  const dayAppointments = useMemo(() => {
    return rows.filter((r) => {
      if (r.status === "CANCELLED") return false;
      const t = new Date(r.startAt);
      return isSameDay(t, selectedDate);
    });
  }, [rows, selectedDate]);

  const summaryNames = useMemo(() => {
    const names = dayAppointments.map((r) => `${r.patient.firstName} ${r.patient.lastName}`);
    return [...new Set(names)];
  }, [dayAppointments]);

  const appointmentsByHour = useMemo(() => {
    const map = new Map<number, AppointmentRow[]>();
    for (const h of TIMELINE_HOURS) {
      if (h === 12) continue;
      map.set(h, []);
    }
    for (const r of dayAppointments) {
      const hour = new Date(r.startAt).getHours();
      if (hour < 9 || hour > 17 || hour === 12) continue;
      const list = map.get(hour) ?? [];
      list.push(r);
      map.set(hour, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [dayAppointments]);

  async function markDone(id: string) {
    try {
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      load();
    } catch {
      /* surface via toast in future */
    }
  }

  function slotSummary(a: AppointmentRow): string {
    const service = a.notes?.trim() || "Visit";
    return `${service} • Room 1`;
  }

  const today = new Date();
  const isTodaySelected = isSameDay(selectedDate, today);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
          Welcome, Doctor
        </Typography>
        <Typography variant="body1" color="text.secondary" component="div">
          Viewing schedule for <strong>{formatScheduleHeading(selectedDate)}</strong>
          {!isTodaySelected && (
            <Button size="small" onClick={() => setSelectedDate(new Date())} sx={{ ml: 1, verticalAlign: "baseline" }}>
              Jump to today
            </Button>
          )}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <IconButton
                size="small"
                aria-label="Previous month"
                onClick={() => setViewMonth(new Date(y, m - 1, 1))}
              >
                <ChevronLeft />
              </IconButton>
              <Typography fontWeight={700}>
                {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </Typography>
              <IconButton
                size="small"
                aria-label="Next month"
                onClick={() => setViewMonth(new Date(y, m + 1, 1))}
              >
                <ChevronRight />
              </IconButton>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 0.5,
                textAlign: "center",
                alignItems: "center",
              }}
            >
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <Typography key={d} variant="caption" color="text.secondary" fontWeight={600}>
                  {d}
                </Typography>
              ))}
              {weeks.flat().map((day, idx) => {
                if (day === null) {
                  return <Box key={`e-${idx}`} sx={{ height: 36 }} />;
                }
                const cellDate = new Date(y, m, day);
                const selected = isSameDay(cellDate, selectedDate);
                const isTodayCell = isSameDay(cellDate, today);
                return (
                  <Button
                    key={`${y}-${m}-${day}`}
                    variant="text"
                    onClick={() => setSelectedDate(cellDate)}
                    sx={{
                      minWidth: 36,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      p: 0,
                      mx: "auto",
                      fontWeight: selected ? 700 : 400,
                      bgcolor: selected ? "primary.main" : "transparent",
                      color: selected ? "primary.contrastText" : isTodayCell ? "primary.main" : "text.primary",
                      "&:hover": {
                        bgcolor: selected ? "primary.dark" : "action.hover",
                      },
                    }}
                  >
                    {day}
                  </Button>
                );
              })}
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              borderLeft: "4px solid",
              borderColor: "primary.main",
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Summary: {isSameDay(selectedDate, today) ? "Today" : "Selected day"}
            </Typography>
            {summaryNames.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No appointments on this day.
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {summaryNames.map((name) => (
                  <Typography component="li" variant="body2" key={name}>
                    {name}
                  </Typography>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 4,
                height: 28,
                borderRadius: 1,
                bgcolor: "primary.main",
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Timeline View
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
          >
            {TIMELINE_HOURS.map((hour) => {
              if (hour === 12) {
                return (
                  <Box
                    key="lunch"
                    sx={{
                      display: "flex",
                      py: 2,
                      mb: 1,
                      border: "2px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      bgcolor: "grey.100",
                      px: 2,
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ width: 72, flexShrink: 0, fontStyle: "italic" }}
                    >
                      {formatHourLabel(12)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Lunch Break
                    </Typography>
                  </Box>
                );
              }

              const list = appointmentsByHour.get(hour) ?? [];
              const hasAppt = list.length > 0;

              return (
                <Box
                  key={hour}
                  sx={{
                    display: "flex",
                    gap: 2,
                    mb: 2,
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ width: 72, flexShrink: 0, pt: hasAppt ? 1.5 : 0.5, fontStyle: !hasAppt ? "italic" : "normal" }}
                  >
                    {formatHourLabel(hour)}
                  </Typography>
                  <Box sx={{ flex: 1, minHeight: hasAppt ? "auto" : 32 }}>
                    {!hasAppt ? (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ pt: 0.5 }}>
                        Available Slot
                      </Typography>
                    ) : (
                      list.map((a) => (
                        <Box
                          key={a.id}
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            borderRadius: 2,
                            p: 2,
                            mb: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                            flexWrap: "wrap",
                            boxShadow: "0 2px 8px rgba(0,150,136,0.35)",
                          }}
                        >
                          <Box>
                            <Typography fontWeight={700}>
                              {a.patient.firstName} {a.patient.lastName}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.95 }}>
                              {slotSummary(a)}
                            </Typography>
                          </Box>
                          {a.status !== "COMPLETED" && (
                            <Button
                              size="small"
                              onClick={() => void markDone(a.id)}
                              sx={{
                                bgcolor: "rgba(255,255,255,0.95)",
                                color: "primary.dark",
                                fontWeight: 700,
                                "&:hover": { bgcolor: "#fff" },
                              }}
                            >
                              Done
                            </Button>
                          )}
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
