import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { useContracts } from '@/hooks/useContracts';
import { useClients } from '@/context/ClientContext';
import {
  PlanType, PLAN_TYPE_LABELS, PLAN_MONTHS,
  calcContract, getMissingClientFields, formatBRL,
  PAYMENT_METHODS, CancellationFeePercent, ContractPet, Contract,
} from '@/types/contract';
import { generateContractPDF, generateContractDOCX } from '@/lib/contractGenerator';
import { FileText, Download, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string | null;
  /** When provided, opens dialog in edit mode for this contract */
  contract?: Contract | null;
}

export const ContractDialog: React.FC<Props> = ({ open, onOpenChange, clientId, contract }) => {
  const { clients } = useClients();
  const { plans, findPlan, createContract, updateContract } = useContracts();
  const isEditing = !!contract;
  const effectiveClientId = contract?.client_id || clientId;
  const client = clients.find(c => c.id === effectiveClientId);

  const [planType, setPlanType] = useState<PlanType>('mensal');
  const [frequency, setFrequency] = useState<number>(3);
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [paymentMethodOther, setPaymentMethodOther] = useState('');
  const [observations, setObservations] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [overrideTotal, setOverrideTotal] = useState<string>('');
  const [cancellationFeePct, setCancellationFeePct] = useState<CancellationFeePercent>(0);
  const [extraPetIds, setExtraPetIds] = useState<string[]>([]);

  // Pets from same tutor (excluding the main one)
  const sameTutorPets = useMemo(() => {
    if (!client) return [];
    const tutorKey = (client.tutorName || '').trim().toLowerCase();
    const tutorCpf = (client.tutorCpf || '').trim();
    return clients.filter(c =>
      c.id !== client.id &&
      ((tutorCpf && c.tutorCpf?.trim() === tutorCpf) ||
        (tutorKey && (c.tutorName || '').trim().toLowerCase() === tutorKey))
    );
  }, [client, clients]);

  // Reset / load state when dialog opens
  useEffect(() => {
    if (!open) return;
    if (contract) {
      // Load existing contract values
      setPlanType(contract.plan_type);
      setFrequency(contract.frequency_per_week);
      setStartDate(contract.start_date);
      setOverrideValue(String(contract.base_monthly_value ?? ''));
      setOverrideTotal(String(contract.total_contract_value ?? ''));
      setCancellationFeePct((Number(contract.discount_percent) || 0) as CancellationFeePercent);
      setObservations(contract.observations || '');
      const pm = contract.payment_method || 'Pix';
      const isStandard = (PAYMENT_METHODS as readonly string[]).includes(pm);
      setPaymentMethod(isStandard ? pm : 'Outros');
      setPaymentMethodOther(isStandard ? '' : pm);
      const pets = (contract.client_snapshot?.pets as any[]) || [];
      setExtraPetIds(pets.map(p => p.client_id).filter(Boolean));
    } else {
      setExtraPetIds([]);
      setOverrideValue('');
      setOverrideTotal('');
      setCancellationFeePct(0);
      setPaymentMethod('Pix');
      setPaymentMethodOther('');
      setObservations('');
      setPlanType('mensal');
      setFrequency(3);
      setStartDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, contract, clientId]);

  const plan = findPlan(planType, frequency);
  const baseValue = overrideValue !== '' ? Number(overrideValue) : (plan?.base_monthly_value || 0);
  const calc = calcContract(baseValue, planType);
  const finalMonthlyValue = calc.final_monthly_value;
  const totalValue = overrideTotal !== '' ? Number(overrideTotal) : calc.total_contract_value;

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + PLAN_MONTHS[planType]);
    return d.toISOString().slice(0, 10);
  }, [startDate, planType]);

  const missing = useMemo(() => client ? getMissingClientFields(client) : [], [client]);

  if (!client) return null;

  const extraPets: ContractPet[] = extraPetIds
    .map(id => clients.find(c => c.id === id))
    .filter(Boolean)
    .map(c => ({
      client_id: c!.id,
      name: c!.name,
      breed: c!.breed,
      petSize: c!.petSize as any,
      birthDate: c!.birthDate ? new Date(c!.birthDate as any).toISOString() : null,
      gender: c!.gender as any,
      castrated: c!.castrated,
    }));

  const finalPaymentMethod = paymentMethod === 'Outros' && paymentMethodOther
    ? paymentMethodOther
    : paymentMethod;

  const buildContract = () => ({
    id: contract?.id || 'preview',
    client_id: client.id,
    client_snapshot: {
      tutorName: client.tutorName, tutorCpf: client.tutorCpf,
      tutorAddress: client.tutorAddress, tutorNeighborhood: client.tutorNeighborhood,
      tutorPhone: client.tutorPhone, tutorEmail: client.tutorEmail,
      name: client.name, breed: client.breed, petSize: client.petSize,
      birthDate: client.birthDate, gender: client.gender, castrated: client.castrated,
      pets: extraPets,
    },
    plan_type: planType,
    frequency_per_week: frequency,
    base_monthly_value: baseValue,
    discount_type: 'normal' as const,
    discount_percent: cancellationFeePct,
    final_monthly_value: finalMonthlyValue,
    total_contract_value: Math.round(totalValue * 100) / 100,
    start_date: startDate,
    end_date: endDate,
    status: contract?.status || 'pendente' as const,
    payment_method: finalPaymentMethod,
    observations,
    missing_fields: missing.map(m => m.key),
    cancelled_at: contract?.cancelled_at ?? null,
    cancellation_fee: contract?.cancellation_fee ?? null,
    pdf_url: contract?.pdf_url ?? null,
    docx_url: contract?.docx_url ?? null,
    created_by: contract?.created_by ?? null,
    created_by_name: contract?.created_by_name ?? '',
    created_at: contract?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const handleSave = async () => {
    if (baseValue <= 0) { toast.error('Defina um valor mensal. Configure os planos em Contratos → Planos & Valores.'); return; }
    const c = buildContract();
    if (isEditing && contract) {
      const { id, created_at, created_by, created_by_name, ...rest } = c;
      const ok = await updateContract(contract.id, rest as any);
      if (ok) onOpenChange(false);
    } else {
      const { id, created_at, updated_at, cancelled_at, cancellation_fee, pdf_url, docx_url, created_by, created_by_name, ...rest } = c;
      await createContract(rest as any);
      onOpenChange(false);
    }
  };

  const handlePDF = () => generateContractPDF(buildContract() as any);
  const handleDOCX = () => generateContractDOCX(buildContract() as any);

  const togglePet = (id: string) => {
    setExtraPetIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            {isEditing ? 'Editar contrato' : 'Contrato'} — {client.name} ({client.tutorName})
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados e salve para atualizar o contrato.'
              : 'Configure o plano, gere o contrato em PDF/DOCX e envie ao cliente.'}
          </DialogDescription>
        </DialogHeader>

        {missing.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900 p-3 space-y-2">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-semibold text-sm">
              <AlertCircle size={16} /> Faltam {missing.length} dado(s) para fechar a venda
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map(m => (
                <Badge key={m.key} variant="outline" className="border-yellow-400 text-yellow-700 dark:text-yellow-300">
                  {m.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              O contrato será gerado com [ A PREENCHER ] em vermelho nesses campos.
            </p>
          </div>
        )}
        {missing.length === 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900 p-3 flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle2 size={16} /> Todos os dados do cliente estão preenchidos.
          </div>
        )}

        {/* Multi-pet block */}
        {sameTutorPets.length > 0 && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus size={14} /> Incluir outros pets do mesmo tutor neste contrato
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {sameTutorPets.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox
                    checked={extraPetIds.includes(p.id)}
                    onCheckedChange={() => togglePet(p.id)}
                  />
                  <span>{p.name} <span className="text-muted-foreground">({p.breed || '—'})</span></span>
                </label>
              ))}
            </div>
            {extraPets.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {extraPets.length + 1} pets serão incluídos no contrato.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Plano (vigência)</Label>
            <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['mensal', 'trimestral', 'semestral', 'anual'] as PlanType[]).map(p => (
                  <SelectItem key={p} value={p}>{PLAN_TYPE_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequência semanal</Label>
            <Select value={String(frequency)} onValueChange={(v) => setFrequency(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}x por semana</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início</Label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <Label>Fim (calculado)</Label>
            <DatePicker value={endDate} onChange={() => {}} disabled />
          </div>

          <div className="col-span-2">
            <Label>
              Valor mensal (R$)
              {plan && <span className="text-xs text-muted-foreground ml-1">— sugerido: {formatBRL(plan.base_monthly_value)}</span>}
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder={plan?.base_monthly_value ? String(plan.base_monthly_value) : '0,00'}
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <Label>
              Valor total do contrato (R$)
              <span className="text-xs text-muted-foreground ml-1">
                — calculado: {formatBRL(calc.total_contract_value)} ({PLAN_MONTHS[planType]} mês{PLAN_MONTHS[planType] > 1 ? 'es' : ''})
              </span>
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder={String(calc.total_contract_value)}
              value={overrideTotal}
              onChange={(e) => setOverrideTotal(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Edite livremente para registrar negociações (não recalcula a mensalidade automaticamente).
            </p>
          </div>

          <div className="col-span-2">
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {paymentMethod === 'Outros' && (
              <Input
                className="mt-2"
                placeholder="Especifique a forma de pagamento"
                value={paymentMethodOther}
                onChange={(e) => setPaymentMethodOther(e.target.value)}
              />
            )}
          </div>

          <div className="col-span-2">
            <Label>Taxa de cancelamento</Label>
            <Select value={String(cancellationFeePct)} onValueChange={(v) => setCancellationFeePct(Number(v) as CancellationFeePercent)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem multa</SelectItem>
                <SelectItem value="15">15% sobre o valor restante</SelectItem>
                <SelectItem value="30">30% sobre o valor restante</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {cancellationFeePct === 0
                ? 'Cláusula 22ª: rescisão com aviso prévio de 30 dias, sem multa.'
                : `Cláusula 22ª: rescisão antecipada cobra ${cancellationFeePct}% sobre o valor não utilizado.`}
            </p>
          </div>

          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Valor mensal:</span>
            <span>{formatBRL(finalMonthlyValue)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-1 border-t border-primary/20">
            <span>Total do contrato ({PLAN_MONTHS[planType]} mês{PLAN_MONTHS[planType] > 1 ? 'es' : ''}):</span>
            <span className="text-primary">{formatBRL(totalValue)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePDF} className="flex-1 gap-2">
            <Download size={16} /> Baixar PDF
          </Button>
          <Button variant="outline" onClick={handleDOCX} className="flex-1 gap-2">
            <Download size={16} /> Baixar DOCX
          </Button>
          <Button onClick={handleSave} className="flex-1">
            {isEditing ? 'Salvar alterações' : 'Salvar Contrato'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
