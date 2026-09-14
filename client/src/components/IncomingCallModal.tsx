import { useEffect, useRef } from "react";
import { Box, Button, Dialog, Typography } from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import CallEndIcon from "@mui/icons-material/CallEnd";
import { ToothMark } from "./BrandLogo";

type IncomingCallModalProps = {
  open: boolean;
  callerName: string;
  onAnswer: () => void;
  onDecline: () => void;
};

function startRingtone(ctx: AudioContext): () => void {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.value = 440;
  osc2.frequency.value = 480;
  gain.gain.value = 0;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start();
  osc2.start();

  let on = true;
  const pulse = () => {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(on ? 0.08 : 0, now);
    on = !on;
  };
  pulse();
  const id = window.setInterval(pulse, 500);
  return () => {
    window.clearInterval(id);
    try {
      osc1.stop();
      osc2.stop();
    } catch {
      /* already stopped */
    }
    gain.disconnect();
  };
}

export function IncomingCallModal({ open, callerName, onAnswer, onDecline }: IncomingCallModalProps) {
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    const audio = ctx;
    void audio.resume().then(() => {
      if (cancelled) {
        void audio.close();
        return;
      }
      stopRef.current = startRingtone(audio);
    });
    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
      void audio.close();
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onDecline}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          textAlign: "center",
          background: "linear-gradient(180deg, #0f3d3a 0%, #123642 55%, #0b2428 100%)",
          color: "#fff",
          px: 2,
          py: 3,
        },
      }}
    >
      <Typography variant="overline" sx={{ letterSpacing: "0.18em", opacity: 0.8 }}>
        Incoming video call
      </Typography>

      <Box
        sx={{
          width: 96,
          height: 96,
          mx: "auto",
          my: 2.5,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "rgba(255,255,255,0.08)",
          boxShadow: "0 0 0 0 rgba(0,150,136,0.55)",
          animation: "ismile-ring 1.6s ease-out infinite",
          "@keyframes ismile-ring": {
            "0%": { boxShadow: "0 0 0 0 rgba(0,150,136,0.55)" },
            "70%": { boxShadow: "0 0 0 18px rgba(0,150,136,0)" },
            "100%": { boxShadow: "0 0 0 0 rgba(0,150,136,0)" },
          },
        }}
      >
        <ToothMark size={56} />
      </Box>

      <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
        {callerName}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
        The dentist is calling for your virtual consultation.
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 5, pb: 1 }}>
        <Box sx={{ textAlign: "center" }}>
          <Button
            onClick={onDecline}
            aria-label="Decline call"
            sx={{
              width: 64,
              height: 64,
              minWidth: 64,
              borderRadius: "50%",
              bgcolor: "#e53935",
              color: "#fff",
              "&:hover": { bgcolor: "#c62828" },
            }}
          >
            <CallEndIcon />
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Decline
          </Typography>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Button
            onClick={onAnswer}
            aria-label="Answer call"
            sx={{
              width: 64,
              height: 64,
              minWidth: 64,
              borderRadius: "50%",
              bgcolor: "#43a047",
              color: "#fff",
              "&:hover": { bgcolor: "#2e7d32" },
            }}
          >
            <CallIcon />
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Answer
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
