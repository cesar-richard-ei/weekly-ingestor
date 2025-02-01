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
  useTheme,
  Autocomplete,
  Chip,
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import { API_URL } from '../config';
import ReportStats from './ReportStats';

export interface PreviewData {
  date: string;
  client: string;
  duration: string;
  description: string;
  type: 'empty' | 'weekend' | 'holiday' | 'off' | 'half_off' | 'work';
}

export default function ReportGenerator() {
  const theme = useTheme();
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[] | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [hasPreview, setHasPreview] = useState(false);
  const [availableClientsList, setAvailableClientsList] = useState<string[]>([]);

  const availableClients = hasPreview 
    ? availableClientsList
    : [];

  const filteredPreviewData = previewData
    ? selectedClients.length > 0
      ? previewData.filter(row => {
          if (row.type === 'weekend' || row.type === 'empty') return true;
          return row.client.split(" + ").some(client => selectedClients.includes(client));
        })
      : previewData
    : null;

  const handleClientsChange = async (newValue: string[]) => {
    setSelectedClients(newValue);
    if (hasPreview && startDate && endDate) {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post(`${API_URL}/generate-report`, {
          from_date: startDate.format('YYYY-MM-DD'),
          to_date: endDate.format('YYYY-MM-DD'),
          format: 'json',
          client_filter: newValue
        }, {
          responseType: 'json'
        });

        if (Array.isArray(response.data)) {
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
    }
  };

  const calculateTotalDuration = (data: PreviewData[]) => {
    return data
      .filter(row => row.type === 'work' || row.type === 'half_off')
      .reduce((acc, row) => acc + parseFloat(row.duration), 0)
      .toFixed(2);
  };

  const getRowStyle = (type: PreviewData['type']) => {
    switch (type) {
      case 'weekend':
      case 'holiday':
        return { 
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          color: theme.palette.text.disabled,
          fontStyle: 'normal' as const
        };
      case 'off':
        return { 
          backgroundColor: 'rgba(244, 67, 54, 0.08)',
          color: theme.palette.text.disabled,
          fontStyle: 'normal' as const
        };
      case 'half_off':
        return { 
          backgroundColor: 'rgba(255, 152, 0, 0.08)',
          fontStyle: 'normal' as const
        };
      default:
        return {
          fontStyle: 'normal' as const
        };
    }
  };

  const generateReport = async (download = true) => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/generate-report`, {
        from_date: startDate.format('YYYY-MM-DD'),
        to_date: endDate.format('YYYY-MM-DD'),
        format: download ? 'excel' : 'json',
        client_filter: selectedClients
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
        const clients = Array.from(new Set(response.data
          .filter(d => d.type === 'work' && d.client)
          .map(d => d.client)))
          .sort();
        setAvailableClientsList(clients);
        setPreviewData(response.data);
        setHasPreview(true);
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
          onChange={(newValue) => {
            setStartDate(newValue);
            setHasPreview(false);
          }}
        />
        
        <DatePicker
          label="Date de fin"
          value={endDate}
          onChange={(newValue) => {
            setEndDate(newValue);
            setHasPreview(false);
          }}
        />

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        {!hasPreview ? (
          <Button
            variant="contained"
            onClick={() => generateReport(false)}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? <CircularProgress size={24} /> : 'Prévisualiser le rapport'}
          </Button>
        ) : (
          <>
            <Autocomplete
              multiple
              id="client-filter"
              options={availableClients}
              value={selectedClients}
              onChange={(_, newValue) => handleClientsChange(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Clients à inclure"
                  placeholder="Sélectionnez les clients à inclure dans le rapport"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    color="primary"
                    variant="outlined"
                  />
                ))
              }
              loading={loading}
              disabled={loading}
            />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => generateReport(true)}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Télécharger le rapport'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setHasPreview(false);
                  setPreviewData(null);
                  setSelectedClients([]);
                  setAvailableClientsList([]);
                }}
              >
                Réinitialiser
              </Button>
            </Stack>
          </>
        )}

        {previewData && previewData.length > 0 && (
          <>
            <ReportStats data={filteredPreviewData || []} dailyRate={323} />
            <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Clients</TableCell>
                    <TableCell align="right">Durée (j)</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPreviewData?.map((row: PreviewData, index: number) => {
                    const style = getRowStyle(row.type);
                    return (
                      <TableRow 
                        key={index}
                        sx={style}
                      >
                        <TableCell>{row.date}</TableCell>
                        <TableCell>
                          {row.client ? row.client.split(" + ").map((client, i) => (
                            <Chip
                              key={i}
                              label={client}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          )) : ''}
                        </TableCell>
                        <TableCell align="right">{row.duration}</TableCell>
                        <TableCell 
                          sx={{ 
                            whiteSpace: 'pre-line',
                            color: style?.color,
                            fontStyle: style?.fontStyle
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
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{calculateTotalDuration(filteredPreviewData || [])}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
        
        {previewData && previewData.length === 0 && (
          <Alert severity="info">Aucune donnée disponible pour cette période</Alert>
        )}
      </Stack>
    </Paper>
  );
} 