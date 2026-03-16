export type PetSize = 'Pequeno' | 'Médio' | 'Grande' | 'Gigante';

export type VaccineType = 'gripe' | 'v10' | 'raiva' | 'giardia';

export interface Vaccines {
  gripe: string | null;
  v10: string | null;
  raiva: string | null;
  giardia: string | null;
  antipulgas: string | null;
}

export interface VaccineRecord {
  id: string;
  type: VaccineType;
  date: string; // ISO
  notes?: string;
}

export interface FleaRecord {
  id: string;
  date: string; // ISO
  brand: string;
  durationMonths: 1 | 2 | 3 | 6;
  notes?: string;
}

export type PetGender = 'Macho' | 'Fêmea';

export type ClientPlan = 'Mensal' | 'Avulso' | 'Pacote' | '';
export type ClientStatus = 'Ativo' | 'Inativo' | '';

export interface Client {
  id: string;
  tutorName: string;
  tutorPhone: string;
  tutorEmail: string;
  tutorAddress: string;
  tutorNeighborhood: string;
  tutorCpf: string;
  name: string;
  breed: string;
  petSize?: PetSize;
  weight?: number;
  birthDate?: Date;
  photo?: string;
  gender?: PetGender;
  castrated?: boolean;
  entryDate: Date;
  vaccines: Vaccines;
  vaccineHistory: VaccineRecord[];
  fleaHistory: FleaRecord[];
  plano?: ClientPlan;
  valor?: number;
  status?: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const getProfileCompleteness = (client: Client): { percent: number; level: 'complete' | 'partial' | 'incomplete' } => {
  const fields = [
    !!client.tutorName,
    !!client.tutorPhone,
    !!client.tutorEmail,
    !!client.tutorCpf,
    !!client.tutorAddress,
    !!client.breed,
    !!client.petSize,
    !!client.weight,
    !!client.gender,
    client.castrated !== undefined && client.castrated !== null,
    !!client.birthDate,
    !!client.plano,
  ];
  const filled = fields.filter(Boolean).length;
  const percent = Math.round((filled / fields.length) * 100);
  if (percent >= 80) return { percent, level: 'complete' };
  if (percent >= 40) return { percent, level: 'partial' };
  return { percent, level: 'incomplete' };
};

export type BathServiceType = 'Banho' | 'Banho + Tosa' | 'Tosa Higiênica' | 'Hidratação' | 'Banho + Hidratação' | 'Banho + Tosa + Hidratação';
export type BathStatus = 'Agendado' | 'Em andamento' | 'Concluído' | 'Entregue';

export const BATH_SERVICE_PRICES: Record<BathServiceType, Record<PetSize, number>> = {
  'Banho': { 'Pequeno': 50, 'Médio': 70, 'Grande': 90, 'Gigante': 120 },
  'Banho + Tosa': { 'Pequeno': 80, 'Médio': 110, 'Grande': 140, 'Gigante': 180 },
  'Tosa Higiênica': { 'Pequeno': 40, 'Médio': 50, 'Grande': 60, 'Gigante': 80 },
  'Hidratação': { 'Pequeno': 30, 'Médio': 40, 'Grande': 50, 'Gigante': 60 },
  'Banho + Hidratação': { 'Pequeno': 70, 'Médio': 95, 'Grande': 120, 'Gigante': 150 },
  'Banho + Tosa + Hidratação': { 'Pequeno': 100, 'Médio': 135, 'Grande': 170, 'Gigante': 210 },
};

export const BATH_STATUS_COLORS: Record<BathStatus, string> = {
  'Agendado': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Em andamento': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Concluído': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Entregue': 'bg-muted text-muted-foreground',
};

export interface WalkInBath {
  id: string;
  tutorName: string;
  petName: string;
  breed: string;
  phone?: string;
  date: Date;
  scheduledTime?: string;
  price: number;
  serviceType: BathServiceType;
  petSize: PetSize;
  status: BathStatus;
  notes?: string;
  clientId?: string;
  createdAt: Date;
}

export const ANTIPULGAS_BRANDS = [
  'Nexgard',
  'Bravecto',
  'Simparic',
  'Frontline',
  'Revolution',
  'Credeli',
  'Advantage',
  'Seresto',
];

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

export const DEFAULT_VACCINES: Vaccines = {
  gripe: null,
  v10: null,
  raiva: null,
  giardia: null,
  antipulgas: null,
};

export const VACCINE_LABELS: Record<keyof Vaccines, string> = {
  gripe: 'Gripe',
  v10: 'V10',
  raiva: 'Raiva',
  giardia: 'Giárdia',
  antipulgas: 'Antipulgas',
};

export const VACCINE_TYPE_LABELS: Record<VaccineType, string> = {
  gripe: 'Gripe',
  v10: 'V10',
  raiva: 'Raiva',
  giardia: 'Giárdia',
};

export const formatVaccineDate = (date: string | null): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
};

