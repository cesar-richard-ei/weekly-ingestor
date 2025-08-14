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
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  Slide,
  Grow,
  Zoom,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  DateRange as DateRangeIcon,
  People as PeopleIcon,
  TableChart as DataIcon,
  Analytics as AnalyticsIcon,
  Download as DownloadIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import ReportStats from './ReportStats';
import DataIntelligence from './DataIntelligence';
import { useClientRates } from '../hooks/useClientRates';
import { useClients, useClientNames } from '../hooks/useClients';
import { useReportGeneration, useReportPreview, useUniqueClientsFromReport, useDataAnalysis } from '../hooks/useReportGeneration';
import ClientRatesEditor from './ClientRatesEditor';

export interface PreviewData {
  date: string;
  client: string;
  duration: string;
  description: string;
  type: 'empty' | 'weekend' | 'holiday' | 'off' | 'half_off' | 'work';
}

const STEPS = [
  {
    label: 'Période',
    icon: <DateRangeIcon />,
    description: 'Sélectionnez la période d\'analyse'
  },
  {
    label: 'Clients',
    icon: <PeopleIcon />,
    description: 'Choisissez les clients et configurez les TJM'
  },
  {
    label: 'Données',
    icon: <DataIcon />,
    description: 'Prévisualisez les données du rapport'
  },
  {
    label: 'Analyses',
    icon: <AnalyticsIcon />,
    description: 'Explorez les statistiques et graphiques'
  },
  {
    label: 'Export',
    icon: <DownloadIcon />,
    description: 'Téléchargez votre rapport final'
  }
];

