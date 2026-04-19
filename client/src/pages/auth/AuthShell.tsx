import { Outlet } from "react-router-dom";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { authTheme } from "../../theme/authTheme";

export function AuthShell() {
  return (
    <ThemeProvider theme={authTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", width: "100%" }}>
        <Outlet />
      </Box>
    </ThemeProvider>
  );
}
