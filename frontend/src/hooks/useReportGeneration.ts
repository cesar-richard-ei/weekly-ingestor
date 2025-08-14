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

// === NOUVEAU : INTERFACES POUR L'ANALYSE INTELLIGENTE ===

export interface DataAnalysisRequest {
  from_date: string;
  to_date: string;
  client_filter: string[];
}

export interface Anomaly {
  type: 'heures_impossibles' | 'heures_negatives' | 'sous_activite' | 'sur_activite' | 'jour_vide';
  severity: 'error' | 'warning' | 'info';
  date: string;
  message: string;
  details: any;
}

export interface Incoherence {
  type: 'off_avec_notes' | 'demi_journee_sans_off';
  date: string;
  client: string;
  message: string;
  details: any;
}

export interface Gap {
  debut: string;
  fin: string;
  duree: number;
  message: string;
}

export interface WeeklyPattern {
  moyenne: number;
  min: number;
  max: number;
  nb_jours: number;
}

export interface DataAnalysisResult {
  summary: {
    periode: {
      debut: string;
      fin: string;
      nb_jours: number;
    };
    activite: {
      jours_avec_activite: number;
      jours_vides: number;
      moyenne_heures_jour: number;
      ecart_type: number;
      total_heures: number;
    };
    anomalies: {
      total: number;
      par_severite: {
        error: number;
        warning: number;
        info: number;
      };
    };
  };
  anomalies: Anomaly[];
  incoherences: Incoherence[];
  gaps: Gap[];
  statistiques: {
    pattern_hebdomadaire: Record<string, WeeklyPattern>;
    distribution_quotidienne: {
      moyenne: number;
      ecart_type: number;
      seuils: {
        bas: number;
        haut: number;
      };
    };
  };
  donnees_jour: Record<string, any>;
}

export interface LLMInsight {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  confidence: number;
}

export interface LLMAnalysisResponse {
  summary: string;
  insights: LLMInsight[];
  business_recommendations: string[];
  coherence_score: number;
  risk_alerts: string[];
}

export interface LLMAnalysisRequest {
  from_date: string;
  to_date: string;
  client_filter?: string[];
  analysis_data: DataAnalysisResult;
}

// === FONCTIONS EXISTANTES ===

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

// === NOUVELLE FONCTION : ANALYSE INTELLIGENTE ===

const analyzeData = async (params: DataAnalysisRequest): Promise<DataAnalysisResult> => {
  const response = await axios.post(`${API_URL}/analyze-data`, params);
  return response.data;
};

const analyzeWithLLM = async (request: LLMAnalysisRequest): Promise<LLMAnalysisResponse> => {
  const response = await axios.post(`${API_URL}/analyze-with-llm`, request);
  return response.data;
};

// === HOOKS EXISTANTS ===

// Hook pour la génération de rapports avec React Query
export const useReportGeneration = () => {
  const queryClient = useQueryClient();

  // Mutation pour la prévisualisation
  const previewMutation = useMutation({
    mutationFn: generateReportPreview,
    onSuccess: () => {
      // Invalider le cache des rapports pour force la mise à jour
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

// === NOUVEAU HOOK : ANALYSE INTELLIGENTE ===

export const useDataAnalysis = (
  startDate: Dayjs | null,
  endDate: Dayjs | null,
  selectedClients: string[],
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['data-analysis', startDate?.format('YYYY-MM-DD'), endDate?.format('YYYY-MM-DD'), selectedClients],
    queryFn: () => analyzeData({
      from_date: startDate!.format('YYYY-MM-DD'),
      to_date: endDate!.format('YYYY-MM-DD'),
      client_filter: selectedClients
    }),
    enabled: enabled && !!startDate && !!endDate && selectedClients.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - l'analyse change peu
    gcTime: 10 * 60 * 1000,   // 10 minutes en cache
  });
};

export const useLLMAnalysis = (request: LLMAnalysisRequest | null) => {
  return useQuery({
    queryKey: ['llm-analysis', request],
    queryFn: () => analyzeWithLLM(request!),
    enabled: !!request,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
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
