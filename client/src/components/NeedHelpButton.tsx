import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";
import PhoneIcon from "@mui/icons-material/Phone";
import { api } from "../lib/api";

type SupportInfo = {
  supportPhone: string;
  clinicPhone: string;
  supportHours: string;
  clinicName: string;
  clinicAddress?: string | null;
  dentistName?: string | null;
};

type NeedHelpButtonProps = {
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  color?: "primary" | "inherit";
  sx?: object;
  /** Shown in the dialog intro (e.g. registration-specific copy). */
  description?: string;
  /** Emphasize calling the clinic (e.g. on create-account page). */
  showCallClinic?: boolean;
};

function phoneToTel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) return `+63${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+63${digits}`;
  if (digits.length === 12 && digits.startsWith("63")) return `+${digits}`;
  return raw.replace(/\s/g, "");
}

export function NeedHelpButton({
  variant = "text",
  size = "small",
  color = "primary",
  sx,
  description = "Having trouble registering, logging in, or navigating the system? Contact our support team.",
  showCallClinic = false,
}: NeedHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<SupportInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    void api<SupportInfo>("/api/public/support")
      .then(setInfo)
      .catch(() =>
        setInfo({
          supportPhone: "0917-000-0000",
          clinicPhone: "0917-000-0000",
          supportHours: "Monday–Friday, 8:00 AM – 5:00 PM",
          clinicName: "Dental Clinic",
        }),
      );
  }, [open]);

  const clinicPhone = info?.clinicPhone ?? info?.supportPhone;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        color={color}
        startIcon={<HelpOutlineIcon />}
        onClick={() => setOpen(true)}
        sx={{ textTransform: "none", fontWeight: 600, ...sx }}
      >
        Need Help?
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Need Help?
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>

          {showCallClinic && clinicPhone ? (
            <Box sx={{ mb: 2 }}>
              <Button
                component="a"
                href={`tel:${phoneToTel(clinicPhone)}`}
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<PhoneIcon />}
                sx={{ py: 1.25, fontWeight: 700, textTransform: "none" }}
              >
                Call clinic — {clinicPhone}
              </Button>
              {info?.dentistName || info?.clinicAddress ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, textAlign: "center" }}>
                  {[info?.dentistName, info?.clinicAddress].filter(Boolean).join(" · ")}
                </Typography>
              ) : null}
            </Box>
          ) : null}

          <Box sx={{ bgcolor: "action.hover", borderRadius: 2, p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: "0.06em" }}>
              {showCallClinic ? "CLINIC CONTACT" : "SUPPORT MOBILE NUMBER"}
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
              {clinicPhone ?? "Loading…"}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: "0.06em", display: "block", mt: 2 }}
            >
              OPERATING HOURS
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {info?.supportHours ?? "Loading…"}
            </Typography>

            {info?.clinicName ? (
              <>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, letterSpacing: "0.06em", display: "block", mt: 2 }}
                >
                  CLINIC
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {info.clinicName}
                </Typography>
              </>
            ) : null}
          </Box>

          {!showCallClinic && clinicPhone ? (
            <Button
              component="a"
              href={`tel:${phoneToTel(clinicPhone)}`}
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={<PhoneIcon />}
              sx={{ mt: 2, textTransform: "none", fontWeight: 600 }}
            >
              Call clinic
            </Button>
          ) : null}

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            For appointment-related questions, please contact your dentist through the booking page.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
