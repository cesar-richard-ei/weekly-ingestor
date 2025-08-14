import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip, 
  Stack, 
  Divider,
  useTheme,
  LinearProgress,
  Alert,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Lightbulb as LightbulbIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Business as BusinessIcon,
  Psychology as PsychologyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { 
  LLMInsight, 
  LLMAnalysisResponse 
} from '../hooks/useReportGeneration';

interface LLMInsightsProps {
  llmData: LLMAnalysisResponse;
}

const IMPACT_COLORS = {
  high: '#f44336',
  medium: '#ff9800',
  low: '#4caf50'
};

const IMPACT_ICONS = {
  high: <WarningIcon />,
  medium: <TrendingDownIcon />,
  low: <CheckIcon />
};

const CATEGORY_LABELS = {
  facturation: 'Facturation',
  coherence: 'Cohérence',
  risk: 'Risque',
  validation: 'Validation',
  general: 'Général'
};

const CATEGORY_COLORS = {
  facturation: '#2196F3',
  coherence: '#4CAF50',
  risk: '#F44336',
  validation: '#FF9800',
  general: '#9E9E9E'
};

export default function LLMInsights({ llmData }: LLMInsightsProps) {
  const theme = useTheme();
  const { summary, insights, business_recommendations, risk_alerts } = llmData;
  
  // Gestion robuste du score (compatibilité avec l'ancien format)
  const coherence_score = llmData.coherence_score || llmData.productivity_score || 50;

  const getImpactColor = (impact: string) => {
    return IMPACT_COLORS[impact as keyof typeof IMPACT_COLORS] || IMPACT_COLORS.medium;
  };

  const getImpactIcon = (impact: string) => {
    return IMPACT_ICONS[impact as keyof typeof IMPACT_ICONS] || IMPACT_ICONS.medium;
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category;
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.general;
  };

  const renderConfidenceStars = (confidence: number) => {
    const stars = [];
    const fullStars = Math.floor(confidence * 5);
    const hasHalfStar = confidence * 5 % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIcon key={i} sx={{ fontSize: 16, color: '#FFD700' }} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarBorderIcon key={i} sx={{ fontSize: 16, color: '#FFD700' }} />);
      } else {
        stars.push(<StarBorderIcon key={i} sx={{ fontSize: 16, color: '#E0E0E0' }} />);
      }
    }
    return stars;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* En-tête avec score de productivité */}
      <Card elevation={3} sx={{ mb: 3, borderRadius: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)` }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PsychologyIcon sx={{ mr: 2, fontSize: 32 }} />
            Audit de Facturation
          </Typography>
          
          <Typography variant="h6" align="center" sx={{ mb: 3, color: 'text.secondary', fontStyle: 'italic' }}>
            {summary}
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Score de cohérence */}
            <Grid item xs={12} md={6}>
              <Card sx={{ textAlign: 'center', p: 3, background: '#4CAF50' + '15', height: '100%' }}>
                <TrendingUpIcon sx={{ fontSize: 48, color: '#4CAF50', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#4CAF50', mb: 1 }}>
                  {coherence_score.toFixed(0)}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                  Score de Cohérence
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={coherence_score} 
                  sx={{ 
                    height: 12, 
                    borderRadius: 6, 
                    backgroundColor: '#4CAF50' + '30',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: coherence_score > 70 ? '#4CAF50' : 
                                    coherence_score > 50 ? '#FF9800' : '#F44336'
                    }
                  }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {coherence_score > 70 ? 'Excellent' : 
                   coherence_score > 50 ? 'Bon' : 'À améliorer'}
                </Typography>
              </Card>
            </Grid>
            
            {/* Résumé des insights */}
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LightbulbIcon sx={{ mr: 1, color: '#FF9800' }} />
                  Résumé des Insights
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Insights détectés:</Typography>
                    <Chip label={insights.length} color="primary" size="small" />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Recommandations:</Typography>
                    <Chip label={business_recommendations.length} color="success" size="small" />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Alertes risques:</Typography>
                    <Chip label={risk_alerts.length} color="warning" size="small" />
                  </Box>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Insights détaillés */}
        <Grid item xs={12} lg={8}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LightbulbIcon sx={{ mr: 1, color: '#FF9800' }} />
                Insights Détaillés ({insights.length})
              </Typography>
              
              {insights.length > 0 ? (
                <Stack spacing={2}>
                  {insights.map((insight, index) => (
                    <Paper 
                      key={index} 
                      elevation={1}
                      sx={{ 
                        borderLeft: `4px solid ${getImpactColor(insight.impact)}`,
                        borderRadius: 2,
                        p: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {getImpactIcon(insight.impact)}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {insight.title}
                          </Typography>
                          <Chip 
                            label={getCategoryLabel(insight.category)} 
                            size="small" 
                            sx={{ 
                              backgroundColor: getCategoryColor(insight.category),
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                          <Chip 
                            label={insight.impact} 
                            size="small" 
                            sx={{ 
                              backgroundColor: getImpactColor(insight.impact),
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {renderConfidenceStars(insight.confidence)}
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {insight.description}
                      </Typography>
                      
                      <Box sx={{ p: 1.5, backgroundColor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>💡 Recommandation :</strong> {insight.recommendation}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Aucun insight généré par le LLM
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommandations et alertes */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Recommandations business */}
            {business_recommendations.length > 0 && (
              <Card elevation={2} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BusinessIcon sx={{ mr: 1, color: '#4CAF50' }} />
                    Recommandations Business
                  </Typography>
                  
                  <Stack spacing={1.5}>
                    {business_recommendations.map((rec, index) => (
                      <Alert key={index} severity="success" sx={{ borderRadius: 1 }}>
                        <Typography variant="body2">
                          {rec}
                        </Typography>
                      </Alert>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
            
            {/* Alertes risques */}
            {risk_alerts.length > 0 && (
              <Card elevation={2} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarningIcon sx={{ mr: 1, color: '#F44336' }} />
                    Alertes Risques
                  </Typography>
                  
                  <Stack spacing={1.5}>
                    {risk_alerts.map((alert, index) => (
                      <Alert key={index} severity="warning" sx={{ borderRadius: 1 }}>
                        <Typography variant="body2">
                          {alert}
                        </Typography>
                      </Alert>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
