import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api, getApiBase, getToken } from "../../lib/api";

type Row = {
  id: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "REFUNDED";
  amountCents: number;
  createdAt: string;
  verifiedAt: string | null;
  refundGcashNumber: string | null;
  patient: { id: string; firstName: string; lastName: string };
  appointment: { id: string; startAt: string; endAt: string; status: string };
  proofDownloadUrl: string;
};

type SalesReportRow = {
  id: string;
  amountCents: number;
  paymentDate: string;
  description: string | null;
  createdAt: string;
};

function php(amountCents: number): string {
  const v = amountCents / 100;
  return v.toLocaleString(undefined, { style: "currency", currency: "PHP" });
}

function paymentStatusLabel(status: Row["status"]): string {
  switch (status) {
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "REFUNDED":
      return "Refunded";
    default:
      return "Pending";
  }
}

export function DentistPaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [salesRows, setSalesRows] = useState<SalesReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [salesForm, setSalesForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [isSubmittingSales, setIsSubmittingSales] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await api<Row[]>("/api/payments/dentists/me/appointment-payments");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function loadSalesReports() {
    try {
      const data = await api<SalesReportRow[]>("/api/billing/sales-reports");
      setSalesRows(data);
    } catch (e) {
      setError((current) => current ?? (e instanceof Error ? e.message : "Failed to load sales reports"));
    }
  }

  useEffect(() => {
    void load();
    void loadSalesReports();
  }, []);

  async function setStatus(id: string, status: "VERIFIED" | "REJECTED" | "REFUNDED") {
    setError(null);
    setSuccess(null);
    try {
      await api(`/api/payments/dentists/me/appointment-payments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      setSuccess(
        status === "VERIFIED"
          ? "Payment verified successfully."
          : status === "REFUNDED"
            ? "Patient was notified that the refund was processed."
            : "Payment rejected successfully.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function submitSalesReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const amountCents = Number(salesForm.amount);
    if (!salesForm.paymentDate || Number.isNaN(amountCents) || amountCents <= 0) {
      setError("Please enter a valid sales amount and date.");
      return;
    }

    try {
      setIsSubmittingSales(true);
      const localDate = new Date(`${salesForm.paymentDate}T12:00:00`);
      await api("/api/billing/sales-reports", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          paymentDate: localDate.toISOString(),
          description: salesForm.description.trim() || undefined,
        }),
      });
      setSalesForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), description: "" });
      await loadSalesReports();
      setSuccess("Daily sales entry saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save sales report");
    } finally {
      setIsSubmittingSales(false);
    }
  }

  const monthlyTotals = useMemo(() => {
    const byMonth = new Map<string, number>();

    for (const item of salesRows) {
      const date = new Date(item.paymentDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + item.amountCents);
    }

    return [...byMonth.entries()]
      .map(([monthKey, totalCents]) => ({
        monthKey,
        label: new Date(`${monthKey}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        total: php(totalCents),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [salesRows]);

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
    <Stack spacing={3}>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Payment management
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Review patient payment proofs, verify or reject them, and process refunds when needed.
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        ) : null}

        <Box sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Appointment</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Refund GCash</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ color: "text.secondary" }}>
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
                    <TableCell>{r.refundGcashNumber || "—"}</TableCell>
                    <TableCell>{paymentStatusLabel(r.status)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Button size="small" onClick={() => void downloadProof(r.proofDownloadUrl)} sx={{ mr: 1 }}>
                        View proof
                      </Button>
                      {r.status === "PENDING" ? (
                        <>
                          <Button size="small" variant="contained" onClick={() => void setStatus(r.id, "VERIFIED")} sx={{ mr: 1 }}>
                            Verify
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => void setStatus(r.id, "REJECTED")} sx={{ mr: 1 }}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {r.status === "VERIFIED" ? (
                        <Button size="small" variant="contained" color="warning" onClick={() => void setStatus(r.id, "REFUNDED")}>
                          Refunded
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>
           Sales report
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Enter each day’s clinic sales manually and review monthly totals.
        </Typography>

        <Box component="form" onSubmit={submitSalesReport} sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={salesForm.amount}
                onChange={(event) => setSalesForm((current) => ({ ...current, amount: event.target.value }))}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Sales date"
                type="date"
                value={salesForm.paymentDate}
                onChange={(event) => setSalesForm((current) => ({ ...current, paymentDate: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
            
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" disabled={isSubmittingSales}>
              {isSubmittingSales ? "Saving..." : "Add daily sales"}
            </Button>
          </Box>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Total sales</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {monthlyTotals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} sx={{ color: "text.secondary" }}>
                  No sales recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              monthlyTotals.map((item) => (
                <TableRow key={item.monthKey} hover>
                  <TableCell>{item.label}</TableCell>
                  <TableCell align="right">{item.total}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}

