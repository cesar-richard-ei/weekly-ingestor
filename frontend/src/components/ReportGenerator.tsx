import { useState } from 'react';
import { 
  Paper, 
  Button, 
  Stack,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import { API_URL } from '../config';

export default function ReportGenerator() {
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/generate-report`, {
        from_date: startDate.format('YYYY-MM-DD'),
        to_date: endDate.format('YYYY-MM-DD')
      }, {
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'imputations.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Erreur lors de la génération du rapport');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Générateur de rapport Timely
      </Typography>
      
      <Stack spacing={3} sx={{ mt: 3 }}>
        <DatePicker
          label="Date de début"
          value={startDate}
          onChange={setStartDate}
        />
        
        <DatePicker
          label="Date de fin"
          value={endDate}
          onChange={setEndDate}
        />

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <Button
          variant="contained"
          onClick={generateReport}
          disabled={loading || !startDate || !endDate}
        >
          {loading ? <CircularProgress size={24} /> : 'Générer le rapport'}
        </Button>
      </Stack>
    </Paper>
  );
} 