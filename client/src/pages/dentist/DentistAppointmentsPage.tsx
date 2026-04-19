import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
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

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.length === 0 && !error && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No appointments yet.
          </Typography>
        )}
        {rows.map((r) => {
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
  );
}
