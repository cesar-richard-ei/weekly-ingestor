import { 
  Paper, 
  Grid, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Chip, 
  LinearProgress, 
  Stack,
  useTheme
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { PreviewData } from './ReportGenerator';
import { useMemo } from 'react';

interface ReportStatsProps {
  data: PreviewData[];
  getClientRate: (clientName: string) => number;
}

export default function ReportStats({ data, getClientRate }: ReportStatsProps) {
  const theme = useTheme();

  // === MÉTRIQUES ESSENTIELLES ===
  
  // Statistiques de base
  const basicStats = useMemo(() => {
    const workData = data.filter(d => (d.type === 'work' || d.type === 'half_off') && d.duration !== '0');
    
    let totalRevenue = 0;
    let totalHours = 0;
    let clientStats: { [key: string]: { hours: number; revenue: number; rate: number } } = {};
    
    workData.forEach(item => {
      if (!item.client) return;
      
      const clients = item.client.split(" + ");
      const duration = parseFloat(item.duration);
      const durationPerClient = duration / clients.length;
      
      clients.forEach(client => {
        const clientName = client.trim();
        const rate = getClientRate(clientName);
        const revenue = durationPerClient * rate;
        
        if (!clientStats[clientName]) {
          clientStats[clientName] = { hours: 0, revenue: 0, rate: 0 };
        }
        
        clientStats[clientName].hours += durationPerClient;
        clientStats[clientName].revenue += revenue;
        clientStats[clientName].rate = rate;
        
        totalRevenue += revenue;
        totalHours += durationPerClient;
      });
    });
    
    const averageRate = totalHours > 0 ? totalRevenue / totalHours : 0;
    
    return {
      totalRevenue,
      totalHours,
      averageRate,
      clientStats
    };
  }, [data, getClientRate]);

  // Statistiques temporelles
  const timeStats = useMemo(() => {
    const totalDays = data.length;
    const workDays = data.filter(d => d.type === 'work' && d.duration !== '0').length;
    const halfDays = data.filter(d => d.type === 'half_off').length;
    const offDays = data.filter(d => d.type === 'off' || d.type === 'holiday').length;
    const weekendDays = data.filter(d => d.type === 'weekend').length;
    
    const availableDays = totalDays - weekendDays;
    const productiveDays = workDays + (halfDays * 0.5);
    const efficiencyRate = availableDays > 0 ? (productiveDays / availableDays) * 100 : 0;
    
    return {
      totalDays,
      workDays,
      halfDays,
      offDays,
      weekendDays,
      availableDays,
      productiveDays,
      efficiencyRate
    };
  }, [data]);

  // Top clients par revenus
  const topClients = useMemo(() => {
    return Object.entries(basicStats.clientStats)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        hours: data.hours,
        rate: data.rate
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [basicStats.clientStats]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* En-tête avec métriques principales */}
      <Card elevation={3} sx={{ mb: 3, borderRadius: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)` }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, color: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BusinessIcon sx={{ mr: 2, fontSize: 32 }} />
            Métriques Business
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Revenus totaux */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: '#4CAF50' + '15', height: '100%' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#4CAF50', mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                  {basicStats.totalRevenue.toFixed(0)}€
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revenus totaux
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {basicStats.totalHours.toFixed(1)}h facturées
                </Typography>
              </Card>
            </Grid>
            
            {/* TJM moyen */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: '#2196F3' + '15', height: '100%' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: '#2196F3', mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196F3' }}>
                  {basicStats.averageRate.toFixed(0)}€
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  TJM moyen
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Moyenne pondérée
                </Typography>
              </Card>
            </Grid>
            
            {/* Jours productifs */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: '#FF9800' + '15', height: '100%' }}>
                <CheckIcon sx={{ fontSize: 40, color: '#FF9800', mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                  {timeStats.productiveDays.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Jours productifs
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  sur {timeStats.availableDays} disponibles
                </Typography>
              </Card>
            </Grid>
            
            {/* Efficacité temporelle */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: theme.palette.primary.main + '15', height: '100%' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {timeStats.efficiencyRate.toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Efficacité temporelle
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={timeStats.efficiencyRate} 
                  sx={{ mt: 1, height: 6, borderRadius: 3, backgroundColor: theme.palette.primary.main + '30' }}
                  color="primary"
                />
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Top clients par revenus */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BusinessIcon sx={{ mr: 1, color: '#2196F3' }} />
                Top Clients par Revenus ({topClients.length})
              </Typography>
              
              {topClients.length > 0 ? (
                <Grid container spacing={2}>
                  {topClients.map((client, index) => (
                    <Grid item xs={12} sm={6} md={4} key={client.name}>
                      <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {client.name}
                          </Typography>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small" 
                            color="primary"
                          />
                        </Box>
                        
                        <Stack spacing={1.5}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Revenus:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                              {client.revenue.toFixed(0)}€
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Heures:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {client.hours.toFixed(1)}h
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">TJM:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2196F3' }}>
                              {client.rate}€
                            </Typography>
                          </Box>
                        </Stack>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Stack spacing={2} alignItems="center">
                    <InfoIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                    <Typography variant="body1" color="text.secondary">
                      Aucun client avec des heures facturées
                    </Typography>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 