import React, { useState } from 'react';
import { useContracts } from '@/hooks/useContracts';
import { useClients } from '@/context/ClientContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Contract, PLAN_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS,
  formatBRL, ContractStatus, calcCancellationFee,
} from '@/types/contract';
import { generateContractPDF, generateContractDOCX } from '@/lib/contractGenerator';
import { ContractDialog } from '@/components/contracts/ContractDialog';
import { FileText, Download, Trash2, Plus, Search, Settings, X, Check } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ContractsPage: React.FC = () => {
  const { contracts, plans, loading, deleteContract, updateContract, updatePlan } = useContracts();
  const { clients } = useClients();
  const { isAdmin } = useUserRole();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const filtered = contracts.filter(c => {
    const snap = c.client_snapshot || {};
    const term = search.toLowerCase();
    const matchSearch = !term ||
      (snap.name || '').toLowerCase().includes(term) ||
      (snap.tutorName || '').toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalActive = contracts.filter(c => c.status === 'ativo').reduce((s, c) => s + Number(c.final_monthly_value), 0);
  const totalContracts = contracts.length;

  const handleNewContract = () => {
    if (clients.length === 0) return;
    // open select client first
    setSelectedClientId(null);
    setShowClientPicker(true);
  };

  const [showClientPicker, setShowClientPicker] = useState(false);

  return (
    <div className="container mx-auto px-3 py-4 max-w-5xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-primary" /> Contratos
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de contratos da creche</p>
        </div>
        <Button onClick={handleNewContract} className="gap-2">
          <Plus size={16} /> Novo contrato
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total de contratos</div>
          <div className="text-2xl font-bold">{totalContracts}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Ativos</div>
          <div className="text-2xl font-bold text-green-600">{contracts.filter(c => c.status === 'ativo').length}</div>
        </Card>
        <Card className="p-3 col-span-2 sm:col-span-1">
          <div className="text-xs text-muted-foreground">Receita mensal ativa</div>
          <div className="text-2xl font-bold text-primary">{formatBRL(totalActive)}</div>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="list">Contratos</TabsTrigger>
          <TabsTrigger value="plans"><Settings size={14} className="mr-1" />Planos & Valores</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar pet ou tutor..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="concluido">Concluídos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && <div className="text-center text-muted-foreground py-8">Carregando...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-8">Nenhum contrato encontrado.</div>
          )}

          {filtered.map(c => (
            <ContractCard key={c.id} contract={c} isAdmin={isAdmin}
              onDelete={() => deleteContract(c.id)}
              onStatusChange={(status) => updateContract(c.id, { status })}
              onCancel={() => {
                updateContract(c.id, {
                  status: 'cancelado',
                  cancelled_at: new Date().toISOString(),
                  cancellation_fee: calcCancellationFee(c),
                });
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="plans" className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            Configure o valor mensal base de cada plano. {!isAdmin && '(Somente admins podem editar)'}
          </p>
          <div className="grid gap-2">
            {(['mensal', 'trimestral', 'semestral', 'anual'] as const).map(pt => (
              <Card key={pt} className="p-3">
                <div className="font-semibold mb-2">{PLAN_TYPE_LABELS[pt]}</div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(freq => {
                    const p = plans.find(x => x.plan_type === pt && x.frequency_per_week === freq);
                    if (!p) return null;
                    return (
                      <div key={freq} className="space-y-1">
                        <label className="text-xs text-muted-foreground">{freq}x/sem</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={p.base_monthly_value}
                          disabled={!isAdmin}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== p.base_monthly_value) updatePlan(p.id, v);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ContractDialog open={dialogOpen} onOpenChange={setDialogOpen} clientId={selectedClientId} />

      <ClientPickerDialog
        open={showClientPicker}
        onOpenChange={setShowClientPicker}
        onPick={(id) => { setSelectedClientId(id); setShowClientPicker(false); setDialogOpen(true); }}
      />
    </div>
  );
};

interface ContractCardProps {
  contract: Contract;
  isAdmin: boolean;
  onDelete: () => void;
  onStatusChange: (s: ContractStatus) => void;
  onCancel: () => void;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, isAdmin, onDelete, onStatusChange, onCancel }) => {
  const snap = contract.client_snapshot || {};
  const extraPets = (snap.pets as any[]) || [];
  const feePct = Number(contract.discount_percent) || 0;
  const estimatedFee = feePct > 0 ? calcCancellationFee(contract) : 0;

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{snap.name}</span>
            {extraPets.length > 0 && (
              <span className="text-xs text-muted-foreground">
                +{extraPets.length} pet{extraPets.length > 1 ? 's' : ''} ({extraPets.map((p: any) => p.name).join(', ')})
              </span>
            )}
            <span className="text-sm text-muted-foreground">— {snap.tutorName}</span>
            <Badge className={STATUS_COLORS[contract.status]}>{STATUS_LABELS[contract.status]}</Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {PLAN_TYPE_LABELS[contract.plan_type]} • {contract.frequency_per_week}x/sem •
            {' '}<strong className="text-foreground">{formatBRL(contract.final_monthly_value)}</strong>/mês
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(contract.start_date).toLocaleDateString('pt-BR')} → {contract.end_date ? new Date(contract.end_date).toLocaleDateString('pt-BR') : '—'}
            {' • '}Total: <strong>{formatBRL(contract.total_contract_value)}</strong>
            {feePct > 0 && <> {' • '}Multa rescisão: <strong>{feePct}%</strong></>}
            {contract.payment_method && <> {' • '}Pgto: {contract.payment_method}</>}
          </div>
          {contract.missing_fields?.length > 0 && contract.status === 'pendente' && (
            <div className="text-xs text-yellow-600 mt-1">⚠️ {contract.missing_fields.length} campo(s) por preencher</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Button size="sm" variant="outline" onClick={() => generateContractPDF(contract)}><Download size={14} className="mr-1" />PDF</Button>
        <Button size="sm" variant="outline" onClick={() => generateContractDOCX(contract)}><Download size={14} className="mr-1" />DOCX</Button>
        {contract.status === 'pendente' && (
          <Button size="sm" variant="outline" className="text-green-600" onClick={() => onStatusChange('ativo')}>
            <Check size={14} className="mr-1" />Ativar
          </Button>
        )}
        {contract.status === 'ativo' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-red-600"><X size={14} className="mr-1" />Cancelar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar contrato?</AlertDialogTitle>
                <AlertDialogDescription>
                  O contrato será marcado como cancelado.
                  {feePct > 0 ? (
                    <> Conforme Cláusula 22ª, será aplicada multa de <strong>{feePct}%</strong> sobre o valor restante:
                      {' '}<strong>{formatBRL(estimatedFee)}</strong>.</>
                  ) : (
                    <> Sem multa contratada — comunique formalmente com 30 dias de antecedência.</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={onCancel}>Confirmar cancelamento</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-red-600"><Trash2 size={14} /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
};

const ClientPickerDialog: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void; onPick: (id: string) => void }> = ({ open, onOpenChange, onPick }) => {
  const { clients } = useClients();
  const [q, setQ] = useState('');
  const filtered = clients.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.tutorName.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 30);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b">
          <div className="font-semibold mb-2">Selecione o cliente</div>
          <Input placeholder="Buscar pet ou tutor..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <div className="overflow-y-auto p-2">
          {filtered.map(c => (
            <button key={c.id} onClick={() => onPick(c.id)}
              className="w-full text-left p-2 hover:bg-muted rounded-md flex items-center gap-2">
              <div>
                <div className="font-medium text-sm">{c.name} ({c.breed || '—'})</div>
                <div className="text-xs text-muted-foreground">{c.tutorName}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ContractsPage;
