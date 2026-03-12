import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Client, VaccineType, DEFAULT_VACCINES, Vaccines, FleaRecord, VaccineRecord, PetGender } from '@/types/client';
import { mockClients } from '@/data/mockClients';

const STORAGE_KEY = 'pet-grooming-clients';
const DATA_VERSION_KEY = 'pet-grooming-data-version';
const CURRENT_DATA_VERSION = '2';

interface ClientContextType {
  clients: Client[];
  addClient: (data: {
    tutorName: string;
    tutorPhone?: string;
    tutorEmail?: string;
    tutorAddress?: string;
    tutorNeighborhood?: string;
    tutorCpf?: string;
    name: string;
    breed: string;
    petSize?: Client['petSize'];
    photo?: string;
    vaccines?: Vaccines;
    entryDate?: Date;
    birthDate?: Date;
    gender?: PetGender;
    castrated?: boolean;
  }) => void;
  importClients: (newClients: Array<{
    tutorName?: string;
    name: string;
    breed?: string;
    petSize?: Client['petSize'];
    photo?: string;
  }>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  addVaccineRecord: (clientId: string, type: VaccineType, date: string, notes?: string) => void;
  deleteVaccineRecord: (clientId: string, recordId: string) => void;
  addFleaRecord: (clientId: string, date: string, brand: string, durationMonths: 1 | 2 | 3 | 6, notes?: string) => void;
  deleteFleaRecord: (clientId: string, recordId: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const migrateVaccines = (vaccines: any): Vaccines => {
  if (!vaccines) return { ...DEFAULT_VACCINES };
  const result: any = {};
  for (const key of ['gripe', 'v10', 'raiva', 'giardia', 'antipulgas']) {
    const val = vaccines[key];
    if (val === true) result[key] = new Date().toISOString();
    else if (val === false || val === undefined || val === null) result[key] = null;
    else result[key] = val;
  }
  return result as Vaccines;
};

const parseClientDates = (client: any): Client => ({
  ...client,
  entryDate: client.entryDate ? new Date(client.entryDate) : new Date(),
  birthDate: client.birthDate ? new Date(client.birthDate) : undefined,
  weight: client.weight,
  gender: client.gender,
  castrated: client.castrated ?? false,
  createdAt: new Date(client.createdAt),
  updatedAt: new Date(client.updatedAt),
  tutorName: client.tutorName || '',
  tutorPhone: client.tutorPhone || '',
  tutorEmail: client.tutorEmail || '',
  tutorAddress: client.tutorAddress || '',
  tutorNeighborhood: client.tutorNeighborhood || '',
  tutorCpf: client.tutorCpf || '',
  breed: client.breed || '',
  vaccines: migrateVaccines(client.vaccines),
  vaccineHistory: (client.vaccineHistory || []),
  fleaHistory: (client.fleaHistory || []),
});

const loadClients = (): Client[] => {
  try {
    const version = localStorage.getItem(DATA_VERSION_KEY);
    if (version !== CURRENT_DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
      return mockClients;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map(parseClientDates);
    }
  } catch (error) {
    console.error('Error loading clients from localStorage:', error);
  }
  return mockClients;
};

const saveClients = (clients: Client[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch (error) {
    console.error('Error saving clients to localStorage:', error);
  }
};

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => loadClients());

  useEffect(() => {
    saveClients(clients);
  }, [clients]);

  const addClient = useCallback((data: {
    tutorName: string;
    tutorPhone?: string;
    tutorEmail?: string;
    tutorAddress?: string;
    tutorNeighborhood?: string;
    tutorCpf?: string;
    name: string;
    breed: string;
    petSize?: Client['petSize'];
    photo?: string;
    vaccines?: Vaccines;
    entryDate?: Date;
    birthDate?: Date;
    gender?: PetGender;
    castrated?: boolean;
  }) => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      tutorName: data.tutorName,
      tutorPhone: data.tutorPhone || '',
      tutorEmail: data.tutorEmail || '',
      tutorAddress: data.tutorAddress || '',
      tutorNeighborhood: data.tutorNeighborhood || '',
      tutorCpf: data.tutorCpf || '',
      name: data.name,
      breed: data.breed,
      petSize: data.petSize,
      birthDate: data.birthDate,
      photo: data.photo,
      gender: data.gender,
      castrated: data.castrated ?? false,
      entryDate: data.entryDate || new Date(),
      vaccines: data.vaccines || { ...DEFAULT_VACCINES },
      vaccineHistory: [],
      fleaHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setClients(prev => [...prev, newClient]);
  }, []);

  const importClients = useCallback((newClients: Array<{
    tutorName?: string;
    name: string;
    breed?: string;
    petSize?: Client['petSize'];
    photo?: string;
  }>) => {
    const clientsToAdd: Client[] = newClients.map(c => ({
      id: crypto.randomUUID(),
      tutorName: c.tutorName || '',
      tutorPhone: '',
      tutorEmail: '',
      tutorAddress: '',
      tutorNeighborhood: '',
      tutorCpf: '',
      name: c.name,
      breed: c.breed || '',
      petSize: c.petSize,
      photo: c.photo,
      entryDate: new Date(),
      vaccines: { ...DEFAULT_VACCINES },
      vaccineHistory: [],
      fleaHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setClients(prev => [...prev, ...clientsToAdd]);
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(client =>
        client.id === id
          ? { ...client, ...updates, updatedAt: new Date() }
          : client
      )
    );
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(client => client.id !== id));
  }, []);

  const addVaccineRecord = useCallback((clientId: string, type: VaccineType, date: string, notes?: string) => {
    setClients(prev =>
      prev.map(client => {
        if (client.id !== clientId) return client;
        const record: VaccineRecord = { id: crypto.randomUUID(), type, date, notes };
        return {
          ...client,
          vaccines: { ...client.vaccines, [type]: date },
          vaccineHistory: [record, ...(client.vaccineHistory || [])],
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  const addFleaRecord = useCallback((clientId: string, date: string, brand: string, durationMonths: 1 | 2 | 3 | 6, notes?: string) => {
    setClients(prev =>
      prev.map(client => {
        if (client.id !== clientId) return client;
        const record: FleaRecord = { id: crypto.randomUUID(), date, brand, durationMonths, notes };
        return {
          ...client,
          vaccines: { ...client.vaccines, antipulgas: date },
          fleaHistory: [record, ...(client.fleaHistory || [])],
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  const deleteVaccineRecord = useCallback((clientId: string, recordId: string) => {
    setClients(prev =>
      prev.map(client => {
        if (client.id !== clientId) return client;
        const newHistory = (client.vaccineHistory || []).filter(r => r.id !== recordId);
        const deleted = (client.vaccineHistory || []).find(r => r.id === recordId);
        let newVaccines = { ...client.vaccines };
        if (deleted) {
          const latestOfType = newHistory.filter(r => r.type === deleted.type).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          newVaccines = { ...newVaccines, [deleted.type]: latestOfType ? latestOfType.date : null };
        }
        return { ...client, vaccines: newVaccines, vaccineHistory: newHistory, updatedAt: new Date() };
      })
    );
  }, []);

  const deleteFleaRecord = useCallback((clientId: string, recordId: string) => {
    setClients(prev =>
      prev.map(client => {
        if (client.id !== clientId) return client;
        const newHistory = (client.fleaHistory || []).filter(r => r.id !== recordId);
        const latestFlea = newHistory.length > 0 ? newHistory[0] : null;
        return {
          ...client,
          vaccines: { ...client.vaccines, antipulgas: latestFlea ? latestFlea.date : null },
          fleaHistory: newHistory,
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  const getClientById = useCallback((id: string) => {
    return clients.find(client => client.id === id);
  }, [clients]);

  return (
    <ClientContext.Provider
      value={{
        clients,
        addClient,
        importClients,
        updateClient,
        deleteClient,
        getClientById,
        addVaccineRecord,
        deleteVaccineRecord,
        addFleaRecord,
        deleteFleaRecord,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
};
