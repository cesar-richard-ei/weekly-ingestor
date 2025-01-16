import { Paper, Grid, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PreviewData } from './ReportGenerator';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface ReportStatsProps {
  data: PreviewData[];
  dailyRate: number;
}

export default function ReportStats({ data, dailyRate }: ReportStatsProps) {
  // Calcul des statistiques
  const workDays = data.filter(d => d.type === 'work').length;
  const halfDays = data.filter(d => d.type === 'half_off').length;
  const offDays = data.filter(d => d.type === 'off').length;
  const weekendDays = data.filter(d => d.type === 'weekend').length;

  const totalWorkHours = data
    .filter(d => d.type === 'work' || d.type === 'half_off')
    .reduce((acc, curr) => acc + parseFloat(curr.duration), 0);

  const totalRevenue = totalWorkHours * dailyRate;

  // Données pour le graphique en camembert
  const pieData = [
    { name: 'Jours travaillés', value: workDays },
    { name: 'Demi-journées', value: halfDays },
    { name: 'Jours off', value: offDays },
    { name: 'Week-ends', value: weekendDays },
  ];

  // Données pour le graphique en barres (projets)
  const projectStats = data
    .filter(d => d.type === 'work' || d.type === 'half_off')
    .reduce((acc: { [key: string]: number }, curr) => {
      acc[curr.project] = (acc[curr.project] || 0) + parseFloat(curr.duration);
      return acc;
    }, {});

  const barData = Object.entries(projectStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Statistiques de la période
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" color="primary">
              {totalWorkHours.toFixed(1)}j
            </Typography>
            <Typography variant="subtitle1">
              Jours travaillés
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
        </Grid>
        <Grid item xs={12} md={4}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={30}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={4}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Grid>
      </Grid>
    </Paper>
  );
} 