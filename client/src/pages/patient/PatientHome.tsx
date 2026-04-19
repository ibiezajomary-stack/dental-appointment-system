import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Container, Typography } from "@mui/material";

/** Hero background — modern dental operatory (Unsplash, free to use). */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1920&q=80";

export function PatientHome() {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: { xs: "min(85vh, 720px)", md: "calc(100vh - 72px)" },
        display: "flex",
        alignItems: "center",
        backgroundColor: "#e3f2fd",
        backgroundImage: `linear-gradient(105deg, rgba(227, 242, 253, 0.92) 0%, rgba(187, 222, 251, 0.78) 45%, rgba(144, 202, 249, 0.55) 100%), url(${HERO_IMAGE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, position: "relative", zIndex: 1 }}>
        <Box sx={{ maxWidth: { md: "min(100%, 560px)" } }}>
          <Button
            component={RouterLink}
            to="/patient/book"
            variant="contained"
            color="primary"
            size="large"
            sx={{
              mb: 3,
              px: 4,
              py: 1.25,
              textTransform: "none",
              fontWeight: 700,
              fontSize: "1.05rem",
            }}
          >
            Set Appointment
          </Button>
          <Typography
            variant="h6"
            component="p"
            sx={{
              fontWeight: 400,
              lineHeight: 1.7,
              color: "rgba(0, 0, 0, 0.87)",
              fontSize: { xs: "1rem", sm: "1.1rem" },
            }}
          >
            Welcome to iSmile! We&apos;ve replaced messy paperwork with a simple, digital way to manage your dental
            health. Whether you need to book an appointment, check your records, or chat with our team through a virtual
            consultation, everything is now just a few clicks away.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <RouterLink to="/patient/profile" style={{ color: "inherit", fontWeight: 600 }}>
              My profile &amp; health record
            </RouterLink>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
