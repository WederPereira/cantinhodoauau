import React, { useMemo, useState, useRef } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, VaccineType, VACCINE_TYPE_LABELS, getVaccineExpiryDate, getFleaExpiryDate, isExpiringSoon, isExpired, formatDate, ANTIPULGAS_BRANDS, FleaType } from '@/types/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Syringe, Bug, MessageCircle, Search, CheckCircle2, AlertTriangle, XCircle, Filter, FlaskConical, ShieldAlert, Plus, Trash2, Apple, Pill, Heart, Edit2, Printer, CalendarDays, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import FecesCollectionTab from './FecesCollectionTab';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';

type HealthCategory = 'vaccines' | 'flea' | 'feces' | 'restrictions';
type HealthStatus = 'ok' | 'expiring' | 'expired' | 'none';

type RestrictionType = 'alimentar' | 'alergia' | 'vacina' | 'medicamento' | 'outra';

interface ParsedRestriction {
  type: RestrictionType;
  description: string;
}

const RESTRICTION_TYPE_LABELS: Record<RestrictionType, string> = {
  alimentar: 'Alimentar',
  alergia: 'Alergia',
  vacina: 'Vacina',
  medicamento: 'Medicamento',
  outra: 'Outra',
};

const RESTRICTION_TYPE_ICONS: Record<RestrictionType, React.ReactNode> = {
  alimentar: <Apple size={12} />,
  alergia: <ShieldAlert size={12} />,
  vacina: <Syringe size={12} />,
  medicamento: <Pill size={12} />,
  outra: <Heart size={12} />,
};

const RESTRICTION_TYPE_COLORS: Record<RestrictionType, string> = {
  alimentar: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  alergia: 'bg-red-500/10 text-red-600 border-red-500/20',
  vacina: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  medicamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  outra: 'bg-muted text-muted-foreground border-border',
};

// Parse restrictions string: "tipo:descrição|tipo:descrição"
const parseRestrictions = (raw: string | undefined): ParsedRestriction[] => {
  if (!raw || !raw.trim()) return [];
  return raw.split('|').filter(Boolean).map(entry => {
    const colonIdx = entry.indexOf(':');
    if (colonIdx > 0) {
      const type = entry.slice(0, colonIdx).trim() as RestrictionType;
      const desc = entry.slice(colonIdx + 1).trim();
      if (Object.keys(RESTRICTION_TYPE_LABELS).includes(type)) {
        return { type, description: desc };
      }
    }
    return { type: 'outra' as RestrictionType, description: entry.trim() };
  });
};

const serializeRestrictions = (restrictions: ParsedRestriction[]): string => {
  return restrictions.map(r => `${r.type}:${r.description}`).join('|');
};

// Check if a client has a vaccine restriction
export const getVaccineRestrictions = (client: Client): string[] => {
  const restrictions = parseRestrictions(client.healthRestrictions);
  return restrictions
    .filter(r => r.type === 'vacina')
    .map(r => r.description);
};

interface VaccineStatus {
  type: string;
  label: string;
  status: HealthStatus;
  expiryDate?: Date;
  lastDate?: string;
}

interface ClientHealthInfo {
  client: Client;
  vaccines: VaccineStatus[];
  flea: VaccineStatus;
  worstStatus: HealthStatus;
}

const getStatusPriority = (s: HealthStatus) => s === 'expired' ? 0 : s === 'expiring' ? 1 : s === 'none' ? 2 : 3;

