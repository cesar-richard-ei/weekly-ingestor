import { useState } from 'react';
import { 
  Paper, 
  Button, 
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import { API_URL } from '../config';

interface PreviewData {
  date: string;
  project: string;
  duration: string;
  description: string;
  type: 'empty' | 'weekend' | 'off' | 'half_off' | 'work';
}

export default function ReportGenerator() {
  const theme = useTheme();
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[] | null>(null);

  const calculateTotalDuration = (data: PreviewData[]) => {
    return data
      .filter(row => row.type === 'work' || row.type === 'half_off')
      .reduce((acc, row) => acc + parseFloat(row.duration), 0)
      .toFixed(2);
  };

  const getRowStyle = (type: PreviewData['type']) => {
    switch (type) {
      case 'weekend':
        return { 
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          color: theme.palette.text.disabled
        };
      case 'off':
        return { 
          backgroundColor: 'rgba(244, 67, 54, 0.08)',
          color: theme.palette.text.disabled
        };
      case 'half_off':
        return { 
          backgroundColor: 'rgba(255, 152, 0, 0.08)'
        };
      default:
        return undefined;
    }
  };

  const generateReport = async (download = true) => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);
    if (!download) setPreviewData(null);

    try {
      const response = await axios.post(`${API_URL}/generate-report`, {
        from_date: startDate.format('YYYY-MM-DD'),
        to_date: endDate.format('YYYY-MM-DD'),
        format: download ? 'excel' : 'json'
      }, {
        responseType: download ? 'blob' : 'json'
      });

      if (download) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'imputations.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (Array.isArray(response.data)) {
        setPreviewData(response.data);
      } else {
        setError('Format de données invalide');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la génération du rapport');
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

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={() => generateReport(true)}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? <CircularProgress size={24} /> : 'Télécharger le rapport'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => generateReport(false)}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? <CircularProgress size={24} /> : 'Prévisualiser le rapport'}
          </Button>
        </Stack>

        {previewData && previewData.length > 0 && (
          <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Projet</TableCell>
                  <TableCell align="right">Durée (j)</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((row, index) => {
                  const style = getRowStyle(row.type);
                  return (
                    <TableRow 
                      key={index}
                      sx={style}
                    >
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.project}</TableCell>
                      <TableCell align="right">{row.duration}</TableCell>
                      <TableCell 
                        sx={{ 
                          whiteSpace: 'pre-line',
                          color: style?.color
                        }}
                      >
                        {row.description}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ 
                  backgroundColor: theme.palette.grey[100],
                  fontWeight: 'bold'
                }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{calculateTotalDuration(previewData)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {previewData && previewData.length === 0 && (
          <Alert severity="info">Aucune donnée disponible pour cette période</Alert>
        )}
      </Stack>
    </Paper>
  );
} 