import { ThemeProvider, CssBaseline, Container } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme';
import Header from './components/Header';
import ReportGenerator from './components/ReportGenerator';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <Header />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <ReportGenerator />
        </Container>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App; 