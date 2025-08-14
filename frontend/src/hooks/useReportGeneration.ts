import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import { PreviewData } from '../components/ReportGenerator';
import { Dayjs } from 'dayjs';

export interface ReportParams {
  from_date: string;
  to_date: string;
  client_filter: string[];
}

export interface ReportResponse {
  data: PreviewData[];
  format: 'json' | 'excel';
}

// Fonction pour générer un rapport (prévisualisation)
const generateReportPreview = async (params: ReportParams): Promise<PreviewData[]> => {
  const response = await axios.post(`${API_URL}/generate-report`, {
    ...params,
    format: 'json'
  });
  
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  throw new Error('Format de données invalide');
};

// Fonction pour télécharger un rapport Excel
const downloadReport = async (params: ReportParams): Promise<Blob> => {
  const response = await axios.post(`${API_URL}/generate-report`, {
    ...params,
    format: 'excel'
  }, {
    responseType: 'blob'
  });
  
  return response.data;
};

// Hook pour la génération de rapports avec React Query
export const useReportGeneration = () => {
  const queryClient = useQueryClient();

  // Mutation pour la prévisualisation
  const previewMutation = useMutation({
    mutationFn: generateReportPreview,
    onSuccess: () => {
      // Invalider le cache des rapports pour forcer la mise à jour
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
  });

  // Mutation pour le téléchargement
  const downloadMutation = useMutation({
    mutationFn: downloadReport,
    onSuccess: (blob) => {
      // Télécharger automatiquement le fichier
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'imputations.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  return {
    previewMutation,
    downloadMutation,
    isLoading: previewMutation.isPending || downloadMutation.isPending,
    error: previewMutation.error || downloadMutation.error,
  };
};

// Hook pour obtenir les données de prévisualisation avec cache
export const useReportPreview = (
  startDate: Dayjs | null,
  endDate: Dayjs | null,
  selectedClients: string[],
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['report', 'preview', startDate?.format('YYYY-MM-DD'), endDate?.format('YYYY-MM-DD'), selectedClients],
    queryFn: () => generateReportPreview({
      from_date: startDate!.format('YYYY-MM-DD'),
      to_date: endDate!.format('YYYY-MM-DD'),
      client_filter: selectedClients
    }),
    enabled: enabled && !!startDate && !!endDate && selectedClients.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - les rapports peuvent changer
    gcTime: 5 * 60 * 1000,    // 5 minutes en cache
  });
};

// Hook pour extraire les clients uniques des données de rapport
export const useUniqueClientsFromReport = (data: PreviewData[] | undefined) => {
  return useQuery({
    queryKey: ['uniqueClients', 'fromReport', data?.length],
    queryFn: () => {
      if (!data) return [];
      
      const clientSet = new Set<string>();
      
      data.forEach(item => {
        if (item.client && item.type === 'work') {
          const clients = item.client.split(" + ");
          clients.forEach(client => clientSet.add(client.trim()));
        }
      });
      
      return Array.from(clientSet).sort();
    },
    enabled: !!data && data.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes en cache
  });
};
