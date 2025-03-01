import { useState, useEffect } from 'react';
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
  Chip,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormLabel,
  Box,
  Card,
  CardContent
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
  const [loadingClients, setLoadingClients] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[] | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [hasPreview, setHasPreview] = useState(false);
  const [availableClientsList, setAvailableClientsList] = useState<string[]>([]);
  const [uniqueClients, setUniqueClients] = useState<string[]>([]);

  // Charger la liste des clients au chargement du composant
  useEffect(() => {
    fetchClients();
  }, []);

  // Fonction pour récupérer la liste des clients depuis l'API Timely
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await axios.get(`${API_URL}/clients`);
      if (Array.isArray(response.data)) {
        // Extraire les noms des clients de la réponse
        const clientNames = response.data.map((client: any) => client.name);
        setUniqueClients(clientNames.sort());
        // Par défaut, tous les clients sont sélectionnés
        setSelectedClients(clientNames.sort());
      }
    } catch (err: any) {
      console.error("Erreur lors de la récupération des clients:", err);
      // On ne met pas d'erreur dans l'interface pour ne pas bloquer l'utilisateur
    } finally {
      setLoadingClients(false);
    }
  };

  const availableClients = hasPreview 
    ? availableClientsList
    : [];

  // Cette fonction recalcule les clients uniques à partir des données de prévisualisation
  const extractUniqueClients = (data: PreviewData[]) => {
    const clientSet = new Set<string>();
    
    data.forEach(item => {
      if (item.client && item.type === 'work') {
        const clients = item.client.split(" + ");
        clients.forEach(client => clientSet.add(client.trim()));
      }
    });
    
    return Array.from(clientSet).sort();
  };

  // Mise à jour du filteredPreviewData pour s'assurer que la logique de filtrage reste cohérente
  const filteredPreviewData = previewData
    ? selectedClients.length > 0
      ? previewData.filter(row => {
          if (row.type === 'weekend' || row.type === 'empty') return true;
          
          // Si c'est un jour de travail, vérifier si au moins un des clients est sélectionné
          if (row.client) {
            const rowClients = row.client.split(" + ").map(c => c.trim());
            return rowClients.some(client => selectedClients.includes(client));
          }
          return false;
        })
      : previewData
    : null;

  const handleClientToggle = (client: string) => {
    setSelectedClients(prev => {
      // Si le client est déjà sélectionné, on le retire
      if (prev.includes(client)) {
        return prev.filter(c => c !== client);
      } 
      // Sinon on l'ajoute
      return [...prev, client];
    });
  };

  const selectAllClients = () => {
    setSelectedClients([...uniqueClients]);
  };

  const unselectAllClients = () => {
    setSelectedClients([]);
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
        // Récupérer la liste complète des clients (combinés) pour la compatibilité
        const combinedClients = Array.from(new Set(response.data
          .filter(d => d.type === 'work' && d.client)
          .map(d => d.client)))
          .sort();
        
        setAvailableClientsList(combinedClients);
        setPreviewData(response.data);
        
        // Si on n'a pas encore de clients chargés depuis l'API, extrayons-les des données
        if (uniqueClients.length === 0) {
          const uniqueClientsList = extractUniqueClients(response.data);
          setUniqueClients(uniqueClientsList);
          
          // Par défaut, sélectionner tous les clients
          setSelectedClients(uniqueClientsList);
        }
        
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

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormLabel component="legend">Clients à inclure dans le rapport</FormLabel>
                <Box>
                  <Button 
                    size="small" 
                    onClick={selectAllClients} 
                    sx={{ mr: 1 }}
                    disabled={loadingClients || uniqueClients.length === 0}
                  >
                    Tout sélectionner
                  </Button>
                  <Button 
                    size="small" 
                    onClick={unselectAllClients}
                    disabled={loadingClients || uniqueClients.length === 0}
                  >
                    Tout désélectionner
                  </Button>
                </Box>
              </Box>
              
              {loadingClients ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : uniqueClients.length > 0 ? (
                <FormGroup row>
                  {uniqueClients.map((client) => (
                    <FormControlLabel
                      key={client}
                      control={
                        <Checkbox
                          checked={selectedClients.includes(client)}
                          onChange={() => handleClientToggle(client)}
                          name={client}
                        />
                      }
                      label={client}
                      sx={{ width: 'auto', minWidth: '200px' }}
                    />
                  ))}
                </FormGroup>
              ) : (
                <Alert severity="info">
                  Aucun client disponible. Vérifiez la connexion avec l'API Timely.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

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
                // Ne pas réinitialiser la liste des clients ni la sélection
                setAvailableClientsList([]);
              }}
            >
              Réinitialiser
            </Button>
          </Stack>
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