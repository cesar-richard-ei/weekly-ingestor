import { Paper, Grid, Typography, Box, Alert, Divider, useTheme, Card, CardContent, Chip, LinearProgress, Tooltip as MuiTooltip } from '@mui/material';
import { PieChart, Pie, Cell, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { PreviewData } from './ReportGenerator';
import Holidays from 'date-holidays';
import { parse, isWeekend, format, getDay, addDays } from 'date-fns';
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

// Jours de la semaine
const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface ReportStatsProps {
  data: PreviewData[];
  getClientRate: (clientName: string) => number;
}

export default function ReportStats({ data, getClientRate }: ReportStatsProps) {
  const theme = useTheme();
  // Initialisation du calendrier des jours fériés français
  const hd = new Holidays('FR');

  // Statistiques par client (avec les clients réellement sélectionnés)
  const clientStats = data
    .filter(d => (d.type === 'work' || d.type === 'half_off') && d.duration !== '0')
    .reduce((acc: { [key: string]: { hours: number; revenue: number } }, curr) => {
      if (!curr.client) return acc;
      
      // Traiter chaque client individuellement
      const clients = curr.client.split(" + ");
      clients.forEach(client => {
        const clientName = client.trim();
        if (!acc[clientName]) {
          acc[clientName] = { hours: 0, revenue: 0 };
        }
        
        // Durée proportionnelle au nombre de clients
        const duration = parseFloat(curr.duration) / clients.length;
        acc[clientName].hours += duration;
        
        // Calculer le revenu avec le TJM spécifique à ce client
        const clientRate = getClientRate(clientName);
        acc[clientName].revenue += duration * clientRate;
      });
      
      return acc;
    }, {});

  const clientBarData = Object.entries(clientStats)
    .map(([name, data]) => ({ 
      name, 
      value: parseFloat(data.hours.toFixed(2)),
      revenue: data.revenue
    }))
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

  // Calcul du CA total en utilisant les TJM spécifiques par client
  const totalRevenue = Object.values(clientStats)
    .reduce((acc, curr) => acc + curr.revenue, 0);

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
  
  // Nouvelles métriques avancées
  
  // 1. Taux d'occupation et productivité
  // Calculer le nombre total de jours ouvrables dans la période (hors weekends et jours fériés)
  let workableDays = 0;
  let firstDate: Date | null = null;
  let lastDate: Date | null = null;
  
  // Extraire les dates min et max de la période
  data.forEach(item => {
    const currentDate = parse(item.date, 'dd/MM/yyyy', new Date());
    if (!firstDate || currentDate < firstDate) firstDate = currentDate;
    if (!lastDate || currentDate > lastDate) lastDate = currentDate;
  });
  
  // Calculer le nombre de jours ouvrables
  if (firstDate && lastDate) {
    let currentDate = firstDate;
    while (currentDate <= lastDate) {
      if (!isWeekend(currentDate) && !hd.isHoliday(currentDate)) {
        workableDays++;
      }
      currentDate = addDays(currentDate, 1);
    }
  }
  
  // Taux d'occupation (jours travaillés / jours ouvrables)
  const occupancyRate = workableDays > 0 
    ? (totalWorkHours / workableDays) * 100
    : 0;
    
  // Répartition par jour de la semaine
  const weekdayDistribution = Array(7).fill(0);
  data.forEach(item => {
    if (item.type === 'work' || item.type === 'half_off') {
      const date = parse(item.date, 'dd/MM/yyyy', new Date());
      const dayOfWeek = getDay(date);
      weekdayDistribution[dayOfWeek] += parseFloat(item.duration);
    }
  });
  
  const weekdayData = weekdayDistribution.map((value, index) => ({
    name: WEEKDAYS[index],
    value: parseFloat(value.toFixed(2))
  })).filter((_, index) => index !== 0 && index !== 6); // Filtrer weekend si souhaité
  
  // Tendance d'activité quotidienne
  const dailyActivityData: { date: string; value: number }[] = [];
  
  if (firstDate && lastDate) {
    const dateMap = new Map<string, number>();
    
    // Initialiser toutes les dates dans la période
    let currentDate = firstDate;
    while (currentDate <= lastDate) {
      if (!isWeekend(currentDate) && !hd.isHoliday(currentDate)) {
        const dateStr = format(currentDate, 'dd/MM');
        dateMap.set(dateStr, 0);
      }
      currentDate = addDays(currentDate, 1);
    }
    
    // Remplir avec les données réelles
    data.forEach(item => {
      if (item.type === 'work' || item.type === 'half_off') {
        const date = parse(item.date, 'dd/MM/yyyy', new Date());
        const dateStr = format(date, 'dd/MM');
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + parseFloat(item.duration));
      }
    });
    
    // Convertir en tableau pour le graphique
    dateMap.forEach((value, date) => {
      dailyActivityData.push({ date, value: parseFloat(value.toFixed(1)) });
    });
    
    // Trier par date
    dailyActivityData.sort((a, b) => {
      const dateA = parse(a.date, 'dd/MM', new Date());
      const dateB = parse(b.date, 'dd/MM', new Date());
      return dateA.getTime() - dateB.getTime();
    });
  }
  
  // 2. Analyse des clients plus approfondie
  // Top clients
  const topClients = clientBarData.slice(0, 3);
  
  // Calcul de la diversification (indice de concentration)
  // On utilise un indice d'Herfindahl-Hirschman simplifié
  let diversificationIndex = 0;
  if (clientBarData.length > 0) {
    const totalClientWork = clientBarData.reduce((sum, item) => sum + item.value, 0);
    diversificationIndex = clientBarData.reduce((sum, item) => {
      const share = item.value / totalClientWork;
      return sum + (share * share);
    }, 0);
  }
  
  // Interprétation de l'indice de diversification
  let diversificationText = "";
  if (diversificationIndex >= 0.6) diversificationText = "Faible";
  else if (diversificationIndex > 0.4) diversificationText = "Moyenne";
  else if (diversificationIndex > 0.2) diversificationText = "Bonne";
  
  // 3. Visualisations avancées
  // Données pour le graphique en radar de répartition client / temps
  const radarData = clientBarData.slice(0, 5).map(client => {
    const obj: Record<string, any> = { name: client.name };
    obj.value = client.value;
    return obj;
  });
  
  // 4. Métriques financières
  // Moyenne du revenu quotidien
  let avgDailyRevenue = totalRevenue / workableDays;
  
  // Récupération des jours avec clients et nombre moyen de clients par jour
  const daysWithClients = new Set<string>();
  let totalClients = 0;
  let avgClientsPerDay = 0;
  
  data.forEach(item => {
    if (item.type === 'work' && item.client) {
      daysWithClients.add(item.date);
      const clientCount = item.client.split(" + ").length;
      totalClients += clientCount;
    }
  });
  
  if (daysWithClients.size > 0) {
    avgClientsPerDay = totalClients / daysWithClients.size;
  }
  
  // Ajouter un visuel pour les TJM par client dans la section Analyse des clients
  const clientRatesData = clientBarData.slice(0, 5).map(client => {
    const rate = getClientRate(client.name);
    return {
      name: client.name,
      rate
    };
  });

  return (
    <>
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
      
      {/* Nouvelle section pour les analyses avancées */}
      {hasEnoughDataForCharts && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Analyses avancées
          </Typography>
          
          <Grid container spacing={3}>
            {/* 1. Taux d'occupation et productivité */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Taux d'occupation et productivité
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Taux d'occupation</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {occupancyRate.toFixed(0)}%
                      </Typography>
                    </Box>
                    <MuiTooltip title={`${totalWorkHours.toFixed(1)} jours facturés sur ${workableDays} jours ouvrables disponibles`}>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(occupancyRate, 100)} 
                        color={occupancyRate > 80 ? "success" : occupancyRate > 50 ? "primary" : "warning"}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </MuiTooltip>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Intensité par jour de semaine
                  </Typography>
                  
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={weekdayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} jour(s)`, ""]} />
                      <Bar dataKey="value" fill={theme.palette.primary.light} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {dailyActivityData.length > 5 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Tendance d'activité
                      </Typography>
                      
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={dailyActivityData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} jour(s)`, ""]} />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={theme.palette.primary.main} 
                            dot={{ r: 2 }}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* 2. Analyse des clients plus approfondie */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Analyse des clients
                  </Typography>
                  
                  {topClients.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Top clients
                      </Typography>
                      
                      <Grid container spacing={1}>
                        {topClients.map((client, index) => {
                          const percentage = ((client.value / totalWorkHours) * 100).toFixed(0);
                          return (
                            <Grid item xs={12} key={client.name}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2" noWrap>
                                  {client.name}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {client.value.toFixed(1)}j ({percentage}%)
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={Number(percentage)} 
                                color={index === 0 ? "primary" : index === 1 ? "success" : "info"}
                                sx={{ height: 6, borderRadius: 1 }}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Diversification client
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2">
                        Indice de concentration: {diversificationIndex.toFixed(2)}
                      </Typography>
                      <MuiTooltip title="Mesure la répartition de votre activité entre différents clients. Plus l'indice est bas, plus votre activité est diversifiée.">
                        <Box component="span" sx={{ ml: 1, cursor: 'help', color: 'text.secondary', fontSize: '0.8rem' }}>
                          ⓘ
                        </Box>
                      </MuiTooltip>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        Niveau de diversification
                      </Typography>
                      <Chip 
                        label={diversificationText} 
                        size="small" 
                        color={
                          diversificationText === "Faible" ? "success" :
                          diversificationText === "Moyenne" ? "warning" :
                          "error"
                        }
                      />
                    </Box>
                  </Box>
                  
                  {radarData.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Visualisation répartition du volume de travail
                      </Typography>
                      
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart 
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          width={500}
                          height={300}
                          data={radarData}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis />
                          <Radar
                            name="Répartition du volume de travail"
                            dataKey="value"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </>
                  )}

                  {/* Code pour afficher les TJM par client */}
                  {topClients.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        TJM par client
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {clientRatesData.map((client) => (
                          <Chip 
                            key={client.name}
                            label={`${client.name}: ${client.rate}€`}
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* 3-4. Métriques financières et Productivité */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={3}>
                    {/* Métriques financières */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Métriques financières
                      </Typography>
                      
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          Moyenne du revenu quotidien
                        </Typography>
                        <Typography variant="h5" color="success.main">
                          {avgDailyRevenue.toLocaleString()} €
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Productivité et planification */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Productivité et planification
                      </Typography>
                      
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">
                            Taux de fragmentation client
                            <MuiTooltip title="Nombre moyen de clients différents par jour de travail. Un taux élevé indique un fort context switching.">
                              <Box component="span" sx={{ ml: 1, cursor: 'help', color: 'text.secondary', fontSize: '0.8rem' }}>
                                ⓘ
                              </Box>
                            </MuiTooltip>
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {avgClientsPerDay.toFixed(1)} clients/jour
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}
    </>
  );
} 