import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, Paper, Typography } from "@mui/material";
import { api } from "../lib/api";

const JITSI_BASE = "https://meet.jit.si";

type Consultation = {
  id: string;
  videoRoomId: string | null;
  status: string;
};

export function VideoConsultation() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<Consultation>(`/api/consultations/${encodeURIComponent(id)}`)
      .then(setConsultation)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  const room = consultation?.videoRoomId;
  const src = room ? `${JITSI_BASE}/${encodeURIComponent(room)}` : "";

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Video consultation
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Join the same Jitsi room as the patient for your live tele-dental visit.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!room && !error && <Typography color="text.secondary">Loading room…</Typography>}
      {src && (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 360, md: 520 },
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <iframe
            title="Jitsi Meet"
            src={src}
            allow="camera; microphone; fullscreen; display-capture"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </Box>
      )}
    </Paper>
  );
}
