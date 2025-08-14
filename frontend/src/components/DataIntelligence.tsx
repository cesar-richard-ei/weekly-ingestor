import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip, 
  Alert, 
  Stack, 
  Divider,
  useTheme,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Anomaly, 
  Incoherence, 
  Gap, 
  DataAnalysisResult 
} from '../hooks/useReportGeneration';

interface DataIntelligenceProps {
  analysisData: DataAnalysisResult;
}

const SEVERITY_COLORS = {
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  success: '#4caf50'
};

const SEVERITY_ICONS = {
  error: <ErrorIcon />,
  warning: <WarningIcon />,
  info: <InfoIcon />,
  success: <CheckIcon />
};

const ANOMALY_TYPE_LABELS = {
  heures_impossibles: 'Heures impossibles',
  heures_negatives: 'Heures négatives',
  sous_activite: 'Sous-activité',
  sur_activite: 'Sur-activité',
  jour_vide: 'Jour vide',
  jour_suspect: 'Jour suspect'
};

export default function DataIntelligence({ analysisData }: DataIntelligenceProps) {
  const theme = useTheme();
  const { summary, anomalies, incoherences, gaps, statistiques } = analysisData;

  // Préparer les données pour les graphiques
  const severityChartData = [
    { name: 'Erreurs', value: summary.anomalies.par_severite.error, color: SEVERITY_COLORS.error },
    { name: 'Avertissements', value: summary.anomalies.par_severite.warning, color: SEVERITY_COLORS.warning },
    { name: 'Informations', value: summary.anomalies.par_severite.info, color: SEVERITY_COLORS.info }
  ].filter(item => item.value > 0);

  const weeklyPatternData = Object.entries(statistiques.pattern_hebdomadaire).map(([day, data]) => ({
    jour: day,
    moyenne: data.moyenne,
    min: data.min,
    max: data.max
  }));

  const getSeverityColor = (severity: string) => {
    return SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.info;
  };

  const getSeverityIcon = (severity: string) => {
    return SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || SEVERITY_ICONS.info;
  };

  const getAnomalyTypeLabel = (type: string) => {
    return ANOMALY_TYPE_LABELS[type as keyof typeof ANOMALY_TYPE_LABELS] || type;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* En-tête avec métriques principales */}
      <Card elevation={3} sx={{ mb: 3, borderRadius: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)` }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
            🧠 Intelligence des Données
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Total d'anomalies */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: SEVERITY_COLORS.warning + '15' }}>
                <WarningIcon sx={{ fontSize: 40, color: SEVERITY_COLORS.warning, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: SEVERITY_COLORS.warning }}>
                  {summary.anomalies.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Anomalies détectées
                </Typography>
              </Card>
            </Grid>
            
            {/* Jours avec activité */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: SEVERITY_COLORS.success + '15' }}>
                <BusinessIcon sx={{ fontSize: 40, color: SEVERITY_COLORS.success, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: SEVERITY_COLORS.success }}>
                  {summary.activite.jours_avec_activite}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jours avec activité
                </Typography>
              </Card>
            </Grid>
            
            {/* Moyenne d'heures */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: SEVERITY_COLORS.info + '15' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: SEVERITY_COLORS.info, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: SEVERITY_COLORS.info }}>
                  {summary.activite.moyenne_heures_jour}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Moyenne par jour
                </Typography>
              </Card>
            </Grid>
            
            {/* Efficacité */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: theme.palette.primary.main + '15' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {summary.activite.jours_vides === 0 ? 100 : Math.round((summary.activite.jours_avec_activite / summary.periode.nb_jours) * 100)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Taux d'activité
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Graphique des anomalies par sévérité */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 1, color: SEVERITY_COLORS.warning }} />
                Répartition des Anomalies
              </Typography>
              
              {severityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Stack spacing={2} alignItems="center">
                    <CheckIcon sx={{ fontSize: 48, color: SEVERITY_COLORS.success }} />
                    <Typography variant="body1" color="text.secondary">
                      Aucune anomalie détectée !
                    </Typography>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pattern hebdomadaire */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ mr: 1, color: SEVERITY_COLORS.info }} />
                Pattern Hebdomadaire
              </Typography>
              
              {weeklyPatternData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyPatternData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="jour" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: any, name: any) => [
                        `${value.toFixed(1)}h`, 
                        name === 'moyenne' ? 'Moyenne' : name
                      ]}
                    />
                    <Bar dataKey="moyenne" fill={SEVERITY_COLORS.info} name="Moyenne" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body1" color="text.secondary">
                    Pas assez de données pour le pattern hebdomadaire
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Liste des anomalies */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <WarningIcon sx={{ mr: 1, color: SEVERITY_COLORS.warning }} />
                Anomalies Détectées ({anomalies.length})
              </Typography>
              
              {anomalies.length > 0 ? (
                <Stack spacing={2}>
                  {anomalies.map((anomaly, index) => (
                    <Card 
                      key={index} 
                      variant="outlined" 
                      sx={{ 
                        borderLeft: `4px solid ${getSeverityColor(anomaly.severity)}`,
                        borderRadius: 2
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              {getSeverityIcon(anomaly.severity)}
                              <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 600 }}>
                                {getAnomalyTypeLabel(anomaly.type)}
                              </Typography>
                              <Chip 
                                label={anomaly.severity} 
                                size="small" 
                                sx={{ 
                                  ml: 1, 
                                  backgroundColor: getSeverityColor(anomaly.severity),
                                  color: 'white'
                                }}
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {anomaly.date}
                            </Typography>
                            
                            <Typography variant="body1">
                              {anomaly.message}
                            </Typography>
                            
                            {anomaly.details && (
                              <Box sx={{ mt: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Détails: {JSON.stringify(anomaly.details, null, 2)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  Aucune anomalie détectée ! Tes données sont parfaites. 🎉
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Incohérences et gaps */}
        {(incoherences.length > 0 || gaps.length > 0) && (
          <Grid item xs={12}>
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  Autres Problèmes Détectés
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Incohérences */}
                  {incoherences.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom sx={{ color: SEVERITY_COLORS.warning }}>
                        Incohérences ({incoherences.length})
                      </Typography>
                      <Stack spacing={1}>
                        {incoherences.map((incoherence, index) => (
                          <Alert key={index} severity="warning" sx={{ borderRadius: 1 }}>
                            <Typography variant="body2">
                              <strong>{incoherence.date}</strong> - {incoherence.message}
                            </Typography>
                          </Alert>
                        ))}
                      </Stack>
                    </Grid>
                  )}
                  
                  {/* Gaps temporels */}
                  {gaps.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom sx={{ color: SEVERITY_COLORS.info }}>
                        Gaps Temporels ({gaps.length})
                      </Typography>
                      <Stack spacing={1}>
                        {gaps.map((gap, index) => (
                          <Alert key={index} severity="info" sx={{ borderRadius: 1 }}>
                            <Typography variant="body2">
                              <strong>{gap.debut} → {gap.fin}</strong> ({gap.duree} jour(s))
                            </Typography>
                          </Alert>
                        ))}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