export default function ReportGenerator() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf('month'));
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Hooks React Query
  const { data: clients, isLoading: loadingClients, error: clientsError } = useClients();
  const { clientNames } = useClientNames();
  const { previewMutation, downloadMutation, isLoading, error } = useReportGeneration();
  
  // Hook pour la prévisualisation avec cache - activé automatiquement quand les paramètres changent
  const { 
    data: previewData, 
    error: previewError,
    isLoading: isLoadingPreview
  } = useReportPreview(startDate, endDate, selectedClients, true);

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

  // Mise à jour du filteredPreviewData
  const filteredPreviewData = useMemo(() => {
    if (!previewData) return null;
    
    if (selectedClients.length === 0) return previewData;
    
    return previewData.filter(row => {
      if (row.type === 'weekend' || row.type === 'empty' || row.type === 'holiday') return true;
      
      if (row.client) {
        const rowClients = row.client.split(" + ").map(c => c.trim());
        return rowClients.some(client => selectedClients.includes(client));
      }
      return false;
    });
  }, [previewData, selectedClients]);

  // Calcul du total des durées
  const totalDuration = useMemo(() => {
    if (!filteredPreviewData) return '0.00';
    
    return filteredPreviewData
      .filter(row => row.type === 'work' || row.type === 'half_off')
      .reduce((acc, row) => acc + parseFloat(row.duration), 0)
      .toFixed(2);
  }, [filteredPreviewData]);

  const { getClientRate, lastUpdate } = useClientRates();

  // Hook pour l'analyse intelligente des données
  const { 
    data: analysisData, 
    isLoading: isLoadingAnalysis,
    error: analysisError 
  } = useDataAnalysis(startDate, endDate, selectedClients, activeStep === 3);

  // Validation des étapes
  const isStepValid = useCallback((step: number) => {
    switch (step) {
      case 0: // Période
        return !!startDate && !!endDate;
      case 1: // Clients
        return selectedClients.length > 0;
      case 2: // Données
        return !!previewData && previewData.length > 0;
      case 3: // Analyses
        return !!previewData && previewData.length > 0;
      case 4: // Export
        return !!previewData && previewData.length > 0;
      default:
        return false;
    }
  }, [startDate, endDate, selectedClients, previewData]);

  // Navigation entre étapes
  const handleNext = useCallback(() => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
      setCompletedSteps(prev => new Set([...prev, activeStep]));
    }
  }, [activeStep]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  }, [activeStep]);

  const handleStepClick = useCallback((step: number) => {
    if (step <= activeStep || isStepValid(step - 1)) {
      setActiveStep(step);
    }
  }, [activeStep, isStepValid]);

  // Handlers pour les changements
  const handleStartDateChange = useCallback((newValue: Dayjs | null) => {
    setStartDate(newValue);
  }, []);

  const handleEndDateChange = useCallback((newValue: Dayjs | null) => {
    setEndDate(newValue);
  }, []);

  const handleDateShortcut = useCallback((start: Dayjs, end: Dayjs) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleClientToggle = useCallback((client: string) => {
    setSelectedClients(prev => {
      if (prev.includes(client)) {
        return prev.filter(c => c !== client);
      } 
      return [...prev, client];
    });
  }, []);

  const selectAllClients = useCallback(() => {
    setSelectedClients([...uniqueClients]);
  }, [uniqueClients]);

  const unselectAllClients = useCallback(() => {
    setSelectedClients([]);
  }, []);

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

  // Gestion des erreurs
  const currentError = error || previewError || clientsError;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4, fontWeight: 600 }}>
        📊 Générateur de Rapport Timely
      </Typography>

      {/* Stepper principal */}
      <Card elevation={3} sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((step, index) => (
              <Step key={step.label} completed={completedSteps.has(index)}>
                <StepLabel
                  onClick={() => handleStepClick(index)}
                  sx={{ 
                    cursor: isStepValid(index - 1) || index <= activeStep ? 'pointer' : 'default',
                    '&:hover': {
                      color: isStepValid(index - 1) || index <= activeStep ? 'primary.main' : 'inherit'
                    }
                  }}
                  StepIconComponent={({ active, completed }) => (
                    <Box sx={{ position: 'relative' }}>
                      {completed ? (
                        <CheckIcon color="success" />
                      ) : (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: active ? 'primary.main' : 'grey.300',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}
                        >
                          {step.icon}
                        </Box>
                      )}
                    </Box>
                  )}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {step.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Contenu des étapes */}
      <Box sx={{ position: 'relative', minHeight: 400 }}>
        {/* Étape 1: Période */}
        <Fade in={activeStep === 0} timeout={500}>
          <Box sx={{ display: activeStep === 0 ? 'block' : 'none' }}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <DateRangeIcon sx={{ mr: 2, color: 'primary.main' }} />
                  Sélection de la période
                </Typography>
                
                <Stack spacing={3}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
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
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      Raccourcis rapides
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {[
                        { label: 'Ce mois-ci', start: dayjs().startOf('month'), end: dayjs().endOf('month') },
                        { label: 'Mois précédent', start: dayjs().subtract(1, 'month').startOf('month'), end: dayjs().subtract(1, 'month').endOf('month') },
                        { label: 'Cette année', start: dayjs().startOf('year'), end: dayjs().endOf('year') },
                        { label: 'Année dernière', start: dayjs().subtract(1, 'year').startOf('year'), end: dayjs().subtract(1, 'year').endOf('year') }
                      ].map((shortcut, index) => (
                        <Button
                          key={index}
                          size="small"
                          variant="outlined"
                          onClick={() => handleDateShortcut(shortcut.start, shortcut.end)}
                          sx={{ borderRadius: 2 }}
                        >
                          {shortcut.label}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Fade>

        {/* Étape 2: Clients */}
        <Fade in={activeStep === 1} timeout={500}>
          <Box sx={{ display: activeStep === 1 ? 'block' : 'none' }}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PeopleIcon sx={{ mr: 2, color: 'primary.main' }} />
                  Configuration des clients
                </Typography>
                
                <Stack spacing={3}>
                  {loadingClients ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress size={32} />
                    </Box>
                  ) : uniqueClients.length > 0 ? (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1">
                          Clients sélectionnés: {selectedClients.length}/{uniqueClients.length}
                        </Typography>
                        <Box>
                          <Button 
                            size="small" 
                            onClick={selectAllClients} 
                            sx={{ mr: 1, borderRadius: 2 }}
                          >
                            Tout sélectionner
                          </Button>
                          <Button 
                            size="small" 
                            onClick={unselectAllClients}
                            sx={{ borderRadius: 2 }}
                          >
                            Tout désélectionner
                          </Button>
                        </Box>
                      </Box>
                      
                      <Divider />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Gestion des TJM
                        </Typography>
                        <ClientRatesEditor 
                          availableClients={uniqueClients} 
                          onRatesChanged={() => {}}
                        />
                      </Box>
                      
                      <FormGroup sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
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
                            sx={{ 
                              borderRadius: 2, 
                              p: 1.5, 
                              border: '1px solid',
                              borderColor: selectedClients.includes(client) ? 'primary.main' : 'grey.300',
                              backgroundColor: selectedClients.includes(client) ? 'primary.50' : 'transparent',
                              transition: 'all 0.2s ease-in-out'
                            }}
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
          </Box>
        </Fade>

        {/* Étape 3: Données */}
        <Fade in={activeStep === 2} timeout={500}>
          <Box sx={{ display: activeStep === 2 ? 'block' : 'none' }}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <DataIcon sx={{ mr: 2, color: 'primary.main' }} />
                  Prévisualisation des données
                </Typography>
                
                {isLoadingPreview ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                    <Stack spacing={2} alignItems="center">
                      <CircularProgress size={48} />
                      <Typography variant="body1">
                        Chargement des données...
                      </Typography>
                    </Stack>
                  </Box>
                ) : previewData && previewData.length > 0 ? (
                  <TableContainer component={Paper} sx={{ maxHeight: 400, borderRadius: 2 }}>
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
                              <TableCell>{row.description}</TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow sx={{ backgroundColor: theme.palette.grey[100], fontWeight: 'bold' }}>
                          <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalDuration}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    Aucune donnée disponible pour cette période
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        </Fade>

        {/* Étape 4: Analyses */}
        <Fade in={activeStep === 3} timeout={500}>
          <Box sx={{ display: activeStep === 3 ? 'block' : 'none' }}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <AnalyticsIcon sx={{ mr: 2, color: 'primary.main' }} />
                  Analyses et statistiques
                </Typography>
                
                {previewData && previewData.length > 0 ? (
                  <>
                    {/* Analyse intelligente des données */}
                    {isLoadingAnalysis ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <Stack spacing={2} alignItems="center">
                          <CircularProgress size={48} />
                          <Typography variant="body1">
                            Analyse intelligente en cours...
                          </Typography>
                        </Stack>
                      </Box>
                    ) : analysisData ? (
                      <DataIntelligence analysisData={analysisData} />
                    ) : analysisError ? (
                      <Alert severity="error">
                        Erreur lors de l'analyse: {analysisError.message}
                      </Alert>
                    ) : (
                      <Alert severity="info">
                        Aucune donnée d'analyse disponible
                      </Alert>
                    )}
                    
                    <Divider sx={{ my: 4 }} />
                    
                    {/* Statistiques classiques */}
                    <Box key={`stats-${lastUpdate}`}>
                      <ReportStats 
                        data={filteredPreviewData || []} 
                        getClientRate={getClientRate} 
                      />
                    </Box>
                  </>
                ) : (
                  <Alert severity="info">
                    Aucune donnée disponible pour l'analyse
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        </Fade>

        {/* Étape 5: Export */}
        <Fade in={activeStep === 4} timeout={500}>
          <Box sx={{ display: activeStep === 4 ? 'block' : 'none' }}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <DownloadIcon sx={{ mr: 2, color: 'primary.main' }} />
                  Export du rapport
                </Typography>
                
                {previewData && previewData.length > 0 ? (
                  <Stack spacing={3} alignItems="center">
                    <Typography variant="body1" color="text.secondary" align="center">
                      Votre rapport est prêt ! Téléchargez-le au format Excel.
                    </Typography>
                    
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleDownloadReport}
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                      sx={{ 
                        borderRadius: 3, 
                        px: 4, 
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600
                      }}
                    >
                      {isLoading ? 'Génération...' : 'Télécharger le rapport'}
                    </Button>
                    
                    <Typography variant="caption" color="text.secondary" align="center">
                      Période: {startDate?.format('DD/MM/YYYY')} - {endDate?.format('DD/MM/YYYY')}
                      <br />
                      Clients: {selectedClients.length} sélectionné(s)
                    </Typography>
                  </Stack>
                ) : (
                  <Alert severity="warning">
                    Aucune donnée disponible pour l'export
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        </Fade>
      </Box>

      {/* Navigation entre étapes */}
      <Card elevation={2} sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<PrevIcon />}
              sx={{ borderRadius: 2 }}
            >
              Précédent
            </Button>
            
            <Typography variant="body2" color="text.secondary">
              Étape {activeStep + 1} sur {STEPS.length}
            </Typography>
            
            <Button
              variant="contained"
              disabled={!isStepValid(activeStep) || activeStep === STEPS.length - 1}
              onClick={handleNext}
              endIcon={<NextIcon />}
              sx={{ borderRadius: 2 }}
            >
              {activeStep === STEPS.length - 1 ? 'Terminer' : 'Suivant'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Gestion des erreurs */}
      {currentError && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
          {currentError instanceof Error ? currentError.message : 'Une erreur est survenue'}
        </Alert>
      )}
    </Box>
  );
}

// Fonction helper pour le style des lignes (à déplacer ou refactoriser)
function getRowStyle(type: PreviewData['type']) {
  switch (type) {
    case 'weekend':
      return { 
        backgroundColor: 'rgba(0, 0.15, 0.1, 0.04)',
        color: 'text.disabled'
      };
    case 'holiday':
      return { 
        backgroundColor: 'rgba(44, 250, 255, 0.19)',
        color: 'text.disabled'
      };
    case 'off':
      return { 
        backgroundColor: 'rgba(244, 67, 54, 0.08)',
        color: 'text.disabled'
      };
    case 'half_off':
      return { 
        backgroundColor: 'rgba(255, 152, 0, 0.08)'
      };
    default:
      return {};
  }
} 