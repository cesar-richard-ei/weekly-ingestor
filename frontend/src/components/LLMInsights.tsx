import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Stack,
  LinearProgress,
  Alert,
  Paper,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

interface LLMInsight {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  confidence: number;
}

interface LLMData {
  summary: string;
  insights: LLMInsight[];
  business_recommendations: string[];
  coherence_score: number;
  risk_alerts: string[];
}

interface LLMInsightsProps {
  llmData: LLMData | null;
  isLoading: boolean;
  error: string | null;
}

const IMPACT_COLORS = {
  high: 'error',
  medium: 'warning',
  low: 'info'
} as const;

const IMPACT_LABELS = {
  high: 'Critique',
  medium: 'Important',
  low: 'Info'
} as const;

const CATEGORY_LABELS = {
  facturation: 'Facturation',
  coherence: 'Cohérence',
  validation: 'Validation',
  risk: 'Risque'
};

const CATEGORY_COLORS = {
  facturation: 'primary',
  coherence: 'secondary',
  validation: 'success',
  risk: 'error'
};

const LLMInsights: React.FC<LLMInsightsProps> = ({ llmData, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Analyse IA en cours...
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Erreur lors de l'analyse IA : {error}
      </Alert>
    );
  }

  if (!llmData) {
    return null;
  }

  // Fallback pour compatibilité
  const coherence_score = llmData.coherence_score || (llmData as any).productivity_score || 50;
  
  // Séparer les insights par type
  const problematicInsights = llmData.insights.filter(insight => 
    insight.impact === 'high' || insight.impact === 'medium'
  );
  
  const infoInsights = llmData.insights.filter(insight => 
    insight.impact === 'low'
  );

  // Extraire les jours des titres d'insights
  const extractDayFromTitle = (title: string) => {
    const match = title.match(/Jour (\d+)/);
    return match ? match[1] : null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Correct';
    return 'Problématique';
  };

  return (
    <Stack spacing={3}>
      {/* Dashboard rapide */}
      <Card>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h3" color={`${getScoreColor(coherence_score)}.main`}>
                  {coherence_score}/100
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {getScoreLabel(coherence_score)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score de cohérence
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Résumé de l'analyse
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {llmData.summary}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Jours problématiques - PRIORITÉ 1 */}
      {problematicInsights.length > 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <WarningIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6" color="error">
                Jours à corriger ({problematicInsights.length})
              </Typography>
            </Box>
            
            <List>
              {problematicInsights.map((insight, index) => {
                const day = extractDayFromTitle(insight.title);
                return (
                  <ListItem key={index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      {insight.impact === 'high' ? (
                        <ErrorIcon color="error" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {day && (
                            <Chip 
                              label={`Jour ${day}`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                          <Typography variant="subtitle1" fontWeight="bold">
                            {insight.title}
                          </Typography>
                          <Chip 
                            label={IMPACT_LABELS[insight.impact]} 
                            color={IMPACT_COLORS[insight.impact]} 
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          <Typography variant="body2" color="text.secondary" mb={1}>
                            {insight.description}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AssignmentIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="medium">
                              {insight.recommendation}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                                         <Box display="flex" gap={1}>
                       <Chip 
                         label={`Confiance: ${Math.round(insight.confidence * 100)}%`}
                         size="small"
                         variant="outlined"
                         color="default"
                       />
                     </Box>
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Actions recommandées */}
      {llmData.business_recommendations.length > 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Actions recommandées
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              {llmData.business_recommendations.map((rec, index) => (
                <Paper key={index} sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ScheduleIcon color="primary" />
                    <Typography variant="body1">
                      {rec}
                    </Typography>
                                         <Chip 
                       label="Action requise"
                       size="small"
                       color="primary"
                       variant="outlined"
                     />
                  </Box>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Alertes de risque */}
      {llmData.risk_alerts.length > 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <ErrorIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6" color="error">
                Alertes de risque
              </Typography>
            </Box>
            
            <Stack spacing={1}>
              {llmData.risk_alerts.map((alert, index) => (
                <Alert key={index} severity="error" icon={<ErrorIcon />}>
                  {alert}
                </Alert>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Informations complémentaires */}
      {infoInsights.length > 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <InfoIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Informations complémentaires
              </Typography>
            </Box>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Voir les détails ({infoInsights.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {infoInsights.map((insight, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary={insight.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {insight.description}
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {insight.recommendation}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      
    </Stack>
  );
};

export default LLMInsights;
