import { createTheme } from "@mui/material/styles";

/** Teal-focused theme for the dentist (iSmile-style) console. */
export const dentistTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#009688",
      dark: "#00796b",
      light: "#4db6ac",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#26a69a",
    },
    background: {
      default: "#eceff1",
      paper: "#ffffff",
    },
    text: {
      primary: "#263238",
      secondary: "#78909c",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.5 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: {
      textTransform: "uppercase",
      fontWeight: 600,
      letterSpacing: "0.08em",
      fontSize: "0.75rem",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});