// Vaccine expires after 1 year
export const getVaccineExpiryDate = (lastDate: string): Date => {
  const d = new Date(lastDate);
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

// Flea treatment expires after N months
export const getFleaExpiryDate = (lastDate: string, durationMonths: number): Date => {
  const d = new Date(lastDate);
  d.setMonth(d.getMonth() + durationMonths);
  return d;
};

export const isExpiringSoon = (expiryDate: Date, daysThreshold: number = 30): boolean => {
  const today = new Date();
  const diffMs = expiryDate.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= daysThreshold && diffDays >= 0;
};

export const isExpired = (expiryDate: Date): boolean => {
  return new Date() > expiryDate;
};

export interface HealthAlert {
  clientId: string;
  clientName: string;
  type: 'vaccine' | 'flea';
  itemName: string;
  expiryDate: Date;
  isExpired: boolean;
}

export const getHealthAlerts = (clients: Client[]): HealthAlert[] => {
  const alerts: HealthAlert[] = [];

  clients.forEach(client => {
    const vaccineKeys: VaccineType[] = ['gripe', 'v10', 'raiva', 'giardia'];
    vaccineKeys.forEach(key => {
      const lastDate = client.vaccines[key];
      if (lastDate) {
        const expiry = getVaccineExpiryDate(lastDate);
        if (isExpiringSoon(expiry, 30) || isExpired(expiry)) {
          alerts.push({
            clientId: client.id,
            clientName: client.name,
            type: 'vaccine',
            itemName: VACCINE_TYPE_LABELS[key],
            expiryDate: expiry,
            isExpired: isExpired(expiry),
          });
        }
      }
    });

    if (client.fleaHistory && client.fleaHistory.length > 0) {
      const lastFlea = client.fleaHistory[0];
      const expiry = getFleaExpiryDate(lastFlea.date, lastFlea.durationMonths);
      if (isExpiringSoon(expiry, 15) || isExpired(expiry)) {
        alerts.push({
          clientId: client.id,
          clientName: client.name,
          type: 'flea',
          itemName: `Antipulgas (${lastFlea.brand})`,
          expiryDate: expiry,
          isExpired: isExpired(expiry),
        });
      }
    } else if (client.vaccines.antipulgas) {
      const expiry = getFleaExpiryDate(client.vaccines.antipulgas, 1);
      if (isExpiringSoon(expiry, 15) || isExpired(expiry)) {
        alerts.push({
          clientId: client.id,
          clientName: client.name,
          type: 'flea',
          itemName: 'Antipulgas',
          expiryDate: expiry,
          isExpired: isExpired(expiry),
        });
      }
    }
  });

  alerts.sort((a, b) => {
    if (a.isExpired && !b.isExpired) return -1;
    if (!a.isExpired && b.isExpired) return 1;
    return a.expiryDate.getTime() - b.expiryDate.getTime();
  });

  return alerts;
};
