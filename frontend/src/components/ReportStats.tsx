import { 
  Paper, 
  Grid, 
  Typography, 
  Box, 
  Alert, 
  Divider, 
  useTheme, 
  Card, 
  CardContent, 
  Chip, 
  LinearProgress, 
  Tooltip as MuiTooltip,
  Stack,
  Badge,
  IconButton
} from '@mui/material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { PreviewData } from './ReportGenerator';
import Holidays from 'date-holidays';
import { parse, isWeekend, format, getDay, addDays, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';

// Palette de couleurs optimisée pour les métriques business
const BUSINESS_COLORS = {
  revenue: '#4CAF50',
  profit: '#2196F3',
  warning: '#FF9800',
  danger: '#F44336',
  success: '#4CAF50',
  info: '#2196F3',
  neutral: '#9E9E9E'
};

// Couleurs pour les types de jours
const DAY_COLORS = {
  work: '#4CAF50',
  half_off: '#FF9800',
  off: '#F44336',
  weekend: '#9E9E9E',
  holiday: '#2196F3',
  empty: '#E0E0E0'
};

interface ReportStatsProps {
  data: PreviewData[];
  getClientRate: (clientName: string) => number;
}

export default function ReportStats({ data, getClientRate }: ReportStatsProps) {
  const theme = useTheme();
  const hd = useMemo(() => new Holidays('FR'), []);

  // === MÉTRIQUES BUSINESS PRINCIPALES ===
  
  // Revenus et rentabilité
  const businessMetrics = useMemo(() => {
    const workData = data.filter(d => (d.type === 'work' || d.type === 'half_off') && d.duration !== '0');
    
    let totalRevenue = 0;
    let totalHours = 0;
    let clientRevenue: { [key: string]: { hours: number; revenue: number; rate: number } } = {};
    
    workData.forEach(item => {
      if (!item.client) return;
      
      const clients = item.client.split(" + ");
      const duration = parseFloat(item.duration);
      const durationPerClient = duration / clients.length;
      
      clients.forEach(client => {
        const clientName = client.trim();
        const rate = getClientRate(clientName);
        const revenue = durationPerClient * rate;
        
        if (!clientRevenue[clientName]) {
          clientRevenue[clientName] = { hours: 0, revenue: 0, rate: 0 };
        }
        
        clientRevenue[clientName].hours += durationPerClient;
        clientRevenue[clientName].revenue += revenue;
        clientRevenue[clientName].rate = rate;
        
        totalRevenue += revenue;
        totalHours += durationPerClient;
      });
    });
    
    const averageRate = totalHours > 0 ? totalRevenue / totalHours : 0;
    const targetRate = 500; // À personnaliser selon ton TJM cible
    const rateEfficiency = targetRate > 0 ? (averageRate / targetRate) * 100 : 0;
    
    return {
      totalRevenue,
      totalHours,
      averageRate,
      rateEfficiency,
      targetRate,
      clientRevenue
    };
  }, [data, getClientRate]);

  // Efficacité temporelle
  const timeEfficiency = useMemo(() => {
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

  // Top clients par rentabilité
  const topClients = useMemo(() => {
    return Object.entries(businessMetrics.clientRevenue)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        hours: data.hours,
        rate: data.rate,
        efficiency: data.hours > 0 ? data.revenue / data.hours : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [businessMetrics.clientRevenue]);

  // Tendances et alertes business
  const businessAlerts = useMemo(() => {
    const alerts = [];
    
    // Alerte TJM moyen
    if (businessMetrics.rateEfficiency < 80) {
      alerts.push({
        type: 'warning',
        icon: <WarningIcon />,
        title: 'TJM moyen en baisse',
        message: `Ton TJM moyen (${businessMetrics.averageRate.toFixed(0)}€) est ${(100 - businessMetrics.rateEfficiency).toFixed(0)}% en dessous de ton objectif (${businessMetrics.targetRate}€)`,
        action: 'Revoir tes tarifs ou négocier mieux'
      });
    }
    
    // Alerte charge de travail
    if (timeEfficiency.efficiencyRate < 60) {
      alerts.push({
        type: 'info',
        icon: <InfoIcon />,
        title: 'Charge de travail faible',
        message: `Tu n'utilises que ${timeEfficiency.efficiencyRate.toFixed(0)}% de ton temps disponible`,
        action: 'Opportunité de prospection ou formation'
      });
    }
    
    // Alerte concentration client
    if (topClients.length > 0 && topClients[0].revenue > businessMetrics.totalRevenue * 0.5) {
      alerts.push({
        type: 'warning',
        icon: <WarningIcon />,
        title: 'Concentration client élevée',
        message: `Ton client principal représente ${((topClients[0].revenue / businessMetrics.totalRevenue) * 100).toFixed(0)}% de tes revenus`,
        action: 'Diversifier ta clientèle'
      });
    }
    
    // Alerte positive si tout va bien
    if (alerts.length === 0) {
      alerts.push({
        type: 'success',
        icon: <CheckIcon />,
        title: 'Excellent !',
        message: 'Tes métriques business sont au top !',
        action: 'Continue comme ça !'
      });
    }
    
    return alerts;
  }, [businessMetrics, timeEfficiency, topClients]);

  // Données pour les graphiques
  const chartData = useMemo(() => {
    // Répartition des revenus par client
    const revenueByClient = topClients.map(client => ({
      name: client.name,
      revenue: client.revenue,
      hours: client.hours,
      rate: client.rate
    }));
    
    // Efficacité temporelle par jour
    const dailyEfficiency = data.slice(0, 30).map(item => ({
      date: item.date,
      type: item.type,
      duration: parseFloat(item.duration) || 0,
      isProductive: item.type === 'work' || item.type === 'half_off'
    }));
    
    // Répartition des types de jours
    const dayTypeDistribution = [
      { name: 'Travail', value: timeEfficiency.workDays, color: DAY_COLORS.work },
      { name: 'Demi-journée', value: timeEfficiency.halfDays, color: DAY_COLORS.half_off },
      { name: 'Congés', value: timeEfficiency.offDays, color: DAY_COLORS.off },
      { name: 'Weekends', value: timeEfficiency.weekendDays, color: DAY_COLORS.weekend }
    ];
    
    return {
      revenueByClient,
      dailyEfficiency,
      dayTypeDistribution
    };
  }, [data, topClients, timeEfficiency]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* En-tête avec métriques principales */}
      <Card elevation={3} sx={{ mb: 3, borderRadius: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)` }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
            📊 Dashboard Business Freelance
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Revenus totaux */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: BUSINESS_COLORS.revenue + '15' }}>
                <MoneyIcon sx={{ fontSize: 40, color: BUSINESS_COLORS.revenue, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: BUSINESS_COLORS.revenue }}>
                  {businessMetrics.totalRevenue.toFixed(0)}€
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revenus totaux
                </Typography>
              </Card>
            </Grid>
            
            {/* Heures facturables */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: BUSINESS_COLORS.profit + '15' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: BUSINESS_COLORS.profit, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: BUSINESS_COLORS.profit }}>
                  {businessMetrics.totalHours.toFixed(1)}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Heures facturables
                </Typography>
              </Card>
            </Grid>
            
            {/* TJM moyen */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: BUSINESS_COLORS.info + '15' }}>
                <BusinessIcon sx={{ fontSize: 40, color: BUSINESS_COLORS.info, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: BUSINESS_COLORS.info }}>
                  {businessMetrics.averageRate.toFixed(0)}€
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  TJM moyen
                </Typography>
              </Card>
            </Grid>
            
            {/* Efficacité temporelle */}
            <Grid item xs={12} md={3}>
              <Card sx={{ textAlign: 'center', p: 2, background: BUSINESS_COLORS.success + '15' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: BUSINESS_COLORS.success, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: BUSINESS_COLORS.success }}>
                  {timeEfficiency.efficiencyRate.toFixed(0)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Efficacité temporelle
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alertes business intelligentes */}
      <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
            Alertes Business
          </Typography>
          
          <Stack spacing={2}>
            {businessAlerts.map((alert, index) => (
              <Alert
                key={index}
                severity={alert.type}
                icon={alert.icon}
                sx={{ borderRadius: 2 }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {alert.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {alert.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    💡 {alert.action}
                  </Typography>
                </Box>
              </Alert>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Top clients par rentabilité */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, color: BUSINESS_COLORS.revenue }} />
                Top Clients par Revenus
              </Typography>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.revenueByClient}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      `${value.toFixed(0)}€`, 
                      name === 'revenue' ? 'Revenus' : 'Heures'
                    ]}
                  />
                  <Bar dataKey="revenue" fill={BUSINESS_COLORS.revenue} name="Revenus" />
                </BarChart>
              </ResponsiveContainer>
              
              <Stack spacing={1} sx={{ mt: 2 }}>
                {topClients.map((client, index) => (
                  <Box key={client.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={`#${index + 1}`} 
                        size="small" 
                        sx={{ mr: 1, backgroundColor: BUSINESS_COLORS.revenue, color: 'white' }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {client.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: BUSINESS_COLORS.revenue }}>
                      {client.revenue.toFixed(0)}€
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Répartition des types de jours */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ mr: 1, color: BUSINESS_COLORS.info }} />
                Répartition Temporelle
              </Typography>
              
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.dayTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.dayTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Efficacité temporelle:</strong> {timeEfficiency.efficiencyRate.toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={timeEfficiency.efficiencyRate} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: timeEfficiency.efficiencyRate > 70 ? BUSINESS_COLORS.success : 
                                    timeEfficiency.efficiencyRate > 50 ? BUSINESS_COLORS.warning : BUSINESS_COLORS.danger
                    }
                  }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {timeEfficiency.productiveDays} jours productifs sur {timeEfficiency.availableDays} disponibles
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Efficacité par client */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon sx={{ mr: 1, color: BUSINESS_COLORS.profit }} />
                Efficacité Business par Client
              </Typography>
              
              <Grid container spacing={2}>
                {topClients.map((client, index) => (
                  <Grid item xs={12} sm={6} md={4} key={client.name}>
                    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {client.name}
                        </Typography>
                        <Chip 
                          label={`#${index + 1}`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>
                      
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Revenus:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: BUSINESS_COLORS.revenue }}>
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
                          <Typography variant="body2" sx={{ fontWeight: 600, color: BUSINESS_COLORS.info }}>
                            {client.rate}€
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Efficacité:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: BUSINESS_COLORS.success }}>
                            {client.efficiency.toFixed(0)}€/h
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 