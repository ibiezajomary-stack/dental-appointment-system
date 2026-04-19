import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Card, CardContent, Container, Typography } from "@mui/material";
import PersonOutline from "@mui/icons-material/PersonOutline";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";

export function LoginSelectionPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, sm: 10 } }}>
      <Typography
        variant="h4"
        align="center"
        sx={{ fontWeight: 800, color: "secondary.main", mb: 4, px: 1 }}
      >
        Welcome to iSmile! Please select your login type.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 3,
          maxWidth: 720,
          mx: "auto",
        }}
      >
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "rgba(92, 107, 192, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <PersonOutline sx={{ fontSize: 40, color: "primary.dark" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Patient
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 44 }}>
              Book appointments and view your medical history.
            </Typography>
            <Button
              component={RouterLink}
              to="/login/patient"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{ py: 1.25, fontWeight: 700 }}
            >
              Login as Patient
            </Button>
          </CardContent>
        </Card>

        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "rgba(26, 35, 126, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <VerifiedUserOutlined sx={{ fontSize: 40, color: "secondary.main" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 44 }}>
              Manage schedules, patients, and clinic records. (Admin or dentist accounts.)
            </Typography>
            <Button
              component={RouterLink}
              to="/login/admin"
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              sx={{ py: 1.25, fontWeight: 700 }}
            >
              Login as Admin
            </Button>
          </CardContent>
        </Card>
      </Box>
      <Typography align="center" sx={{ mt: 4 }}>
        <RouterLink to="/register" style={{ color: "inherit", fontWeight: 600 }}>
          New here? Create a patient account
        </RouterLink>
      </Typography>
    </Container>
  );
}
