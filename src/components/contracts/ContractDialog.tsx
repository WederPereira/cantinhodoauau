import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useContracts } from '@/hooks/useContracts';
import { useClients } from '@/context/ClientContext';
import {
  PlanType, PLAN_TYPE_LABELS, PLAN_MONTHS,
  calcContract, getMissingClientFields, formatBRL,
} from '@/types/contract';
import { generateContractPDF, generateContractDOCX } from '@/lib/contractGenerator';
import { FileText, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string | null;
}

export const ContractDialog: React.FC<Props> = ({ open, onOpenChange, clientId }) => {
  const { clients } = useClients();
  const { plans, findPlan, createContract } = useContracts();
  const client = clients.find(c => c.id === clientId);

  const [planType, setPlanType] = useState<PlanType>('mensal');
  const [frequency, setFrequency] = useState<number>(3);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [observations, setObservations] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overrideValue, setOverrideValue] = useState<string>('');

  const plan = findPlan(planType, frequency);
  const baseValue = overrideValue ? Number(overrideValue) : (plan?.base_monthly_value || 0);
  const calc = calcContract(baseValue, planType);

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + PLAN_MONTHS[planType]);
    return d.toISOString().slice(0, 10);
  }, [startDate, planType]);

  const missing = useMemo(() => client ? getMissingClientFields(client) : [], [client]);

  if (!client) return null;

  const buildContract = () => ({
    id: 'preview',
    client_id: client.id,
    client_snapshot: {
      tutorName: client.tutorName, tutorCpf: client.tutorCpf,
      tutorAddress: client.tutorAddress, tutorNeighborhood: client.tutorNeighborhood,
      tutorPhone: client.tutorPhone, tutorEmail: client.tutorEmail,
      name: client.name, breed: client.breed, petSize: client.petSize,
      birthDate: client.birthDate, gender: client.gender, castrated: client.castrated,
    },
    plan_type: planType,
    frequency_per_week: frequency,
    base_monthly_value: baseValue,
    discount_type: 'normal',
    discount_percent: 0,
    final_monthly_value: calc.final_monthly_value,
    total_contract_value: calc.total_contract_value,
    start_date: startDate,
    end_date: endDate,
    status: 'pendente' as const,
    payment_method: paymentMethod,
    observations,
    missing_fields: missing.map(m => m.key),
    cancelled_at: null, cancellation_fee: null, pdf_url: null, docx_url: null,
    created_by: null, created_by_name: '',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });

  const handleSave = async () => {
    if (baseValue <= 0) { toast.error('Defina um valor base. Configure os planos em Conta → Planos.'); return; }
    const c = buildContract();
    const { id, created_at, updated_at, cancelled_at, cancellation_fee, pdf_url, docx_url, created_by, created_by_name, ...rest } = c;
    await createContract(rest as any);
    onOpenChange(false);
  };

  const handlePDF = () => generateContractPDF(buildContract() as any);
  const handleDOCX = () => generateContractDOCX(buildContract() as any);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Contrato — {client.name} ({client.tutorName})
          </DialogTitle>
          <DialogDescription>
            Configure o plano, gere o contrato em PDF/DOCX e envie ao cliente.
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
            <Label>Desconto</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['normal', 'desc15', 'desc30', 'custom'] as DiscountType[]).map(d => (
                  <SelectItem key={d} value={d}>{DISCOUNT_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {discountType === 'custom' && (
            <div>
              <Label>% Desconto personalizado</Label>
              <Input type="number" value={customDiscount} onChange={(e) => setCustomDiscount(Number(e.target.value))} />
            </div>
          )}
          <div>
            <Label>Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Fim (calculado)</Label>
            <Input type="date" value={endDate} disabled />
          </div>
          <div className="col-span-2">
            <Label>Valor mensal base (R$) {plan && <span className="text-xs text-muted-foreground">— sugerido: {formatBRL(plan.base_monthly_value)}</span>}</Label>
            <Input
              type="number"
              placeholder={plan?.base_monthly_value ? String(plan.base_monthly_value) : '0,00'}
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Forma de pagamento</Label>
            <Input placeholder="Ex: Pix, Cartão 3x, Dinheiro..." value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Valor mensal base:</span>
            <span>{formatBRL(baseValue)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto ({discountPercent}%):</span>
              <span>-{formatBRL(baseValue * discountPercent / 100)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-1 border-t border-primary/20">
            <span>Mensalidade final:</span>
            <span className="text-primary">{formatBRL(calc.final_monthly_value)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total do contrato ({PLAN_MONTHS[planType]} mês{PLAN_MONTHS[planType] > 1 ? 'es' : ''}):</span>
            <span className="text-primary">{formatBRL(calc.total_contract_value)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePDF} className="flex-1 gap-2">
            <Download size={16} /> Baixar PDF
          </Button>
          <Button variant="outline" onClick={handleDOCX} className="flex-1 gap-2">
            <Download size={16} /> Baixar DOCX
          </Button>
          <Button onClick={handleSave} className="flex-1">Salvar Contrato</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
