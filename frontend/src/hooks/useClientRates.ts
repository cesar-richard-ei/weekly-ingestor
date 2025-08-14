import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface ClientRate {
  clientName: string;
  rate: number;
}

const STORAGE_KEY = 'clientRates';

const getClientRatesFromStorage = (): ClientRate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export function useClientRates() {
  const [clientRates, setClientRates] = useState<ClientRate[]>(() => 
    getClientRatesFromStorage()
  );
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  
  const queryClient = useQueryClient();

  const getClientRate = useCallback((clientName: string): number => {
    const client = clientRates.find(c => c.clientName === clientName);
    return client ? client.rate : 0;
  }, [clientRates]);

  const setClientRate = useCallback((clientName: string, rate: number) => {
    setClientRates(prev => {
      const existing = prev.find(c => c.clientName === clientName);
      let newRates: ClientRate[];
      
      if (existing) {
        newRates = prev.map(c => 
          c.clientName === clientName ? { ...c, rate } : c
        );
      } else {
        newRates = [...prev, { clientName, rate }];
      }
      
      // Sauvegarder dans localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRates));
      
      // Invalider le cache des rapports pour forcer la mise à jour des stats
      queryClient.invalidateQueries({ queryKey: ['report'] });
      
      return newRates;
    });
    
    // Forcer la mise à jour des composants qui utilisent ce hook
    setLastUpdate(Date.now());
  }, [queryClient]);

  const removeClientRate = useCallback((clientName: string) => {
    setClientRates(prev => {
      const newRates = prev.filter(c => c.clientName !== clientName);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRates));
      
      // Invalider le cache des rapports
      queryClient.invalidateQueries({ queryKey: ['report'] });
      
      return newRates;
    });
    
    // Forcer la mise à jour des composants qui utilisent ce hook
    setLastUpdate(Date.now());
  }, [queryClient]);

  // Optimisation : mémoriser les clients avec leurs TJM
  const clientsWithRates = useMemo(() => {
    return clientRates.reduce((acc, client) => {
      acc[client.clientName] = client.rate;
      return acc;
    }, {} as Record<string, number>);
  }, [clientRates]);

  return {
    clientRates,
    getClientRate,
    setClientRate,
    removeClientRate,
    clientsWithRates,
    lastUpdate, // Exposer le timestamp pour forcer les re-renders
  };
} 