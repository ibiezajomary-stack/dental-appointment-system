import { createTheme } from "@mui/material/styles";

/** Purple-forward theme for unauthenticated login/register screens (reference UI). */
export const authTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5c6bc0",
      dark: "#3949ab",
      light: "#9fa8da",
    },
    secondary: {
      main: "#1a237e",
    },
    background: {
      default: "#eceff1",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});
