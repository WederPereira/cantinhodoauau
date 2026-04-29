export type PlanType = 'mensal' | 'trimestral' | 'semestral' | 'anual';
export type DiscountType = 'normal';
export type ContractStatus = 'pendente' | 'ativo' | 'cancelado' | 'concluido';

/** Cancellation fee percent options selectable on contract creation */
export type CancellationFeePercent = 0 | 15 | 30;

/** Standard payment methods */
export const PAYMENT_METHODS = [
  'Pix',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Transferência',
  'Outros',
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export interface ContractPlan {
  id: string;
  plan_type: PlanType;
  frequency_per_week: number;
  base_monthly_value: number;
  active: boolean;
  notes: string;
}

/** Pet entry stored in contract (snapshot of pet data) */
export interface ContractPet {
  client_id: string;
  name: string;
  breed: string;
  petSize?: string;
  birthDate?: string | null;
  gender?: string;
  castrated?: boolean;
}

export interface Contract {
  id: string;
  client_id: string;
  client_snapshot: Record<string, any> & {
    /** Optional: list of additional pets included in the same contract */
    pets?: ContractPet[];
  };
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
  /** % chosen at contract creation (0, 15 or 30). Stored on cancellation_fee at cancel time */
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
  normal: 'Normal',
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

export const suggestDiscount = (_plan: PlanType): DiscountType => 'normal';
export const getDiscountPercent = (_type: DiscountType, _custom = 0): number => 0;

/** Calculates contract values (no automatic discount applied) */
export const calcContract = (basePerMonth: number, plan: PlanType, _discountPercent = 0) => {
  const months = PLAN_MONTHS[plan];
  const final_monthly_value = basePerMonth;
  const total_contract_value = final_monthly_value * months;
  return {
    final_monthly_value: Math.round(final_monthly_value * 100) / 100,
    total_contract_value: Math.round(total_contract_value * 100) / 100,
  };
};

/**
 * Cancellation fee uses the percent stored in `discount_percent` field of the contract
 * (we reuse this column to hold the chosen 0/15/30 cancellation fee policy).
 * Calculated over the value not yet used (remaining months × monthly value).
 */
export const calcCancellationFee = (contract: Contract, cancellationDate: Date = new Date()): number => {
  const feePercent = Number(contract.discount_percent) || 0;
  if (!feePercent) return 0;
  const start = new Date(contract.start_date);
  const totalMonths = PLAN_MONTHS[contract.plan_type];
  const elapsedMs = Math.max(0, cancellationDate.getTime() - start.getTime());
  const elapsedMonths = elapsedMs / (1000 * 60 * 60 * 24 * 30);
  const remaining = Math.max(0, totalMonths - elapsedMonths);
  const remainingValue = remaining * Number(contract.final_monthly_value || 0);
  return Math.round(remainingValue * (feePercent / 100) * 100) / 100;
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
