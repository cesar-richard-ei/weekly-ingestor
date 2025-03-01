import { Paper, Grid, Typography, Box, Alert, Divider, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PreviewData } from './ReportGenerator';
import Holidays from 'date-holidays';
import { parse, isWeekend, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Palette de couleurs adaptée aux graphiques
const COLORS = ['#2196F3', '#4CAF50', '#FFC107', '#FF5722', '#9C27B0', '#3F51B5', '#009688', '#E91E63'];
// Couleurs pour les types de jours
const DAY_COLORS = {
  work: '#2196F3',
  half_off: '#FFC107',
  off: '#E57373',
  weekend: '#EEEEEE',
  holiday: '#BDBDBD',
  empty: '#FAFAFA'
};

interface ReportStatsProps {
  data: PreviewData[];
  dailyRate: number;
}

export default function ReportStats({ data, dailyRate }: ReportStatsProps) {
  const theme = useTheme();
  // Initialisation du calendrier des jours fériés français
  const hd = new Holidays('FR');

  // Statistiques par client (avec les clients réellement sélectionnés)
  const clientStats = data
    .filter(d => (d.type === 'work' || d.type === 'half_off') && d.duration !== '0')
    .reduce((acc: { [key: string]: number }, curr) => {
      if (!curr.client) return acc;
      
      // Traiter chaque client individuellement
      const clients = curr.client.split(" + ");
      clients.forEach(client => {
        const clientName = client.trim();
        acc[clientName] = (acc[clientName] || 0) + (parseFloat(curr.duration) / clients.length);
      });
      
      return acc;
    }, {});

  const clientBarData = Object.entries(clientStats)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  // Calcul des statistiques par date
  const statsByDate = data.reduce((acc: { [key: string]: { 
    workDays: number,
    halfDays: number,
    offDays: number,
    totalDuration: number,
    type: string
  }}, curr) => {
    if (!acc[curr.date]) {
      acc[curr.date] = {
        workDays: 0,
        halfDays: 0,
        offDays: 0,
        totalDuration: 0,
        type: curr.type
      };
    }

    if (curr.type === 'work' && curr.duration !== '0') {
      acc[curr.date].workDays += 1;
      acc[curr.date].totalDuration += parseFloat(curr.duration);
    } else if (curr.type === 'half_off') {
      acc[curr.date].halfDays += 1;
      acc[curr.date].totalDuration += parseFloat(curr.duration);
    } else if (curr.type === 'off' || (curr.type === 'work' && curr.duration === '0')) {
      acc[curr.date].offDays += 1;
    }

    return acc;
  }, {});

  // Statistiques de répartition des jours
  const workDays = Object.values(statsByDate).filter(s => s.totalDuration > 0 && s.type === 'work').length;
  const halfDays = Object.values(statsByDate).filter(s => s.type === 'half_off').length;
  const offDays = Object.values(statsByDate).filter(s => s.type === 'off').length;
  const weekendDays = data.filter(d => d.type === 'weekend').length;
  const holidayDays = data.filter(d => d.type === 'holiday').length;

  // Calcul des jours non saisis (hors weekends et jours fériés)
  const nonFilledDays = data.filter(d => {
    if (d.type !== 'empty') return false;
    const date = parse(d.date, 'dd/MM/yyyy', new Date());
    if (isWeekend(date)) return false;
    const isHoliday = hd.isHoliday(date);
    return !isHoliday;
  }).length;

  // Calcul du total des heures travaillées
  const totalWorkHours = Object.values(statsByDate)
    .reduce((acc, curr) => acc + curr.totalDuration, 0);

  // Calcul du CA total
  const totalRevenue = totalWorkHours * dailyRate;

  // Données pour le graphique en camembert des types de jours
  const dayTypePieData = [
    { name: 'Jours travaillés', value: workDays, color: DAY_COLORS.work },
    { name: 'Demi-journées', value: halfDays, color: DAY_COLORS.half_off },
    { name: 'Jours off', value: offDays, color: DAY_COLORS.off },
    { name: 'Week-ends', value: weekendDays, color: DAY_COLORS.weekend },
    { name: 'Jours fériés', value: holidayDays, color: DAY_COLORS.holiday },
  ].filter(item => item.value > 0);

  // Distribution par mois si la période est suffisamment longue
  const monthlyData = data
    .filter(d => d.type === 'work' || d.type === 'half_off')
    .reduce((acc: { [key: string]: number }, curr) => {
      const date = parse(curr.date, 'dd/MM/yyyy', new Date());
      const monthYear = format(date, 'MMM yyyy', { locale: fr });
      
      acc[monthYear] = (acc[monthYear] || 0) + parseFloat(curr.duration);
      return acc;
    }, {});

  const monthlyBarData = Object.entries(monthlyData)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => {
      // Trier par date
      const dateA = parse(a.name, 'MMM yyyy', new Date(), { locale: fr });
      const dateB = parse(b.name, 'MMM yyyy', new Date(), { locale: fr });
      return dateA.getTime() - dateB.getTime();
    });

  // Vérifier s'il y a assez de données
  const hasEnoughDataForCharts = totalWorkHours > 0;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {nonFilledDays > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {nonFilledDays} jour{nonFilledDays > 1 ? 's' : ''} non saisi{nonFilledDays > 1 ? 's' : ''} sur la période sélectionnée (hors weekends et jours fériés)
        </Alert>
      )}
      
      <Typography variant="h6" gutterBottom>
        Statistiques de la période
      </Typography>
      
      <Grid container spacing={3}>
        {/* Compteurs principaux */}
        <Grid item xs={12} md={6} lg={3}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" color="primary">
              {totalWorkHours.toFixed(1)}j
            </Typography>
            <Typography variant="subtitle1">
              Jours facturables
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" color="success.main">
              {totalRevenue.toLocaleString()}€
            </Typography>
            <Typography variant="subtitle1">
              Chiffre d'affaires
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {data.filter(d => d.type === 'work' || d.type === 'half_off').length}
            </Typography>
            <Typography variant="subtitle1">
              Jour(s) de présence
            </Typography>
          </Box>
        </Grid>
        
        {/* Graphique de répartition des types de jours */}
        <Grid item xs={12} md={6} lg={3}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            Répartition des types de jours
          </Typography>
          
          {hasEnoughDataForCharts ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dayTypePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={30}
                  paddingAngle={1}
                >
                  {dayTypePieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke={theme.palette.background.paper}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} jour(s)`, ""]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Pas assez de données pour afficher ce graphique
              </Typography>
            </Box>
          )}
        </Grid>
        
        {/* Graphique de répartition par client */}
        <Grid item xs={12} md={6} lg={6}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            Répartition par client (en jours)
          </Typography>
          
          {clientBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart 
                data={clientBarData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} jour(s)`, ""]} />
                <Bar dataKey="value" fill="#3f51b5">
                  {clientBarData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Aucun client à afficher pour cette période
              </Typography>
            </Box>
          )}
        </Grid>
        
        {/* Graphique de distribution mensuelle (si assez de données) */}
        {monthlyBarData.length > 1 && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" align="center" gutterBottom>
              Distribution mensuelle
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={monthlyBarData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} jour(s)`, ""]} />
                <Bar dataKey="value" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
} 