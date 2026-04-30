export interface PetTag {
  id: string;
  client_id: string;
  label: string;
  color: string;
  icon?: string | null;
  expires_at?: string | null;
  auto_kind?: 'new_pet' | null;
  created_by?: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export const TAG_COLORS = [
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Cinza', value: '#6b7280' },
];

/** Duration presets (in days). 0 = sem prazo */
export const TAG_DURATIONS = [
  { label: 'Sem prazo', days: 0 },
  { label: '1 semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: '1 mês', days: 30 },
  { label: '2 meses', days: 60 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
];

export const NEW_PET_DAYS = 60; // 2 months

export const isTagActive = (tag: PetTag): boolean => {
  if (!tag.expires_at) return true;
  return new Date(tag.expires_at).getTime() > Date.now();
};
