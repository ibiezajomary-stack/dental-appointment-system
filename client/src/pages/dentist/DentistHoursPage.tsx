import { useEffect, useMemo, useState } from "react";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

/** Must match server `slots.ts` — booking is only offered inside this window, minus your blocks. */
const DEFAULT_SCHEDULE_START_MINUTES = 6 * 60;
const DEFAULT_SCHEDULE_END_MINUTES = 22 * 60;

type Block = { dayOfWeek: number; startMinutes: number; endMinutes: number };

type BlockRow = Block & { id?: string };

type DateBlock = { id: string; startAt: string; endAt: string; reason: string | null; createdAt: string };

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function lunchWeekdaysTemplate(): Block[] {
  return [1, 2, 3, 4, 5].map((dow) => ({
    dayOfWeek: dow,
    startMinutes: 12 * 60,
    endMinutes: 13 * 60,
  }));
}

/** Block the whole default booking window (no slots that day). */
function weekendOffTemplate(): Block[] {
  return [
    { dayOfWeek: 6, startMinutes: DEFAULT_SCHEDULE_START_MINUTES, endMinutes: DEFAULT_SCHEDULE_END_MINUTES },
    { dayOfWeek: 0, startMinutes: DEFAULT_SCHEDULE_START_MINUTES, endMinutes: DEFAULT_SCHEDULE_END_MINUTES },
  ];
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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function minutesToTimeDayjs(m: number): Dayjs {
  return dayjs().startOf("day").add(m, "minute");
}

function formatScheduleWindow(): string {
  const s = new Date();
  s.setHours(6, 0, 0, 0);
  const e = new Date();
  e.setHours(22, 0, 0, 0);
  return `${s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–${e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function formatMinutesAsTime(mins: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMinutes(mins);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function DentistHoursPage() {
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dateBlocks, setDateBlocks] = useState<DateBlock[]>([]);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockTab, setBlockTab] = useState<"weekly" | "date">("weekly");
  const [draftRows, setDraftRows] = useState<BlockRow[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [dateBlockDate, setDateBlockDate] = useState<Dayjs | null>(dayjs());
  const [dateBlockStart, setDateBlockStart] = useState<Dayjs | null>(dayjs().hour(9).minute(0).second(0));
  const [dateBlockEnd, setDateBlockEnd] = useState<Dayjs | null>(dayjs().hour(10).minute(0).second(0));
  const [dateBlockReason, setDateBlockReason] = useState("");

  async function load() {
    try {
      const data = await api<BlockRow[]>("/api/dentists/me/unavailable-blocks");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function loadDateBlocks() {
    try {
      const data = await api<DateBlock[]>("/api/dentists/me/date-blocks");
      setDateBlocks(data);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void load();
    void loadDateBlocks();
  }, []);

  const hasUnavailableOnWeekday = useMemo(() => {
    const s = new Set(rows.map((r) => r.dayOfWeek));
    return (dow: number) => s.has(dow);
  }, [rows]);

  const hasDateBlockOnDate = useMemo(() => {
    const set = new Set(dateBlocks.map((b) => new Date(b.startAt).toDateString()));
    return (d: Date) => set.has(d.toDateString());
  }, [dateBlocks]);

  const blocksForSelectedWeekday = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dow = selectedCalendarDate.getDay();
    return rows
      .filter((r) => r.dayOfWeek === dow)
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [rows, selectedCalendarDate]);

  function openBlockDialog() {
    setDraftRows(rows.length > 0 ? rows.map((r) => ({ ...r })) : []);
    setBlockOpen(true);
  }

  function closeDialog() {
    setBlockOpen(false);
  }

  function addDraftRow() {
    setDraftRows([
      ...draftRows,
      { dayOfWeek: 1, startMinutes: 12 * 60, endMinutes: 13 * 60 },
    ]);
  }

  function removeDraftRow(i: number) {
    setDraftRows(draftRows.filter((_, j) => j !== i));
  }

  function updateDraft(i: number, patch: Partial<Block>) {
    const next = [...draftRows];
    next[i] = { ...next[i], ...patch };
    setDraftRows(next);
  }

  async function saveDraft() {
    const invalid = draftRows.some((r) => r.startMinutes >= r.endMinutes);
    if (invalid) {
      setError("Each block needs a start time before the end time.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await api("/api/dentists/me/unavailable-blocks", {
        method: "PUT",
        body: JSON.stringify({
          unavailableBlocks: draftRows.map(({ dayOfWeek, startMinutes, endMinutes }) => ({
            dayOfWeek,
            startMinutes,
            endMinutes,
          })),
        }),
      });
      await load();
      await loadDateBlocks();
      setBlockOpen(false);
      setSuccess("Unavailable times saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function createDateBlock() {
    if (!dateBlockDate || !dateBlockStart || !dateBlockEnd) {
      setError("Choose a date and start/end time.");
      return;
    }
    const start = dateBlockDate.hour(dateBlockStart.hour()).minute(dateBlockStart.minute()).second(0).millisecond(0);
    const end = dateBlockDate.hour(dateBlockEnd.hour()).minute(dateBlockEnd.minute()).second(0).millisecond(0);
    if (!start.isBefore(end)) {
      setError("End time must be after start time.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await api("/api/dentists/me/date-blocks", {
        method: "POST",
        body: JSON.stringify({
          startAt: start.toDate().toISOString(),
          endAt: end.toDate().toISOString(),
          reason: dateBlockReason.trim() || undefined,
        }),
      });
      setDateBlockReason("");
      await loadDateBlocks();
      setSuccess("Date block created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create date block");
    }
  }

  async function removeDateBlock(id: string) {
    setError(null);
    setSuccess(null);
    try {
      await api(`/api/dentists/me/date-blocks/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadDateBlocks();
      setSuccess("Date block removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete date block");
    }
  }

  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const weeks = useMemo(() => calendarWeeks(y, m), [y, m]);
  const today = new Date();
  const scheduleTitle = `${viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })} — unavailable overview`;

  const pickerSlotProps = {
    textField: { size: "small" as const, fullWidth: true },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          width: "100%",
          bgcolor: "grey.200",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton size="small" aria-label="Previous month" onClick={() => setViewMonth(new Date(y, m - 1, 1))}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a237e", mx: 1 }}>
                {scheduleTitle}
              </Typography>
              <IconButton size="small" aria-label="Next month" onClick={() => setViewMonth(new Date(y, m + 1, 1))}>
                <ChevronRight />
              </IconButton>
            </Box>
            <Button
              variant="contained"
              onClick={openBlockDialog}
              sx={{
                bgcolor: "#1976d2",
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 2,
                "&:hover": { bgcolor: "#1565c0" },
              }}
            >
              Set Block Appointment
            </Button>
          </Box>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Patients can book during <strong>{formatScheduleWindow()}</strong> on any day unless you block time below,
              an appointment already exists, or the clinic is closed. You are <strong>not</strong> setting open hours —
              you list times when appointments are <strong>not</strong> offered.
            </Typography>

            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 0.75,
                textAlign: "center",
                mb: 1,
              }}
            >
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                <Typography key={d} variant="caption" color="text.secondary" fontWeight={600}>
                  {d}
                </Typography>
              ))}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 1,
              }}
            >
              {weeks.flat().map((day, idx) => {
                if (day === null) {
                  return <Box key={`e-${idx}`} sx={{ minHeight: 48 }} />;
                }
                const cellDate = new Date(y, m, day);
                const dow = cellDate.getDay();
                const hasBlock = hasUnavailableOnWeekday(dow);
                const hasOneTime = hasDateBlockOnDate(cellDate);
                const isToday = isSameDay(cellDate, today);
                const label = cellDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <ButtonBase
                    key={`${y}-${m}-${day}`}
                    focusRipple
                    aria-label={`${label}. View blocks for this day.`}
                    onClick={() => setSelectedCalendarDate(cellDate)}
                    sx={{
                      minHeight: 48,
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: hasBlock || hasOneTime ? "warning.light" : "divider",
                      bgcolor: isToday ? "rgba(0, 150, 136, 0.08)" : "background.paper",
                      color: "text.primary",
                      fontWeight: isToday ? 700 : 500,
                      fontSize: "0.95rem",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.02)",
                      "&:hover": {
                        bgcolor: isToday ? "rgba(0, 150, 136, 0.14)" : "action.hover",
                      },
                    }}
                  >
                    {day}
                  </ButtonBase>
                );
              })}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              Click a date to see blocks for that weekday. Amber border: at least one block. Use{" "}
              <strong>Set Block Appointment</strong> to edit.
            </Typography>
          </Box>
        </Paper>

        <Dialog
          open={selectedCalendarDate !== null}
          onClose={() => setSelectedCalendarDate(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {selectedCalendarDate
              ? selectedCalendarDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : ""}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Unavailable blocks for this day of the week (repeat every week).
            </Typography>
            {blocksForSelectedWeekday.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No blocks — you are bookable for the full {formatScheduleWindow()} window on this weekday (unless the
                clinic is closed or slots are taken).
              </Typography>
            ) : (
              <List dense disablePadding>
                {blocksForSelectedWeekday.map((b, i) => (
                  <ListItem key={b.id ?? `b-${i}`} sx={{ py: 0.75, px: 0 }}>
                    <ListItemText
                      primary={`${formatMinutesAsTime(b.startMinutes)} – ${formatMinutesAsTime(b.endMinutes)}`}
                      secondary="Not available for appointments"
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSelectedCalendarDate(null)}>Close</Button>
            <Button
              variant="contained"
              onClick={() => {
                setSelectedCalendarDate(null);
                openBlockDialog();
              }}
            >
              Set Block Appointment
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={blockOpen} onClose={closeDialog} fullWidth maxWidth="md">
          <DialogTitle>When you&apos;re not available</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Choose whether this block should repeat weekly, or apply only to a specific date.
              </Typography>

              <Tabs
                value={blockTab}
                onChange={(_e, v) => setBlockTab(v)}
                sx={{ borderBottom: "1px solid", borderColor: "divider" }}
              >
                <Tab value="weekly" label="Repeat weekly" sx={{ textTransform: "none", fontWeight: 800 }} />
                <Tab value="date" label="Specific date" sx={{ textTransform: "none", fontWeight: 800 }} />
              </Tabs>

              {blockTab === "weekly" ? (
                <>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" color="secondary" onClick={() => setDraftRows(lunchWeekdaysTemplate())}>
                  Mon–Fri lunch (12–1)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={() => setDraftRows(weekendOffTemplate())}
                >
                  No bookings Sat–Sun (full day)
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ minWidth: 140 }}>Day</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Not available from</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Not available until</TableCell>
                    <TableCell align="right" width={56} sx={{ pr: 1 }}>
                      <Typography component="span" variant="caption" color="text.secondary">
                        Remove
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {draftRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          No blocks yet — you&apos;re bookable for the full {formatScheduleWindow()} window on every day
                          (subject to clinic hours and existing appointments). Add a row to block a time range.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    draftRows.map((r, i) => (
                      <TableRow key={`${r.id ?? "new"}-${i}`}>
                        <TableCell>
                          <FormControl size="small" fullWidth>
                            <InputLabel id={`dow-label-${i}`}>Day</InputLabel>
                            <Select
                              labelId={`dow-label-${i}`}
                              label="Day"
                              value={r.dayOfWeek}
                              onChange={(e: SelectChangeEvent<number>) => {
                                updateDraft(i, { dayOfWeek: Number(e.target.value) });
                              }}
                            >
                              {WEEKDAY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TimePicker
                            label="Start"
                            value={minutesToTimeDayjs(r.startMinutes)}
                            onChange={(v) => {
                              if (v) updateDraft(i, { startMinutes: v.hour() * 60 + v.minute() });
                            }}
                            slotProps={pickerSlotProps}
                          />
                        </TableCell>
                        <TableCell>
                          <TimePicker
                            label="End"
                            value={minutesToTimeDayjs(r.endMinutes)}
                            onChange={(v) => {
                              if (v) updateDraft(i, { endMinutes: v.hour() * 60 + v.minute() });
                            }}
                            slotProps={pickerSlotProps}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove this block">
                            <IconButton size="small" aria-label="Remove row" onClick={() => removeDraftRow(i)}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Box>
                <Button onClick={addDraftRow} sx={{ textTransform: "none" }}>
                  Add time block
                </Button>
              </Box>
                </>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Block a one-time date/time range. This does not repeat weekly.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <DatePicker
                      label="Date"
                      value={dateBlockDate}
                      onChange={(v) => setDateBlockDate(v)}
                      slotProps={pickerSlotProps}
                    />
                    <TimePicker
                      label="Start"
                      value={dateBlockStart}
                      onChange={(v) => setDateBlockStart(v)}
                      slotProps={pickerSlotProps}
                    />
                    <TimePicker
                      label="End"
                      value={dateBlockEnd}
                      onChange={(v) => setDateBlockEnd(v)}
                      slotProps={pickerSlotProps}
                    />
                  </Stack>

                  <FormControl size="small">
                    <InputLabel id="date-block-reason">Reason (optional)</InputLabel>
                    <Select
                      labelId="date-block-reason"
                      label="Reason (optional)"
                      value={dateBlockReason}
                      onChange={(e) => setDateBlockReason(e.target.value)}
                      sx={{ minWidth: 260 }}
                    >
                      <MenuItem value="">
                        <em>No reason</em>
                      </MenuItem>
                      <MenuItem value="Holiday">Holiday</MenuItem>
                      <MenuItem value="Sick leave">Sick leave</MenuItem>
                      <MenuItem value="Conference">Conference</MenuItem>
                      <MenuItem value="Maintenance">Maintenance</MenuItem>
                    </Select>
                  </FormControl>

                  <Button variant="contained" onClick={() => void createDateBlock()} sx={{ alignSelf: "flex-start" }}>
                    Add date block
                  </Button>

                  <Typography variant="subtitle2" fontWeight={800}>
                    Existing date blocks
                  </Typography>
                  {dateBlocks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No date blocks yet.
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {dateBlocks.slice(0, 30).map((b) => (
                        <ListItem
                          key={b.id}
                          sx={{ px: 0 }}
                          secondaryAction={
                            <IconButton edge="end" aria-label="Delete date block" onClick={() => void removeDateBlock(b.id)}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={`${new Date(b.startAt).toLocaleString()} – ${new Date(b.endAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`}
                            secondary={b.reason ?? "One-time block"}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
            <Button onClick={closeDialog}>Cancel</Button>
            {blockTab === "weekly" ? (
              <Button variant="contained" onClick={() => void saveDraft()}>
                Save weekly blocks
              </Button>
            ) : null}
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
