import { Link as RouterLink } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";

export function AdminPage() {
  const { user, logout } = useAuth();

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Admin
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">
            Home
          </Button>
          <Button color="inherit" onClick={() => logout()}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>
          Administration
        </Typography>
        <Typography color="text.secondary">
          Use the REST API for full data management. This UI is a minimal shell; extend with user
          management and reports as needed for your thesis demo.
        </Typography>
      </Container>
    </Box>
  );
}
