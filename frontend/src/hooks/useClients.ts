import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';

export interface Client {
  name: string;
  // Ajouter d'autres propriétés si nécessaire selon l'API
}

// Fonction pour récupérer les clients depuis l'API
const fetchClients = async (): Promise<Client[]> => {
  const response = await axios.get(`${API_URL}/clients`);
  if (Array.isArray(response.data)) {
    return response.data.map((client: any) => ({
      name: client.name,
      // Mapper d'autres propriétés si nécessaire
    }));
  }
  return [];
};

// Hook personnalisé pour gérer les clients avec React Query
export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 10 * 60 * 1000, // 10 minutes - les clients changent peu
    gcTime: 30 * 60 * 1000,    // 30 minutes en cache
    select: (data) => data.sort((a, b) => a.name.localeCompare(b.name)), // Tri automatique
  });
};

// Hook pour obtenir seulement les noms des clients
export const useClientNames = () => {
  const { data: clients, ...rest } = useClients();
  
  return {
    ...rest,
    clientNames: clients?.map(client => client.name) || [],
  };
};
