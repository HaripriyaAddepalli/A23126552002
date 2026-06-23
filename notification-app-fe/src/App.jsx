import React from "react";
import {
  ThemeProvider, createTheme, CssBaseline,
  AppBar, Toolbar, Typography, Container, Box,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsPage from "./pages/NotificationsPage";

const theme = createTheme({
  palette: {
    primary: { main: "#1565C0" },
    error:   { main: "#C62828" },
    background: { default: "#F5F7FA" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  shape: { borderRadius: 8 },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" elevation={2}>
        <Toolbar>
          <NotificationsActiveIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={700} letterSpacing={0.5}>
            Campus Notifications
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
        <Container maxWidth="md" sx={{ py: 3 }}>
          <NotificationsPage />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;