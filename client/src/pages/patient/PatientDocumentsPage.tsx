import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Typography,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import { api, downloadPdf } from "../../lib/api";

type DocumentsStatus = {
  hasPrescription: boolean;
  hasCertificate: boolean;
  prescriptionUpdatedAt: string | null;
  certificateIssuedAt: string | null;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export function PatientDocumentsPage() {
  const [status, setStatus] = useState<DocumentsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await api<DocumentsStatus>("/api/print/me/documents-status");
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDownload(path: string, key: string, asDownload = true) {
    setBusy(key);
    setError(null);
    try {
      await downloadPdf(path, asDownload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Box>
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          My documents
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Download your prescription and dental certificate issued by your dentist.
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Box sx={{ display: "grid", gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <MedicalInformationIcon color="primary" sx={{ mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>Prescription (Rx)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {status?.hasPrescription
                    ? `Last updated: ${formatWhen(status.prescriptionUpdatedAt)}`
                    : "No prescription has been issued yet. Your dentist will add one after your consultation."}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!status?.hasPrescription || busy === "rx"}
                  onClick={() => void handleDownload("/api/print/me/prescription", "rx")}
                >
                  {busy === "rx" ? "Downloading…" : "Download prescription"}
                </Button>
              </Box>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <DescriptionIcon color="primary" sx={{ mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>Dental certificate</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {status?.hasCertificate
                    ? `Issued: ${formatWhen(status.certificateIssuedAt)}`
                    : "No certificate has been issued yet. Request one from your dentist after your visit."}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!status?.hasCertificate || busy === "cert"}
                  onClick={() => void handleDownload("/api/print/me/dental-certificate", "cert")}
                >
                  {busy === "cert" ? "Downloading…" : "Download certificate"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}
