import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Client, VaccineType, DEFAULT_VACCINES, Vaccines, FleaRecord, VaccineRecord, PetGender, FleaType } from '@/types/client';
import { logAction } from '@/hooks/useActionLog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientContextType {
  clients: Client[];
  loading: boolean;
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
  }) => Promise<void>;
  importClients: (newClients: Array<{
    tutorName?: string;
    name: string;
    breed?: string;
    petSize?: Client['petSize'];
    photo?: string;
  }>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  addVaccineRecord: (clientId: string, type: VaccineType, date: string, notes?: string) => Promise<void>;
  deleteVaccineRecord: (clientId: string, recordId: string) => Promise<void>;
  addFleaRecord: (clientId: string, date: string, brand: string, durationMonths: 1 | 2 | 3 | 6 | 35, notes?: string, fleaType?: FleaType) => Promise<void>;
  deleteFleaRecord: (clientId: string, recordId: string) => Promise<void>;
  refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

// Convert DB row to Client type
const dbRowToClient = (row: any, vaccineRecords: any[] = [], fleaRecords: any[] = []): Client => ({
  id: row.id,
  tutorName: row.tutor_name || '',
  tutorPhone: row.tutor_phone || '',
  tutorEmail: row.tutor_email || '',
  tutorAddress: row.tutor_address || '',
  tutorNeighborhood: row.tutor_neighborhood || '',
  tutorCpf: row.tutor_cpf || '',
  name: row.name,
  breed: row.breed || '',
  petSize: row.pet_size as Client['petSize'],
  weight: row.weight ? Number(row.weight) : undefined,
  birthDate: row.birth_date ? new Date(row.birth_date) : undefined,
  photo: row.photo || undefined,
  gender: row.gender as PetGender | undefined,
  castrated: row.castrated ?? false,
  healthRestrictions: row.health_restrictions || '',
  entryDate: new Date(row.entry_date),
  vaccines: (row.vaccines as Vaccines) || { ...DEFAULT_VACCINES },
  vaccineHistory: vaccineRecords
    .filter(r => r.client_id === row.id)
    .map(r => ({ id: r.id, type: r.type as VaccineType, date: r.date, notes: r.notes || undefined })),
  fleaHistory: fleaRecords
    .filter(r => r.client_id === row.id)
    .map(r => ({ id: r.id, date: r.date, brand: r.brand, durationMonths: r.duration_months as 1 | 2 | 3 | 6 | 35, fleaType: (r.flea_type || 'fixo') as FleaType, notes: r.notes || undefined })),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      const [clientsRes, vaccinesRes, fleasRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('vaccine_records').select('*').order('created_at', { ascending: false }),
        supabase.from('flea_records').select('*').order('created_at', { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;

      const vaccineRecords = vaccinesRes.data || [];
      const fleaRecords = fleasRes.data || [];

      const mapped = (clientsRes.data || []).map(row => dbRowToClient(row, vaccineRecords, fleaRecords));
      setClients(mapped);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchClients();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchClients]);

  const addClient = useCallback(async (data: {
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
    const { data: inserted, error } = await supabase.from('clients').insert({
      tutor_name: data.tutorName,
      tutor_phone: data.tutorPhone || '',
      tutor_email: data.tutorEmail || '',
      tutor_address: data.tutorAddress || '',
      tutor_neighborhood: data.tutorNeighborhood || '',
      tutor_cpf: data.tutorCpf || '',
      name: data.name,
      breed: data.breed,
      pet_size: data.petSize || null,
      photo: data.photo || null,
      vaccines: (data.vaccines || DEFAULT_VACCINES) as any,
      entry_date: (data.entryDate || new Date()).toISOString(),
      birth_date: data.birthDate?.toISOString() || null,
      gender: data.gender || null,
      castrated: data.castrated ?? false,
    }).select().single();

    if (error) { console.error('Error adding client:', error); return; }
    logAction('add_client', 'client', inserted.id, { dog_name: data.name, tutor_name: data.tutorName });
    await fetchClients();
  }, [fetchClients]);

  const importClients = useCallback(async (newClients: Array<{
    tutorName?: string;
    tutorPhone?: string;
    tutorEmail?: string;
    tutorAddress?: string;
    tutorNeighborhood?: string;
    tutorCpf?: string;
    name: string;
    breed?: string;
    petSize?: Client['petSize'];
    photo?: string;
    gender?: PetGender;
    castrated?: boolean;
    birthDate?: Date;
    entryDate?: Date;
    weight?: number;
    vaccines?: Vaccines;
  }>) => {
    const rows = newClients.map(c => ({
      tutor_name: c.tutorName || '',
      tutor_phone: c.tutorPhone || '',
      tutor_email: c.tutorEmail || '',
      tutor_address: c.tutorAddress || '',
      tutor_neighborhood: c.tutorNeighborhood || '',
      tutor_cpf: c.tutorCpf || '',
      name: c.name,
      breed: c.breed || '',
      pet_size: c.petSize || null,
      photo: c.photo || null,
      gender: c.gender || null,
      castrated: c.castrated ?? false,
      birth_date: c.birthDate?.toISOString() || null,
      entry_date: c.entryDate?.toISOString() || null,
      weight: c.weight || null,
      vaccines: (c.vaccines || DEFAULT_VACCINES) as any,
    }));

    const { error } = await supabase.from('clients').insert(rows);
    if (error) { console.error('Error importing clients:', error); return; }
    await fetchClients();
  }, [fetchClients]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.tutorName !== undefined) dbUpdates.tutor_name = updates.tutorName;
    if (updates.tutorPhone !== undefined) dbUpdates.tutor_phone = updates.tutorPhone;
    if (updates.tutorEmail !== undefined) dbUpdates.tutor_email = updates.tutorEmail;
    if (updates.tutorAddress !== undefined) dbUpdates.tutor_address = updates.tutorAddress;
    if (updates.tutorNeighborhood !== undefined) dbUpdates.tutor_neighborhood = updates.tutorNeighborhood;
    if (updates.tutorCpf !== undefined) dbUpdates.tutor_cpf = updates.tutorCpf;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.breed !== undefined) dbUpdates.breed = updates.breed;
    if (updates.petSize !== undefined) dbUpdates.pet_size = updates.petSize;
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate ? new Date(updates.birthDate).toISOString() : null;
    if (updates.photo !== undefined) dbUpdates.photo = updates.photo || null;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.castrated !== undefined) dbUpdates.castrated = updates.castrated;
    if (updates.entryDate !== undefined) dbUpdates.entry_date = new Date(updates.entryDate).toISOString();
    if (updates.vaccines !== undefined) dbUpdates.vaccines = updates.vaccines as any;
    if (updates.healthRestrictions !== undefined) dbUpdates.health_restrictions = updates.healthRestrictions;

    const client = clients.find(c => c.id === id);
    const { error } = await supabase.from('clients').update(dbUpdates).eq('id', id);
    if (error) { console.error('Error updating client:', error); return; }
    if (client) {
      // Store previous values for undo
      const prevData: Record<string, any> = { dog_name: client.name, tutor_name: client.tutorName };
      if (updates.name !== undefined) prevData.prev_name = client.name;
      if (updates.breed !== undefined) prevData.prev_breed = client.breed;
      if (updates.tutorName !== undefined) prevData.prev_tutor_name = client.tutorName;
      if (updates.tutorPhone !== undefined) prevData.prev_tutor_phone = client.tutorPhone;
      if (updates.tutorEmail !== undefined) prevData.prev_tutor_email = client.tutorEmail;
      if (updates.tutorAddress !== undefined) prevData.prev_tutor_address = client.tutorAddress;
      if (updates.tutorNeighborhood !== undefined) prevData.prev_tutor_neighborhood = client.tutorNeighborhood;
      if (updates.tutorCpf !== undefined) prevData.prev_tutor_cpf = client.tutorCpf;
      if (updates.petSize !== undefined) prevData.prev_pet_size = client.petSize;
      if (updates.weight !== undefined) prevData.prev_weight = client.weight;
      if (updates.birthDate !== undefined) prevData.prev_birth_date = client.birthDate;
      if (updates.photo !== undefined) prevData.prev_photo = client.photo;
      if (updates.gender !== undefined) prevData.prev_gender = client.gender;
      if (updates.castrated !== undefined) prevData.prev_castrated = client.castrated;
      if (updates.vaccines !== undefined) prevData.prev_vaccines = client.vaccines;
      if (updates.healthRestrictions !== undefined) prevData.prev_health_restrictions = client.healthRestrictions;
      prevData.updated_fields = Object.keys(updates);
      logAction('edit_client', 'client', id, prevData);
    }
    await fetchClients();
  }, [clients, fetchClients]);

  const deleteClient = useCallback(async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      // Store full client data for undo
      logAction('delete_client', 'client', id, {
        dog_name: client.name, tutor_name: client.tutorName,
        full_client: {
          name: client.name, breed: client.breed, tutor_name: client.tutorName,
          tutor_phone: client.tutorPhone, tutor_email: client.tutorEmail,
          tutor_address: client.tutorAddress, tutor_neighborhood: client.tutorNeighborhood,
          tutor_cpf: client.tutorCpf, pet_size: client.petSize, weight: client.weight,
          birth_date: client.birthDate ? new Date(client.birthDate).toISOString() : null,
          photo: client.photo, gender: client.gender, castrated: client.castrated,
          vaccines: client.vaccines, health_restrictions: client.healthRestrictions,
          entry_date: client.entryDate ? new Date(client.entryDate).toISOString() : null,
        }
      });
    }
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error('Error deleting client:', error); return; }
    await fetchClients();
  }, [clients, fetchClients]);

  const addVaccineRecord = useCallback(async (clientId: string, type: VaccineType, date: string, notes?: string) => {
    // Insert record
    const { error: recError } = await supabase.from('vaccine_records').insert({
      client_id: clientId,
      type,
      date,
      notes: notes || null,
    });
    if (recError) { console.error('Error adding vaccine record:', recError); return; }
    const client = clients.find(c => c.id === clientId);
    logAction('add_vaccine', 'vaccine', clientId, { dog_name: client?.name, tutor_name: client?.tutorName, vaccine_type: type, date, notes });

    // Update client vaccines JSON
    if (client) {
      const updatedVaccines = { ...client.vaccines, [type]: date };
      await supabase.from('clients').update({ vaccines: updatedVaccines as any, updated_at: new Date().toISOString() }).eq('id', clientId);
    }
    await fetchClients();
  }, [clients, fetchClients]);

  const deleteVaccineRecord = useCallback(async (clientId: string, recordId: string) => {
    const client = clients.find(c => c.id === clientId);
    const deleted = client?.vaccineHistory?.find(r => r.id === recordId);

    if (deleted) {
      logAction('delete_vaccine', 'vaccine', recordId, {
        dog_name: client?.name, tutor_name: client?.tutorName, client_id: clientId,
        vaccine_type: deleted.type, date: deleted.date, notes: deleted.notes
      });
    }

    const { error } = await supabase.from('vaccine_records').delete().eq('id', recordId);
    if (error) { console.error('Error deleting vaccine record:', error); return; }

    // Update client vaccines to latest remaining
    if (client && deleted) {
      const remaining = (client.vaccineHistory || []).filter(r => r.id !== recordId);
      const latestOfType = remaining.filter(r => r.type === deleted.type).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const updatedVaccines = { ...client.vaccines, [deleted.type]: latestOfType ? latestOfType.date : null };
      await supabase.from('clients').update({ vaccines: updatedVaccines as any, updated_at: new Date().toISOString() }).eq('id', clientId);
    }
    await fetchClients();
  }, [clients, fetchClients]);

  const addFleaRecord = useCallback(async (clientId: string, date: string, brand: string, durationMonths: 1 | 2 | 3 | 6 | 35, notes?: string, fleaType?: FleaType) => {
    const { error } = await supabase.from('flea_records').insert({
      client_id: clientId,
      date,
      brand,
      duration_months: durationMonths,
      notes: notes || null,
      flea_type: fleaType || 'fixo',
    } as any);
    if (error) { console.error('Error adding flea record:', error); return; }
    const client = clients.find(c => c.id === clientId);
    logAction('add_flea', 'flea', clientId, { dog_name: client?.name, tutor_name: client?.tutorName, date, brand, duration_months: durationMonths, flea_type: fleaType || 'fixo', notes });

    // Update client vaccines.antipulgas
    if (client) {
      const updatedVaccines = { ...client.vaccines, antipulgas: date };
      await supabase.from('clients').update({ vaccines: updatedVaccines as any, updated_at: new Date().toISOString() }).eq('id', clientId);
    }
    await fetchClients();
  }, [clients, fetchClients]);

  const deleteFleaRecord = useCallback(async (clientId: string, recordId: string) => {
    const client = clients.find(c => c.id === clientId);
    const deleted = client?.fleaHistory?.find(r => r.id === recordId);
    if (deleted) {
      logAction('delete_flea', 'flea', recordId, {
        dog_name: client?.name, tutor_name: client?.tutorName, client_id: clientId,
        date: deleted.date, brand: deleted.brand, duration_months: deleted.durationMonths, notes: deleted.notes
      });
    }

    const { error } = await supabase.from('flea_records').delete().eq('id', recordId);
    if (error) { console.error('Error deleting flea record:', error); return; }

    // Update client vaccines.antipulgas to latest remaining
    if (client) {
      const remaining = (client.fleaHistory || []).filter(r => r.id !== recordId);
      const latestFlea = remaining.length > 0 ? remaining[0] : null;
      const updatedVaccines = { ...client.vaccines, antipulgas: latestFlea ? latestFlea.date : null };
      await supabase.from('clients').update({ vaccines: updatedVaccines as any, updated_at: new Date().toISOString() }).eq('id', clientId);
    }
    await fetchClients();
  }, [clients, fetchClients]);

  const getClientById = useCallback((id: string) => {
    return clients.find(client => client.id === id);
  }, [clients]);

  const refreshClients = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  return (
    <ClientContext.Provider
      value={{
        clients,
        loading,
        addClient,
        importClients,
        updateClient,
        deleteClient,
        getClientById,
        addVaccineRecord,
        deleteVaccineRecord,
        addFleaRecord,
        deleteFleaRecord,
        refreshClients,
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
