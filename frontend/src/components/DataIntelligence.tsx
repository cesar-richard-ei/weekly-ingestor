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
  IconButton,
  Paper
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
  Visibility as ViewIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon
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
  Cell,
  LineChart,
  Line
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

const ANOMALY_TYPE_DESCRIPTIONS = {
  heures_impossibles: 'Plus de 24h sur une journée',
  heures_negatives: 'Heures négatives détectées',
  sous_activite: 'Activité inférieure à la moyenne',
  sur_activite: 'Activité supérieure à la moyenne',
  jour_vide: 'Jour sans aucune donnée client',
  jour_suspect: 'Jour avec clients mais 0h totales'
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

  const weeklyPatternData = Object.entries(statistiques.pattern_hebdomadaire)
    .map(([day, data]) => ({
      jour: day === 'Monday' ? 'Lun' : 
            day === 'Tuesday' ? 'Mar' : 
            day === 'Wednesday' ? 'Mer' : 
            day === 'Thursday' ? 'Jeu' : 
            day === 'Friday' ? 'Ven' : 
            day === 'Saturday' ? 'Sam' : 'Dim',
      moyenne: data.moyenne,
      min: data.min,
      max: data.max,
      nb_jours: data.nb_jours
    }))
    .sort((a, b) => {
      const order = { 'Lun': 1, 'Mar': 2, 'Mer': 3, 'Jeu': 4, 'Ven': 5, 'Sam': 6, 'Dim': 7 };
      return (order[a.jour as keyof typeof order] || 0) - (order[b.jour as keyof typeof order] || 0);
    });

  const getSeverityColor = (severity: string) => {
    return SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.info;
  };

  const getSeverityIcon = (severity: string) => {
    return SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || SEVERITY_ICONS.info;
  };

  const getAnomalyTypeLabel = (type: string) => {
    return ANOMALY_TYPE_LABELS[type as keyof typeof ANOMALY_TYPE_LABELS] || type;
  };

  const getAnomalyTypeDescription = (type: string) => {
    return ANOMALY_TYPE_DESCRIPTIONS[type as keyof typeof ANOMALY_TYPE_DESCRIPTIONS] || '';
  };

  const activityRate = summary.activite.jours_vides === 0 ? 100 : 
    Math.round((summary.activite.jours_avec_activite / summary.periode.nb_jours) * 100);

  return (
    <Box sx={{ width: '100%' }}>
      {/* En-tête avec métriques principales */}
      <Card elevation={3} sx={{ mb: 3, borderRadius: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)` }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnalyticsIcon sx={{ mr: 2, fontSize: 32 }} />
            Intelligence des Données
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Total d'anomalies */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: SEVERITY_COLORS.warning + '15', height: '100%' }}>
                <WarningIcon sx={{ fontSize: 40, color: SEVERITY_COLORS.warning, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: SEVERITY_COLORS.warning }}>
                  {summary.anomalies.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Anomalies détectées
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((summary.anomalies.total / summary.periode.nb_jours) * 100, 100)} 
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Card>
            </Grid>
            
            {/* Jours avec activité */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: SEVERITY_COLORS.success + '15', height: '100%' }}>
                <BusinessIcon sx={{ fontSize: 40, color: SEVERITY_COLORS.success, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: SEVERITY_COLORS.success }}>
                  {summary.activite.jours_avec_activite}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jours avec activité
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(summary.activite.jours_avec_activite / summary.periode.nb_jours) * 100} 
                  sx={{ mt: 1, height: 6, borderRadius: 3, backgroundColor: SEVERITY_COLORS.success + '30' }}
                  color="success"
                />
              </Card>
            </Grid>
            
            {/* Moyenne d'heures */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: SEVERITY_COLORS.info + '15', height: '100%' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: SEVERITY_COLORS.info, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: SEVERITY_COLORS.info }}>
                  {summary.activite.moyenne_heures_jour.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Moyenne par jour
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  ±{summary.activite.ecart_type.toFixed(1)}h
                </Typography>
              </Card>
            </Grid>
            
            {/* Taux d'activité */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: theme.palette.primary.main + '15', height: '100%' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {activityRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Taux d'activité
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={activityRate} 
                  sx={{ mt: 1, height: 6, borderRadius: 3, backgroundColor: theme.palette.primary.main + '30' }}
                  color="primary"
                />
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
                <TimelineIcon sx={{ mr: 1, color: SEVERITY_COLORS.info }} />
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
                      labelFormatter={(label) => `${label} (${weeklyPatternData.find(d => d.jour === label)?.nb_jours || 0} jours)`}
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
                    <Paper 
                      key={index} 
                      elevation={1}
                      sx={{ 
                        borderLeft: `4px solid ${getSeverityColor(anomaly.severity)}`,
                        borderRadius: 2,
                        p: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                            {getSeverityIcon(anomaly.severity)}
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {getAnomalyTypeLabel(anomaly.type)}
                            </Typography>
                            <Chip 
                              label={anomaly.severity} 
                              size="small" 
                              sx={{ 
                                backgroundColor: getSeverityColor(anomaly.severity),
                                color: 'white',
                                fontSize: '0.75rem'
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {anomaly.date}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {anomaly.message}
                          </Typography>
                          
                          {getAnomalyTypeDescription(anomaly.type) && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
                              {getAnomalyTypeDescription(anomaly.type)}
                            </Typography>
                          )}
                          
                          {anomaly.details && anomaly.details.raison && (
                            <Box sx={{ mt: 1, p: 1.5, backgroundColor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Raison :</strong> {anomaly.details.raison}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  <CheckIcon sx={{ mr: 1 }} />
                  Aucune anomalie détectée ! Tes données sont parfaites. 🎉
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Incohérences et gaps - seulement si présents */}
        {(incoherences.length > 0 || gaps.length > 0) && (
          <Grid item xs={12}>
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <InfoIcon sx={{ mr: 1, color: SEVERITY_COLORS.info }} />
                  Autres Problèmes Détectés
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Incohérences */}
                  {incoherences.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom sx={{ color: SEVERITY_COLORS.warning, display: 'flex', alignItems: 'center' }}>
                        <WarningIcon sx={{ mr: 1, fontSize: 20 }} />
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
                      <Typography variant="subtitle1" gutterBottom sx={{ color: SEVERITY_COLORS.info, display: 'flex', alignItems: 'center' }}>
                        <TimelineIcon sx={{ mr: 1, fontSize: 20 }} />
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
