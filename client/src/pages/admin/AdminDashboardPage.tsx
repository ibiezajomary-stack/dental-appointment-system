import { Typography } from "@mui/material";

export function AdminDashboardPage() {
  return (
    <>
      <Typography variant="h5" gutterBottom>
        Administration
      </Typography>
      <Typography color="text.secondary" paragraph>
        Use the REST API for full data management. From here you can configure clinic-wide availability
        blocks so patients cannot book during maintenance or closures.
      </Typography>
    </>
  );
}
