import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api, getApiBase, getToken } from "../../lib/api";

type Row = {
  id: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  amountCents: number;
  createdAt: string;
  verifiedAt: string | null;
  patient: { id: string; firstName: string; lastName: string };
  appointment: { id: string; startAt: string; endAt: string; status: string };
  proofDownloadUrl: string;
};

function php(amountCents: number): string {
  const v = amountCents / 100;
  return v.toLocaleString(undefined, { style: "currency", currency: "PHP" });
}

export function DentistPaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await api<Row[]>("/api/payments/dentists/me/appointment-payments");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: "VERIFIED" | "REJECTED") {
    setError(null);
    try {
      await api(`/api/payments/dentists/me/appointment-payments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function downloadProof(url: string) {
    const token = getToken();
    const res = await fetch(`${getApiBase()}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
  }

  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Payment management
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Review patient payment proofs and mark them as verified.
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>Appointment</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: "text.secondary" }}>
                  No payments yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{`${r.patient.firstName} ${r.patient.lastName}`}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {new Date(r.appointment.startAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>{php(r.amountCents)}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Button size="small" onClick={() => void downloadProof(r.proofDownloadUrl)} sx={{ mr: 1 }}>
                      View proof
                    </Button>
                    {r.status === "PENDING" ? (
                      <>
                        <Button size="small" variant="contained" onClick={() => void setStatus(r.id, "VERIFIED")} sx={{ mr: 1 }}>
                          Verify
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => void setStatus(r.id, "REJECTED")}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}

