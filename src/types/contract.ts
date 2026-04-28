export type PlanType = 'mensal' | 'trimestral' | 'semestral' | 'anual';
export type DiscountType = 'normal';
export type ContractStatus = 'pendente' | 'ativo' | 'cancelado' | 'concluido';

export interface ContractPlan {
  id: string;
  plan_type: PlanType;
  frequency_per_week: number;
  base_monthly_value: number;
  active: boolean;
  notes: string;
}

export interface Contract {
  id: string;
  client_id: string;
  client_snapshot: Record<string, any>;
  plan_type: PlanType;
  frequency_per_week: number;
  base_monthly_value: number;
  discount_type: DiscountType;
  discount_percent: number;
  final_monthly_value: number;
  total_contract_value: number;
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  payment_method: string;
  observations: string;
  missing_fields: string[];
  cancelled_at: string | null;
  cancellation_fee: number | null;
  pdf_url: string | null;
  docx_url: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

export const PLAN_MONTHS: Record<PlanType, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const DISCOUNT_LABELS: Record<DiscountType, string> = {
  normal: 'Normal (sem desconto)',
  desc15: 'Desconto 15%',
  desc30: 'Desconto 30%',
  custom: 'Personalizado',
};

export const STATUS_LABELS: Record<ContractStatus, string> = {
  pendente: 'Pendente',
  ativo: 'Ativo',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
};

export const STATUS_COLORS: Record<ContractStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ativo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  concluido: 'bg-muted text-muted-foreground',
};

/** Suggests discount based on plan length */
export const suggestDiscount = (plan: PlanType): DiscountType => {
  if (plan === 'anual') return 'desc30';
  if (plan === 'semestral') return 'desc15';
  return 'normal';
};

export const getDiscountPercent = (type: DiscountType, custom = 0): number => {
  switch (type) {
    case 'desc15': return 15;
    case 'desc30': return 30;
    case 'custom': return custom;
    default: return 0;
  }
};

/** Calculates contract values */
export const calcContract = (basePerMonth: number, plan: PlanType, discountPercent: number) => {
  const months = PLAN_MONTHS[plan];
  const final_monthly_value = basePerMonth * (1 - discountPercent / 100);
  const total_contract_value = final_monthly_value * months;
  return {
    final_monthly_value: Math.round(final_monthly_value * 100) / 100,
    total_contract_value: Math.round(total_contract_value * 100) / 100,
  };
};

/**
 * Cancellation fee = 30% of remaining (unused) value of the contract
 * Based on Cláusula Vigésima Segunda
 */
export const calcCancellationFee = (contract: Contract, cancellationDate: Date = new Date()): number => {
  const start = new Date(contract.start_date);
  const totalMonths = PLAN_MONTHS[contract.plan_type];
  const monthsElapsed = Math.max(0, Math.min(totalMonths,
    (cancellationDate.getFullYear() - start.getFullYear()) * 12 +
    (cancellationDate.getMonth() - start.getMonth())
  ));
  const monthsRemaining = Math.max(0, totalMonths - monthsElapsed);
  const remainingValue = monthsRemaining * contract.final_monthly_value;
  return Math.round(remainingValue * 0.3 * 100) / 100;
};

/** Required client fields to fill the contract */
export const CONTRACT_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: 'tutorName', label: 'Nome completo do tutor' },
  { key: 'tutorCpf', label: 'CPF do tutor' },
  { key: 'tutorAddress', label: 'Endereço completo' },
  { key: 'tutorPhone', label: 'Telefone' },
  { key: 'name', label: 'Nome do pet' },
  { key: 'breed', label: 'Raça' },
  { key: 'birthDate', label: 'Data de nascimento do pet' },
  { key: 'petSize', label: 'Porte' },
];

export const getMissingClientFields = (client: any): { key: string; label: string }[] => {
  return CONTRACT_REQUIRED_FIELDS.filter(f => {
    const v = client?.[f.key];
    return v === null || v === undefined || v === '';
  });
};

export const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
