import { useState, useEffect, useMemo, useCallback } from 'react';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormLabel,
  Box,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import ReportStats from './ReportStats';
import { useClientRates } from '../hooks/useClientRates';
import { useClients, useClientNames } from '../hooks/useClients';
import { useReportGeneration, useReportPreview, useUniqueClientsFromReport } from '../hooks/useReportGeneration';
import ClientRatesEditor from './ClientRatesEditor';

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
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [hasPreview, setHasPreview] = useState(false);

  // Hooks React Query
  const { data: clients, isLoading: loadingClients, error: clientsError } = useClients();
  const { clientNames } = useClientNames();
  const { previewMutation, downloadMutation, isLoading, error } = useReportGeneration();
  
  // Hook pour la prévisualisation avec cache
  const { 
    data: previewData, 
    error: previewError 
  } = useReportPreview(startDate, endDate, selectedClients, hasPreview);

  // Hook pour extraire les clients uniques du rapport
  const { data: uniqueClientsFromReport } = useUniqueClientsFromReport(previewData);

  // Utiliser les clients de l'API ou ceux extraits du rapport
  const uniqueClients = useMemo(() => {
    if (clients && clients.length > 0) {
      return clientNames;
    }
    return uniqueClientsFromReport || [];
  }, [clients, clientNames, uniqueClientsFromReport]);

  // Initialiser les clients sélectionnés quand ils sont disponibles
  useEffect(() => {
    if (uniqueClients.length > 0 && selectedClients.length === 0) {
      setSelectedClients([...uniqueClients]);
    }
  }, [uniqueClients, selectedClients.length]);

  // Mise à jour du filteredPreviewData pour s'assurer que la logique de filtrage reste cohérente
  const filteredPreviewData = useMemo(() => {
    if (!previewData) return null;
    
    if (selectedClients.length === 0) return previewData;
    
    return previewData.filter(row => {
      if (row.type === 'weekend' || row.type === 'empty' || row.type === 'holiday') return true;
      
      // Si c'est un jour de travail, vérifier si au moins un des clients est sélectionné
      if (row.client) {
        const rowClients = row.client.split(" + ").map(c => c.trim());
        return rowClients.some(client => selectedClients.includes(client));
      }
      return false;
    });
  }, [previewData, selectedClients]);

  // Calcul du total des durées - optimisé avec useMemo
  const totalDuration = useMemo(() => {
    if (!filteredPreviewData) return '0.00';
    
    return filteredPreviewData
      .filter(row => row.type === 'work' || row.type === 'half_off')
      .reduce((acc, row) => acc + parseFloat(row.duration), 0)
      .toFixed(2);
  }, [filteredPreviewData]);

  const { getClientRate } = useClientRates();

  // Force la mise à jour des statistiques quand les TJM changent
  const handleRatesChanged = useCallback(() => {
    // React Query gère automatiquement la mise à jour
  }, []);

  const handleClientToggle = useCallback((client: string) => {
    setSelectedClients(prev => {
      // Si le client est déjà sélectionné, on le retire
      if (prev.includes(client)) {
        return prev.filter(c => c !== client);
      } 
      // Sinon on l'ajoute
      return [...prev, client];
    });
  }, []);

  const selectAllClients = useCallback(() => {
    setSelectedClients([...uniqueClients]);
  }, [uniqueClients]);

  const unselectAllClients = useCallback(() => {
    setSelectedClients([]);
  }, []);

  const getRowStyle = useCallback((type: PreviewData['type']) => {
    switch (type) {
      case 'weekend':
        return { 
          backgroundColor: 'rgba(0, 0.15, 0.1, 0.04)',
          color: theme.palette.text.disabled,
          fontStyle: 'normal' as const
        };
      case 'holiday':
        return { 
          backgroundColor: 'rgba(44, 250, 255, 0.19)',
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
  }, [theme.palette.text.disabled]);

  // Handlers pour la génération de rapports
  const handlePreviewReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setHasPreview(true);
    
    try {
      await previewMutation.mutateAsync({
        from_date: startDate.format('YYYY-MM-DD'),
        to_date: endDate.format('YYYY-MM-DD'),
        client_filter: selectedClients
      });
    } catch (err) {
      console.error('Erreur lors de la prévisualisation:', err);
    }
  }, [startDate, endDate, selectedClients, previewMutation]);

  const handleDownloadReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    try {
      await downloadMutation.mutateAsync({
        from_date: startDate.format('YYYY-MM-DD'),
        to_date: endDate.format('YYYY-MM-DD'),
        client_filter: selectedClients
      });
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
    }
  }, [startDate, endDate, selectedClients, downloadMutation]);

  // Handlers pour les changements de dates avec reset automatique
  const handleStartDateChange = useCallback((newValue: Dayjs | null) => {
    setStartDate(newValue);
    setHasPreview(false);
  }, []);

  const handleEndDateChange = useCallback((newValue: Dayjs | null) => {
    setEndDate(newValue);
    setHasPreview(false);
  }, []);

  // Handlers pour les shortcuts de dates
  const handleDateShortcut = useCallback((start: Dayjs, end: Dayjs) => {
    setStartDate(start);
    setEndDate(end);
    setHasPreview(false);
  }, []);

  // Reset des données
  const handleReset = useCallback(() => {
    setHasPreview(false);
  }, []);

  // Gestion des erreurs
  const currentError = error || previewError || clientsError;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Générateur de rapport Timely
      </Typography>
      
      <Stack spacing={3} sx={{ mt: 3 }}>
        {/* Dates et shortcuts */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Période du rapport
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Sélectionnez une période ou utilisez les raccourcis ci-dessous
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              <DatePicker
                label="Date de début"
                value={startDate}
                onChange={handleStartDateChange}
              />
              
              <DatePicker
                label="Date de fin"
                value={endDate}
                onChange={handleEndDateChange}
              />
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleDateShortcut(dayjs().startOf('month'), dayjs().endOf('month'))}
                >
                  Ce mois-ci
                </Button>
                
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleDateShortcut(dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month'))}
                >
                  Mois précédent
                </Button>
                
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleDateShortcut(dayjs().startOf('year'), dayjs().endOf('year'))}
                >
                  Cette année
                </Button>
                
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleDateShortcut(dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year'))}
                >
                  Année dernière
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

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
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sélectionnez les clients à inclure dans votre rapport
                    </Typography>
                    <ClientRatesEditor 
                      availableClients={uniqueClients} 
                      onRatesChanged={handleRatesChanged}
                    />
                  </Box>
                  <Divider sx={{ my: 1 }} />
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
                </>
              ) : (
                <Alert severity="info">
                  Aucun client disponible. Vérifiez la connexion avec l'API Timely.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        {currentError && (
          <Alert severity="error">
            {currentError instanceof Error ? currentError.message : 'Une erreur est survenue'}
          </Alert>
        )}

        {!hasPreview ? (
          <Button
            variant="contained"
            onClick={handlePreviewReport}
            disabled={isLoading || !startDate || !endDate || selectedClients.length === 0}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Prévisualiser le rapport'}
          </Button>
        ) : (
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={handleDownloadReport}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Télécharger le rapport'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleReset}
            >
              Réinitialiser
            </Button>
          </Stack>
        )}

        {previewData && previewData.length > 0 && (
          <>
            <ReportStats 
              data={filteredPreviewData || []} 
              getClientRate={getClientRate} 
            />
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
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalDuration}</TableCell>
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