const StatusBadge: React.FC<{ status: HealthStatus; expiryDate?: Date; lastDate?: string }> = ({ status, expiryDate, lastDate }) => {
  const dateText = lastDate ? format(new Date(lastDate), "dd/MM/yyyy", { locale: ptBR }) : (expiryDate ? formatDate(expiryDate) : '');
  
  if (status === 'none') {
    return <Badge variant="outline" className="text-xs text-muted-foreground border-muted cursor-pointer hover:opacity-80">Sem registro</Badge>;
  }
  if (status === 'expired') {
    return (
      <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5 cursor-pointer hover:opacity-80">
        <XCircle size={12} className="mr-1" />
        Vencida {dateText}
      </Badge>
    );
  }
  if (status === 'expiring') {
    return (
      <Badge variant="outline" className="text-xs text-[hsl(var(--status-warning))] border-[hsl(var(--status-warning)/0.3)] bg-[hsl(var(--status-warning-bg))] cursor-pointer hover:opacity-80">
        <AlertTriangle size={12} className="mr-1" />
        Vencendo {dateText}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30 cursor-pointer hover:opacity-80">
      <CheckCircle2 size={12} className="mr-1" />
      Em dia {dateText}
    </Badge>
  );
};

const buildWhatsAppMessage = (client: Client, info: ClientHealthInfo): string => {
  const lines: string[] = [];
  lines.push(`Olá, ${client.tutorName}! 🐾✨`);
  lines.push('');
  lines.push(`Passando para informar sobre a saúde do(a) *${client.name}*:`);
  lines.push('');

  const vaccineRestrictions = getVaccineRestrictions(client);

  info.vaccines.forEach(v => {
    if (vaccineRestrictions.some(r => r.toLowerCase().includes(v.label.toLowerCase()))) {
      lines.push(`⛔ A vacina *${v.label}* não pode ser aplicada (restrição registrada).`);
      return;
    }
    if (v.status === 'expired') {
      lines.push(`❌ A vacina *${v.label}* está *vencida* desde ${v.expiryDate ? formatDate(v.expiryDate) : ''}. É importante atualizar o quanto antes! 💉`);
    } else if (v.status === 'expiring') {
      lines.push(`⚠️ A vacina *${v.label}* está *para vencer* em ${v.expiryDate ? formatDate(v.expiryDate) : ''}. Agende a renovação! 📅`);
    } else if (v.status === 'ok') {
      lines.push(`✅ A vacina *${v.label}* está *em dia* até ${v.expiryDate ? formatDate(v.expiryDate) : ''}.`);
    } else {
      lines.push(`📋 A vacina *${v.label}* ainda *não possui registro*. Que tal agendar?`);
    }
  });

  lines.push('');

  if (info.flea.status === 'expired') {
    lines.push(`❌ O *antipulgas* está *vencido* desde ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}. Vamos renovar? 🐛`);
  } else if (info.flea.status === 'expiring') {
    lines.push(`⚠️ O *antipulgas* está *para vencer* em ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}. Fique atento(a)! 🐛`);
  } else if (info.flea.status === 'ok') {
    lines.push(`✅ O *antipulgas* está *em dia* até ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}.`);
  } else {
    lines.push(`📋 O *antipulgas* ainda *não possui registro*. Que tal agendar?`);
  }

  lines.push('');
  lines.push('Ficamos à disposição para agendar! 🏥💕');
  lines.push('');
  lines.push('Atenciosamente, equipe *Cantinho do AuAu* 🐶');

  return lines.join('\n');
};

const openWhatsApp = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

// ── Restrictions Section ──────────────────────────────────

const AddRestrictionDialog: React.FC<{ client: Client; onSave: (client: Client, restrictions: ParsedRestriction[]) => void }> = ({ client, onSave }) => {
  const existing = parseRestrictions(client.healthRestrictions);
  const [type, setType] = useState<RestrictionType>('alimentar');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!description.trim()) { toast.error('Preencha a descrição'); return; }
    const updated = [...existing, { type, description: description.trim() }];
    onSave(client, updated);
    setDescription('');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2">
          <Plus size={12} /> Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Adicionar restrição — {client.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
            <Select value={type} onValueChange={v => setType(v as RestrictionType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RESTRICTION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={type === 'alimentar' ? 'Ex: Não pode comer uva, chocolate' : type === 'vacina' ? 'Ex: Alergia à vacina V10' : 'Descreva a restrição...'}
              className="text-sm min-h-[80px]"
            />
          </div>
          <DialogClose asChild>
            <Button onClick={handleAdd} className="w-full" size="sm">Salvar restrição</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RestrictionsSection: React.FC<{ clients: Client[] }> = ({ clients }) => {
  const [search, setSearch] = useState('');
  const { updateClient } = useClients();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newType, setNewType] = useState<RestrictionType>('alimentar');
  const [newDesc, setNewDesc] = useState('');
  const [addSearch, setAddSearch] = useState('');

  const handleSaveRestrictions = async (client: Client, restrictions: ParsedRestriction[]) => {
    const serialized = serializeRestrictions(restrictions);
    await updateClient(client.id, { healthRestrictions: serialized } as Partial<Client>);
    toast.success('Restrição salva');
  };

  const handleDeleteRestriction = async (client: Client, index: number) => {
    const existing = parseRestrictions(client.healthRestrictions);
    existing.splice(index, 1);
    await updateClient(client.id, { healthRestrictions: serializeRestrictions(existing) } as Partial<Client>);
    toast.success('Restrição removida');
  };

  const handleAddRestriction = async () => {
    if (!selectedClient || !newDesc.trim()) { toast.error('Selecione um dog e preencha a descrição'); return; }
    const existing = parseRestrictions(selectedClient.healthRestrictions);
    const updated = [...existing, { type: newType, description: newDesc.trim() }];
    await handleSaveRestrictions(selectedClient, updated);
    setNewDesc('');
    setSelectedClient(null);
    setAddDialogOpen(false);
  };

  const restrictedClients = useMemo(() => {
    return clients
      .filter(c => c.healthRestrictions && c.healthRestrictions.trim().length > 0)
      .filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return c.name.toLowerCase().includes(s) || c.tutorName.toLowerCase().includes(s) || (c.healthRestrictions || '').toLowerCase().includes(s);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, search]);

  const filteredAddClients = useMemo(() => {
    const s = addSearch.toLowerCase();
    return clients
      .filter(c => !s || c.name.toLowerCase().includes(s) || c.tutorName.toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, addSearch]);

  return (
    <div className="space-y-3">
      <div className="bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning)/0.2)] rounded-xl p-3 text-center">
        <ShieldAlert size={20} className="text-[hsl(var(--status-warning))] mx-auto mb-1" />
        <p className="text-xl font-bold text-[hsl(var(--status-warning))]">{restrictedClients.length}</p>
        <p className="text-xs text-muted-foreground">Dogs com restrições</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por pet, tutor ou restrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Dialog open={addDialogOpen} onOpenChange={o => { setAddDialogOpen(o); if (!o) { setSelectedClient(null); setNewDesc(''); setAddSearch(''); } }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 h-10 px-3">
              <Plus size={14} /> Dog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Adicionar restrição</DialogTitle>
            </DialogHeader>

            {!selectedClient ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar dog..."
                    value={addSearch}
                    onChange={e => setAddSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                    autoFocus
                  />
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-1">
                  {filteredAddClients.map(c => {
                    const existing = parseRestrictions(c.healthRestrictions);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 w-full text-left transition-colors"
                      >
                        {c.photo ? (
                          <img src={c.photo} alt={c.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.tutorName} • {c.breed || 'SRD'}</p>
                        </div>
                        {existing.length > 0 && (
                          <Badge variant="outline" className="text-[10px] shrink-0">{existing.length}</Badge>
                        )}
                      </button>
                    );
                  })}
                  {filteredAddClients.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum dog encontrado</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  {selectedClient.photo ? (
                    <img src={selectedClient.photo} alt={selectedClient.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                      {selectedClient.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{selectedClient.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedClient.tutorName}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedClient(null)}>Trocar</Button>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                  <Select value={newType} onValueChange={v => setNewType(v as RestrictionType)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(RESTRICTION_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                  <Textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder={newType === 'alimentar' ? 'Ex: Não pode comer uva, chocolate' : newType === 'vacina' ? 'Ex: Alergia à vacina V10' : 'Descreva a restrição...'}
                    className="text-sm min-h-[80px]"
                    autoFocus
                  />
                </div>
                <Button onClick={handleAddRestriction} className="w-full" size="sm">Salvar restrição</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-0.5">
        {restrictedClients.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum dog com restrições registradas. Clique em "+ Dog" para adicionar.'}
          </p>
        )}
        {restrictedClients.map(client => {
          const restrictions = parseRestrictions(client.healthRestrictions);
          return (
            <div key={client.id} className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-2 shadow-soft">
              <div className="flex items-center gap-3">
                {client.photo ? (
                  <img src={client.photo} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                    {client.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{client.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{client.tutorName} • {client.breed || 'SRD'}</p>
                </div>
                <AddRestrictionDialog client={client} onSave={handleSaveRestrictions} />
              </div>

              <div className="space-y-1.5">
                {restrictions.map((r, i) => (
                  <div key={i} className={cn('flex items-start gap-2 rounded-lg p-2 border', RESTRICTION_TYPE_COLORS[r.type])}>
                    <span className="mt-0.5">{RESTRICTION_TYPE_ICONS[r.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide">{RESTRICTION_TYPE_LABELS[r.type]}</p>
                      <p className="text-sm">{r.description}</p>
                    </div>
                    <button onClick={() => handleDeleteRestriction(client, i)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Flea Form Popover ─────────────────────────────────────
const FleaFormPopover: React.FC<{
  client: Client;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (date: string, brand: string, duration: 1 | 2 | 3 | 6, fleaType: FleaType) => void;
  children: React.ReactNode;
}> = ({ client, isOpen, onOpenChange, onSave, children }) => {
  const lastFlea = client.fleaHistory?.[0];
  const [date, setDate] = useState<Date | undefined>(lastFlea ? new Date(lastFlea.date) : undefined);
  const [brand, setBrand] = useState(lastFlea?.brand || '');
  const [duration, setDuration] = useState<string>(String(lastFlea?.durationMonths || 1));
  const [fleaType, setFleaType] = useState<FleaType>(lastFlea?.fleaType || 'fixo');

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-3" align="start">
        <p className="text-xs font-semibold text-foreground">Registrar Antipulgas</p>
        
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Tipo</label>
          <div className="flex gap-1">
            <Button size="sm" variant={fleaType === 'fixo' ? 'default' : 'outline'} className="flex-1 h-7 text-xs gap-1" onClick={() => setFleaType('fixo')}>
              <Building2 size={12} /> Fixo
            </Button>
            <Button size="sm" variant={fleaType === 'nao_fixo' ? 'default' : 'outline'} className="flex-1 h-7 text-xs gap-1" onClick={() => setFleaType('nao_fixo')}>
              <User size={12} /> Não fixo
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5">{fleaType === 'fixo' ? 'Creche aplica' : 'Cliente aplica'}</p>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Marca</label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {ANTIPULGAS_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Duração</label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="35">35 dias</SelectItem>
              <SelectItem value="1">1 mês</SelectItem>
              <SelectItem value="2">2 meses</SelectItem>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Data da aplicação</label>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="pointer-events-auto p-1"
            locale={ptBR}
          />
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs"
          disabled={!date || !brand}
          onClick={() => {
            if (date && brand) {
              onSave(date.toISOString(), brand, Number(duration) as 1 | 2 | 3 | 6, fleaType);
              onOpenChange(false);
            }
          }}
        >
          Salvar
        </Button>
      </PopoverContent>
    </Popover>
  );
};

// ── Print List ────────────────────────────────────────────
const PrintableList: React.FC<{ data: ClientHealthInfo[]; category: 'vaccines' | 'flea' }> = ({ data, category }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Lista de Controle - ${category === 'vaccines' ? 'Vacinas' : 'Antipulgas'}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        .header { text-align: center; margin-bottom: 15px; }
        .expired { color: red; font-weight: bold; }
        .expiring { color: orange; }
        .ok { color: green; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; }
      </style></head><body>
      <div class="header">
        <h2>Controle de ${category === 'vaccines' ? 'Vacinas' : 'Antipulgas'}</h2>
        <p>Data: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</p>
      </div>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={handlePrint}>
        <Printer size={14} /> Imprimir Lista
      </Button>
      <div ref={printRef} className="hidden">
        <table>
          <thead>
            <tr>
              <th>Dog</th>
              <th>Tutor</th>
              <th>Raça</th>
              {category === 'vaccines' ? (
                <>
                  <th>Gripe</th><th>V10</th><th>Raiva</th><th>Giárdia</th>
                </>
              ) : (
                <>
                  <th>Marca</th><th>Tipo</th><th>Última Aplicação</th><th>Vencimento</th><th>Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map(info => (
              <tr key={info.client.id}>
                <td>{info.client.name}</td>
                <td>{info.client.tutorName}</td>
                <td>{info.client.breed || 'SRD'}</td>
                {category === 'vaccines' ? (
                  info.vaccines.map(v => (
                    <td key={v.type} className={v.status === 'expired' ? 'expired' : v.status === 'expiring' ? 'expiring' : v.status === 'ok' ? 'ok' : ''}>
                      {v.lastDate ? format(new Date(v.lastDate), "dd/MM/yy") : '—'}
                      {v.expiryDate ? ` (venc: ${format(v.expiryDate, "dd/MM/yy")})` : ''}
                    </td>
                  ))
                ) : (
                  <>
                    <td>{info.client.fleaHistory?.[0]?.brand || '—'}</td>
                    <td>{info.client.fleaHistory?.[0]?.fleaType === 'nao_fixo' ? 'Cliente' : 'Creche'}</td>
                    <td>{info.flea.lastDate ? format(new Date(info.flea.lastDate), "dd/MM/yy") : '—'}</td>
                    <td>{info.flea.expiryDate ? format(info.flea.expiryDate, "dd/MM/yy") : '—'}</td>
                    <td className={info.flea.status === 'expired' ? 'expired' : info.flea.status === 'expiring' ? 'expiring' : 'ok'}>
                      {info.flea.status === 'expired' ? 'Vencido' : info.flea.status === 'expiring' ? 'Vencendo' : info.flea.status === 'ok' ? 'Em dia' : 'Sem registro'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── Main Component ────────────────────────────────────────

export const HealthControlTab: React.FC = () => {
  const { clients, addVaccineRecord, addFleaRecord } = useClients();
  const { isAdmin } = useUserRole();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring' | 'ok'>('all');
  const [category, setCategory] = useState<HealthCategory>('vaccines');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [dateFilterFrom, setDateFilterFrom] = useState<Date | undefined>(undefined);
  const [dateFilterTo, setDateFilterTo] = useState<Date | undefined>(undefined);
  const [fleaTypeFilter, setFleaTypeFilter] = useState<'all' | 'fixo' | 'nao_fixo'>('all');
  const [vaccineTypeFilter, setVaccineTypeFilter] = useState<'all' | VaccineType>('all');

  const clientHealthData = useMemo((): ClientHealthInfo[] => {
    return clients.map(client => {
      const vaccineKeys: VaccineType[] = ['gripe', 'v10', 'raiva', 'giardia'];
      const vaccines: VaccineStatus[] = vaccineKeys.map(key => {
        const lastDate = client.vaccines[key];
        if (!lastDate) {
          return { type: key, label: VACCINE_TYPE_LABELS[key], status: 'none' as HealthStatus };
        }
        const expiry = getVaccineExpiryDate(lastDate);
        let status: HealthStatus = 'ok';
        if (isExpired(expiry)) status = 'expired';
        else if (isExpiringSoon(expiry, 30)) status = 'expiring';
        return { type: key, label: VACCINE_TYPE_LABELS[key], status, expiryDate: expiry, lastDate };
      });

      let flea: VaccineStatus = { type: 'antipulgas', label: 'Antipulgas', status: 'none' };
      if (client.fleaHistory && client.fleaHistory.length > 0) {
        const lastFlea = client.fleaHistory[0];
        const expiry = getFleaExpiryDate(lastFlea.date, lastFlea.durationMonths);
        let status: HealthStatus = 'ok';
        if (isExpired(expiry)) status = 'expired';
        else if (isExpiringSoon(expiry, 15)) status = 'expiring';
        flea = { type: 'antipulgas', label: `Antipulgas (${lastFlea.brand})`, status, expiryDate: expiry, lastDate: lastFlea.date };
      } else if (client.vaccines.antipulgas) {
        const expiry = getFleaExpiryDate(client.vaccines.antipulgas, 1);
        let status: HealthStatus = 'ok';
        if (isExpired(expiry)) status = 'expired';
        else if (isExpiringSoon(expiry, 15)) status = 'expiring';
        flea = { type: 'antipulgas', label: 'Antipulgas', status, expiryDate: expiry, lastDate: client.vaccines.antipulgas };
      }

      const allStatuses = [...vaccines.map(v => v.status), flea.status];
      const worstStatus: HealthStatus = allStatuses.includes('expired') ? 'expired' : allStatuses.includes('expiring') ? 'expiring' : 'ok';

      return { client, vaccines, flea, worstStatus };
    });
  }, [clients]);

  const vaccineStats = useMemo(() => {
    let expired = 0, expiring = 0, ok = 0;
    clientHealthData.forEach(d => {
      const worst = d.vaccines.reduce<HealthStatus>((acc, v) => {
        if (v.status === 'expired') return 'expired';
        if (v.status === 'expiring' && acc !== 'expired') return 'expiring';
        if (v.status === 'ok' && acc === 'none') return 'ok';
        return acc;
      }, 'none');
      if (worst === 'expired') expired++;
      else if (worst === 'expiring') expiring++;
      else if (worst === 'ok') ok++;
    });
    return { expired, expiring, ok };
  }, [clientHealthData]);

  const fleaStats = useMemo(() => {
    let expired = 0, expiring = 0, ok = 0;
    clientHealthData.forEach(d => {
      if (d.flea.status === 'expired') expired++;
      else if (d.flea.status === 'expiring') expiring++;
      else if (d.flea.status === 'ok') ok++;
    });
    return { expired, expiring, ok };
  }, [clientHealthData]);

  const stats = category === 'vaccines' ? vaccineStats : fleaStats;

  const filtered = useMemo(() => {
    let data = clientHealthData;

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(d => d.client.name.toLowerCase().includes(s) || d.client.tutorName.toLowerCase().includes(s));
    }

    // Date filter
    if (dateFilterFrom || dateFilterTo) {
      data = data.filter(d => {
        if (category === 'vaccines') {
          return d.vaccines.some(v => {
            if (!v.lastDate) return false;
            const vDate = new Date(v.lastDate);
            if (dateFilterFrom && vDate < dateFilterFrom) return false;
            if (dateFilterTo && vDate > dateFilterTo) return false;
            return true;
          });
        } else {
          if (!d.flea.lastDate) return false;
          const fDate = new Date(d.flea.lastDate);
          if (dateFilterFrom && fDate < dateFilterFrom) return false;
          if (dateFilterTo && fDate > dateFilterTo) return false;
          return true;
        }
      });
    }

    // Flea type filter
    if (category === 'flea' && fleaTypeFilter !== 'all') {
      data = data.filter(d => {
        const lastFlea = d.client.fleaHistory?.[0];
        if (!lastFlea) return false;
        return lastFlea.fleaType === fleaTypeFilter;
      });
    }

    // Vaccine type filter
    if (category === 'vaccines' && vaccineTypeFilter !== 'all') {
      data = data.filter(d => {
        const v = d.vaccines.find(v => v.type === vaccineTypeFilter);
        return v !== undefined;
      });
    }

    if (category === 'vaccines') {
      if (filter === 'expired') data = data.filter(d => {
        const vaccines = vaccineTypeFilter !== 'all' ? d.vaccines.filter(v => v.type === vaccineTypeFilter) : d.vaccines;
        return vaccines.some(v => v.status === 'expired');
      });
      else if (filter === 'expiring') data = data.filter(d => {
        const vaccines = vaccineTypeFilter !== 'all' ? d.vaccines.filter(v => v.type === vaccineTypeFilter) : d.vaccines;
        return vaccines.some(v => v.status === 'expiring');
      });
      else if (filter === 'ok') data = data.filter(d => {
        const vaccines = vaccineTypeFilter !== 'all' ? d.vaccines.filter(v => v.type === vaccineTypeFilter) : d.vaccines;
        return vaccines.every(v => v.status === 'ok' || v.status === 'none') && vaccines.some(v => v.status === 'ok');
      });
    } else {
      if (filter === 'expired') data = data.filter(d => d.flea.status === 'expired');
      else if (filter === 'expiring') data = data.filter(d => d.flea.status === 'expiring');
      else if (filter === 'ok') data = data.filter(d => d.flea.status === 'ok');
    }

    data.sort((a, b) => {
      const aStatus = category === 'vaccines'
        ? (a.vaccines.some(v => v.status === 'expired') ? 'expired' : a.vaccines.some(v => v.status === 'expiring') ? 'expiring' : 'ok')
        : a.flea.status;
      const bStatus = category === 'vaccines'
        ? (b.vaccines.some(v => v.status === 'expired') ? 'expired' : b.vaccines.some(v => v.status === 'expiring') ? 'expiring' : 'ok')
        : b.flea.status;
      return getStatusPriority(aStatus as HealthStatus) - getStatusPriority(bStatus as HealthStatus);
    });
    return data;
  }, [clientHealthData, search, filter, category, dateFilterFrom, dateFilterTo, fleaTypeFilter]);

  const hasIssues = (info: ClientHealthInfo) => {
    if (category === 'vaccines') return info.vaccines.some(v => v.status === 'expired' || v.status === 'expiring');
    return info.flea.status === 'expired' || info.flea.status === 'expiring';
  };

  const clearDateFilter = () => { setDateFilterFrom(undefined); setDateFilterTo(undefined); };
  const hasDateFilter = !!dateFilterFrom || !!dateFilterTo;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Category Toggle */}
      <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
        <button
          onClick={() => { setCategory('vaccines'); setFilter('all'); clearDateFilter(); setFleaTypeFilter('all'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
            category === 'vaccines'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Syringe size={15} />
          Vacinas
        </button>
        <button
          onClick={() => { setCategory('flea'); setFilter('all'); clearDateFilter(); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
            category === 'flea'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Bug size={15} />
          Antipulgas
        </button>
        <button
          onClick={() => { setCategory('feces'); setFilter('all'); clearDateFilter(); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
            category === 'feces'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FlaskConical size={15} />
          Coleta
        </button>
        <button
          onClick={() => { setCategory('restrictions'); setFilter('all'); clearDateFilter(); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
            category === 'restrictions'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ShieldAlert size={15} />
          Restrições
        </button>
      </div>

      {category === 'feces' ? (
        <FecesCollectionTab />
      ) : category === 'restrictions' ? (
        <RestrictionsSection clients={clients} />
      ) : (
      <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-2.5 sm:p-3 text-center cursor-pointer hover:bg-destructive/10 transition-colors"
          onClick={() => setFilter(f => f === 'expired' ? 'all' : 'expired')}>
          <XCircle size={18} className="text-destructive mx-auto mb-0.5 sm:mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-destructive">{stats.expired}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Vencidas</p>
        </div>
        <div className="bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning)/0.2)] rounded-xl p-2.5 sm:p-3 text-center cursor-pointer hover:opacity-80 transition-colors"
          onClick={() => setFilter(f => f === 'expiring' ? 'all' : 'expiring')}>
          <AlertTriangle size={18} className="text-[hsl(var(--status-warning))] mx-auto mb-0.5 sm:mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-[hsl(var(--status-warning))]">{stats.expiring}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Vencendo</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 sm:p-3 text-center cursor-pointer hover:opacity-80 transition-colors"
          onClick={() => setFilter(f => f === 'ok' ? 'all' : 'ok')}>
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-0.5 sm:mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.ok}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Em dia</p>
        </div>
      </div>

      {/* Search, Date Filter & Print */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar pet ou tutor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
          {(filter !== 'all' || hasDateFilter || fleaTypeFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={() => { setFilter('all'); clearDateFilter(); setFleaTypeFilter('all'); }} className="shrink-0 h-10">
              <Filter size={14} className="mr-1" /> Limpar
            </Button>
          )}
          <PrintableList data={filtered} category={category as 'vaccines' | 'flea'} />
        </div>

        {/* Date range filter */}
        <div className="flex gap-2 items-center flex-wrap">
          <CalendarDays size={14} className="text-muted-foreground" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                {dateFilterFrom ? format(dateFilterFrom, "dd/MM/yy") : 'De'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFilterFrom} onSelect={setDateFilterFrom} locale={ptBR} className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                {dateFilterTo ? format(dateFilterTo, "dd/MM/yy") : 'Até'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFilterTo} onSelect={setDateFilterTo} locale={ptBR} className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {hasDateFilter && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearDateFilter}>✕</Button>
          )}

          {/* Flea type filter */}
          {category === 'flea' && (
            <div className="flex gap-1 ml-auto">
              <Button size="sm" variant={fleaTypeFilter === 'all' ? 'default' : 'outline'} className="h-7 text-[10px] px-2" onClick={() => setFleaTypeFilter('all')}>Todos</Button>
              <Button size="sm" variant={fleaTypeFilter === 'fixo' ? 'default' : 'outline'} className="h-7 text-[10px] px-2 gap-0.5" onClick={() => setFleaTypeFilter('fixo')}>
                <Building2 size={10} /> Fixo
              </Button>
              <Button size="sm" variant={fleaTypeFilter === 'nao_fixo' ? 'default' : 'outline'} className="h-7 text-[10px] px-2 gap-0.5" onClick={() => setFleaTypeFilter('nao_fixo')}>
                <User size={10} /> Não fixo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto pr-0.5 sm:pr-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado.</p>
        )}
        {filtered.map(info => {
          const vaccineRestrictions = getVaccineRestrictions(info.client);
          return (
          <div key={info.client.id} className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 shadow-soft">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base text-foreground truncate">{info.client.name}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{info.client.tutorName} • {info.client.breed || 'SRD'}</p>
              </div>
              {/* Only admin can send WhatsApp (contains sensitive phone data) */}
              {isAdmin && hasIssues(info) && info.client.tutorPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30 gap-1 text-xs shrink-0 h-8 px-2.5"
                  onClick={() => openWhatsApp(info.client.tutorPhone, buildWhatsAppMessage(info.client, info))}
                >
                  <MessageCircle size={13} />
                  <span className="hidden sm:inline">Avisar</span>
                </Button>
              )}
            </div>

            {/* Category-specific content */}
            {category === 'vaccines' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {info.vaccines.map(v => {
                  const popKey = `${info.client.id}-${v.type}`;
                  const hasVaccineRestriction = vaccineRestrictions.some(r => r.toLowerCase().includes(v.label.toLowerCase()));
                  return (
                    <div key={v.type} className="space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <Syringe size={10} />
                        {v.label}
                      </div>
                      {hasVaccineRestriction ? (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                          <ShieldAlert size={12} className="mr-1" />
                          Restrição
                        </Badge>
                      ) : (
                      <Popover open={editingKey === popKey} onOpenChange={(open) => setEditingKey(open ? popKey : null)}>
                        <PopoverTrigger asChild>
                          <button className="text-left">
                            <StatusBadge status={v.status} expiryDate={v.expiryDate} lastDate={v.lastDate} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={v.lastDate ? new Date(v.lastDate) : undefined}
                            onSelect={(d) => {
                              if (d) {
                                addVaccineRecord(info.client.id, v.type as VaccineType, d.toISOString());
                                toast.success(`${v.label} atualizada: ${format(d, "dd/MM/yyyy", { locale: ptBR })}`);
                                setEditingKey(null);
                              }
                            }}
                            initialFocus
                            className="pointer-events-auto"
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Bug size={10} />
                    {info.flea.label}
                  </div>
                  {info.client.fleaHistory?.[0] && (
                    <Badge variant="outline" className={cn("text-[10px]", info.client.fleaHistory[0].fleaType === 'fixo' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border')}>
                      {info.client.fleaHistory[0].fleaType === 'fixo' ? (
                        <><Building2 size={10} className="mr-0.5" /> Fixo</>
                      ) : (
                        <><User size={10} className="mr-0.5" /> Não fixo</>
                      )}
                    </Badge>
                  )}
                </div>
                <FleaFormPopover
                  client={info.client}
                  isOpen={editingKey === `${info.client.id}-flea`}
                  onOpenChange={(open) => setEditingKey(open ? `${info.client.id}-flea` : null)}
                  onSave={(date, brand, duration, fleaType) => {
                    addFleaRecord(info.client.id, date, brand, duration, undefined, fleaType);
                    toast.success(`Antipulgas atualizado: ${brand} - ${format(new Date(date), "dd/MM/yyyy", { locale: ptBR })}`);
                  }}
                >
                  <button className="text-left">
                    <StatusBadge status={info.flea.status} expiryDate={info.flea.expiryDate} lastDate={info.flea.lastDate} />
                  </button>
                </FleaFormPopover>
                {info.flea.lastDate && (
                  <p className="text-[10px] text-muted-foreground">
                    Última aplicação: {formatDate(new Date(info.flea.lastDate))}
                    {info.client.fleaHistory?.[0] && ` • ${info.client.fleaHistory[0].durationMonths === 35 ? '35 dias' : `${info.client.fleaHistory[0].durationMonths} ${info.client.fleaHistory[0].durationMonths === 1 ? 'mês' : 'meses'}`}`}
                  </p>
                )}
              </div>
            )}

            {isAdmin && hasIssues(info) && !info.client.tutorPhone && (
              <p className="text-[11px] text-muted-foreground italic">⚠️ Sem telefone cadastrado.</p>
            )}
          </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
};
