import { useState, useEffect } from 'react';

// Interface pour les TJM des clients
export interface ClientRate {
  clientName: string;
  rate: number;
}

const LOCAL_STORAGE_KEY = 'client_daily_rates';

// Helper pour récupérer les données du localStorage
const getClientRatesFromStorage = (): ClientRate[] => {
  const savedRates = localStorage.getItem(LOCAL_STORAGE_KEY);
  return savedRates ? JSON.parse(savedRates) : [];
};

// Hook personnalisé pour gérer les TJM des clients
export function useClientRates() {
  // Initialiser l'état avec les valeurs du localStorage ou un tableau vide
  const [clientRates, setClientRates] = useState<ClientRate[]>(getClientRatesFromStorage);

  // Persister les changements dans le localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientRates));
  }, [clientRates]);

  // Fonction pour obtenir le TJM d'un client spécifique
  const getClientRate = (clientName: string): number => {
    // Recharger depuis le localStorage pour avoir les valeurs les plus récentes
    const freshRates = getClientRatesFromStorage();
    const clientRate = freshRates.find(rate => rate.clientName === clientName);
    return clientRate ? clientRate.rate : 0; // TJM par défaut de 0€
  };

  // Fonction pour définir ou mettre à jour le TJM d'un client
  const setClientRate = (clientName: string, rate: number) => {
    const newRates = [...getClientRatesFromStorage()]; // Recharger les données avant la mise à jour
    const clientIndex = newRates.findIndex(r => r.clientName === clientName);
    
    if (clientIndex >= 0) {
      // Mettre à jour un TJM existant
      newRates[clientIndex] = { clientName, rate };
    } else {
      // Ajouter un nouveau TJM
      newRates.push({ clientName, rate });
    }
    
    // Mettre à jour le localStorage directement
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newRates));
    // Mettre à jour l'état local
    setClientRates(newRates);
  };

  // Fonction pour supprimer le TJM d'un client
  const removeClientRate = (clientName: string) => {
    const newRates = getClientRatesFromStorage().filter(rate => rate.clientName !== clientName);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newRates));
    setClientRates(newRates);
  };

  return {
    clientRates,
    getClientRate,
    setClientRate,
    removeClientRate
  };
} 