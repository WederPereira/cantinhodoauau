import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { Pill, AlertTriangle, Clock, Dog, Check, Timer, Search, CheckCircle2, Plus, X, Syringe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MedItem {
  id: string;
  medication_name: string;
  medication_type: string;
  scheduled_time: string;
  administered: boolean;
  administered_at: string | null;
  recurrence: string;
  dog_name: string;
  source: 'hotel';
  stay_id: string;
}

const MEDICATION_TYPES = [
  { value: 'comprimido', label: 'Comprimido', icon: '💊' },
  { value: 'meio_comprimido', label: 'Meio comprimido', icon: '💊½' },
  { value: 'insulina', label: 'Injeção de insulina', icon: '💉' },
  { value: 'injecao', label: 'Injeção', icon: '💉' },
  { value: 'liquido', label: 'Líquido/Xarope', icon: '🧴' },
  { value: 'pomada', label: 'Pomada/Creme', icon: '🧴' },
  { value: 'colírio', label: 'Colírio', icon: '👁️' },
  { value: 'outro', label: 'Outro', icon: '📦' },
];

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Dose única' },
  { value: 'every_6h', label: '6/6h' },
  { value: 'every_8h', label: '8/8h' },
  { value: 'every_12h', label: '12/12h' },
  { value: 'every_24h', label: '1x/dia' },
];

const RECURRENCE_LABELS: Record<string, string> = {
  once: 'Dose única',
  every_6h: '6/6h',
  every_8h: '8/8h',
  every_12h: '12/12h',
  every_24h: '1x/dia',
};

const getMedTypeLabel = (type: string) => MEDICATION_TYPES.find(t => t.value === type)?.label || type;
const getMedTypeIcon = (type: string) => MEDICATION_TYPES.find(t => t.value === type)?.icon || '💊';

const MedicationTab: React.FC = () => {
  const { clients } = useClients();
  const [meds, setMeds] = useState<MedItem[]>([]);
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState('');
  const [showAdministered, setShowAdministered] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Add medication form
  const [selectedStayId, setSelectedStayId] = useState('');
  const [newMedName, setNewMedName] = useState('');
  const [newMedType, setNewMedType] = useState('comprimido');
  const [newMedTime, setNewMedTime] = useState('');
  const [newMedRecurrence, setNewMedRecurrence] = useState('once');
  const [staySearch, setStaySearch] = useState('');

  // Active stays for adding meds
  const [activeStays, setActiveStays] = useState<Array<{ id: string; dog_name: string; tutor_name: string; client_id: string }>>([]);

  const fetchMeds = useCallback(async () => {
    try {
      const { data: stays } = await supabase
        .from('hotel_stays')
        .select('id, dog_name, tutor_name, client_id')
        .eq('active', true);
      if (!stays || stays.length === 0) { setMeds([]); setActiveStays([]); return; }

      setActiveStays(stays.map((s: any) => ({ id: s.id, dog_name: s.dog_name, tutor_name: s.tutor_name, client_id: s.client_id })));
      const stayMap = new Map(stays.map((s: any) => [s.id, s.dog_name]));
      const stayIds = stays.map((s: any) => s.id);

      const { data: hotelMeds } = await supabase
        .from('hotel_medications')
        .select('*')
        .in('hotel_stay_id', stayIds)
        .order('scheduled_time', { ascending: true });

      const items: MedItem[] = (hotelMeds || []).map((m: any) => ({
        id: m.id,
        medication_name: m.medication_name,
        medication_type: m.medication_type || 'comprimido',
        scheduled_time: m.scheduled_time,
        administered: m.administered,
        administered_at: m.administered_at || null,
        recurrence: m.recurrence || 'once',
        dog_name: stayMap.get(m.hotel_stay_id) || 'Dog',
        source: 'hotel',
        stay_id: m.hotel_stay_id,
      }));

      setMeds(items);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchMeds();
    const channel = supabase
      .channel('med-tab-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_medications' }, fetchMeds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchMeds)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMeds]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminister = async (med: MedItem) => {
    try {
      const { error } = await supabase
        .from('hotel_medications')
        .update({ administered: true, administered_at: new Date().toISOString() })
        .eq('id', med.id);
      if (error) throw error;
      toast.success(`${med.medication_name} administrado para ${med.dog_name} ✅`);
      fetchMeds();
    } catch {
      toast.error('Erro ao registrar administração');
    }
  };

  const handleUndo = async (med: MedItem) => {
    try {
      await supabase
        .from('hotel_medications')
        .update({ administered: false, administered_at: null })
        .eq('id', med.id);
      toast.success('Desfeito!');
      fetchMeds();
    } catch {
      toast.error('Erro ao desfazer');
    }
  };

  const handleAddMedication = async () => {
    if (!selectedStayId || !newMedName || !newMedTime) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      await supabase.from('hotel_medications').insert({
        hotel_stay_id: selectedStayId,
        medication_name: newMedName,
        medication_type: newMedType,
        scheduled_time: newMedTime,
        recurrence: newMedRecurrence,
      });
      toast.success(`${newMedName} adicionado!`);
      setNewMedName('');
      setNewMedType('comprimido');
      setNewMedTime('');
      setNewMedRecurrence('once');
      setSelectedStayId('');
      setAddDialogOpen(false);
      fetchMeds();
    } catch {
      toast.error('Erro ao adicionar medicamento');
    }
  };

  const getMedMinutes = (med: MedItem) => {
    const [h, m] = med.scheduled_time.split(':').map(Number);
    return h * 60 + m;
  };
  const getNowMinutes = () => now.getHours() * 60 + now.getMinutes();

  const getCountdown = (med: MedItem): string => {
    const medMinutes = getMedMinutes(med);
    const nowMinutes = getNowMinutes();
    const nowSeconds = now.getSeconds();
    const diffTotal = (medMinutes - nowMinutes) * 60 - nowSeconds;

    if (diffTotal <= 0) {
      const overdueSec = Math.abs(diffTotal);
      const oh = Math.floor(overdueSec / 3600);
      const om = Math.floor((overdueSec % 3600) / 60);
      if (oh > 0) return `+${oh}h${om.toString().padStart(2, '0')}m`;
      return `+${om}min`;
    }

    const h = Math.floor(diffTotal / 3600);
    const m = Math.floor((diffTotal % 3600) / 60);
    const s = diffTotal % 60;
    if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  };

  const isOverdue = (med: MedItem) => !med.administered && getNowMinutes() - getMedMinutes(med) > 120;
  const isPastNotOverdue = (med: MedItem) => {
    if (med.administered) return false;
    const diff = getNowMinutes() - getMedMinutes(med);
    return diff >= 0 && diff <= 120;
  };
  const isUpcoming = (med: MedItem) => !med.administered && getMedMinutes(med) - getNowMinutes() > 0;

  const filtered = meds.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.dog_name.toLowerCase().includes(q) || m.medication_name.toLowerCase().includes(q);
  });

  const pending = filtered.filter(m => !m.administered);
  const administered = filtered.filter(m => m.administered);
  const overdue = pending.filter(isOverdue);
  const pastNotOverdue = pending.filter(isPastNotOverdue);
  const upcoming = pending.filter(isUpcoming);

  const filteredStays = activeStays.filter(s => {
    if (!staySearch) return true;
    const q = staySearch.toLowerCase();
    return s.dog_name.toLowerCase().includes(q) || s.tutor_name.toLowerCase().includes(q);
  });

  const MedCard = ({ med, variant }: { med: MedItem; variant: 'overdue' | 'past' | 'upcoming' }) => {
    const countdown = getCountdown(med);
    const client = clients.find(c => c.id === activeStays.find(s => s.id === med.stay_id)?.client_id);
    const borderColors = {
      overdue: 'border-destructive/60 bg-destructive/5',
      past: 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10',
      upcoming: 'border-border bg-card',
    };

    return (
      <div className={cn("rounded-xl border-2 p-3 transition-all", borderColors[variant])}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border">
            {client?.photo ? (
              <img src={client.photo} alt={med.dog_name} className="w-full h-full object-cover" />
            ) : (
              <div className={cn("w-full h-full flex items-center justify-center",
                variant === 'overdue' ? 'bg-destructive/15' : variant === 'past' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10'
              )}>
                <Dog size={18} className={variant === 'overdue' ? 'text-destructive' : 'text-primary'} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{med.dog_name}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <span>{getMedTypeIcon(med.medication_type)}</span>
              {med.medication_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                <Clock size={10} /> {med.scheduled_time.slice(0, 5)}
              </span>
              <Badge variant="outline" className="text-[8px] px-1 py-0">{RECURRENCE_LABELS[med.recurrence] || med.recurrence}</Badge>
              <Badge variant="secondary" className="text-[8px] px-1 py-0">{getMedTypeLabel(med.medication_type)}</Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className={cn("flex items-center gap-1 font-mono text-xs font-bold",
              variant === 'overdue' ? 'text-destructive' : variant === 'past' ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
            )}>
              <Timer size={14} />
              <span>{countdown}</span>
            </div>
            <button
              onClick={() => handleAdminister(med)}
              className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95",
                variant === 'overdue'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <Check size={12} /> Aplicar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Pill size={20} className="text-primary" /> Medicações
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pending.length} pendente(s) · {administered.length} administrado(s) hoje
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              <AlertTriangle size={12} className="mr-1" /> {pending.length}
            </Badge>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-9 text-xs rounded-xl">
                <Plus size={14} /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Syringe size={18} className="text-primary" /> Adicionar Medicamento
                </DialogTitle>
              </DialogHeader>

              {activeStays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dog size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum dog hospedado no momento</p>
                  <p className="text-xs mt-1">Faça um check-in no hotel primeiro</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select dog */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dog</label>
                    <div className="relative mb-2">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Buscar dog..." value={staySearch} onChange={e => setStaySearch(e.target.value)} className="pl-8 h-8 text-xs" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto">
                      {filteredStays.map(stay => {
                        const client = clients.find(c => c.id === stay.client_id);
                        return (
                          <button
                            key={stay.id}
                            onClick={() => setSelectedStayId(stay.id)}
                            className={cn(
                              "flex flex-col items-center p-2 rounded-xl border-2 transition-all text-center",
                              selectedStayId === stay.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 bg-card'
                            )}
                          >
                            {client?.photo ? (
                              <img src={client.photo} alt={stay.dog_name} className="w-10 h-10 rounded-full object-cover mb-1 border border-border" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-1">
                                <Dog size={16} className="text-muted-foreground" />
                              </div>
                            )}
                            <p className="font-semibold text-[10px] truncate w-full">{stay.dog_name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Medication details */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome do medicamento</label>
                    <Input placeholder="Ex: Prednisolona" value={newMedName} onChange={e => setNewMedName(e.target.value)} className="text-sm h-9" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MEDICATION_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setNewMedType(t.value)}
                          className={cn(
                            "flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all text-center",
                            newMedType === t.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                          )}
                        >
                          <span className="text-lg">{t.icon}</span>
                          <span className="text-[8px] font-medium leading-tight">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Horário</label>
                      <Input type="time" value={newMedTime} onChange={e => setNewMedTime(e.target.value)} className="text-sm h-9" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Recorrência</label>
                      <Select value={newMedRecurrence} onValueChange={setNewMedRecurrence}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button className="w-full gap-1.5" onClick={handleAddMedication} disabled={!selectedStayId || !newMedName || !newMedTime}>
                    <Plus size={14} /> Adicionar Medicamento
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar dog ou remédio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm rounded-xl"
        />
      </div>

      {/* Empty state */}
      {meds.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Pill size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhuma medicação cadastrada</p>
          <p className="text-xs mt-1 opacity-60">Adicione medicações pelo botão acima ou no check-in do hotel</p>
        </div>
      )}

      {/* All done */}
      {meds.length > 0 && pending.length === 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
          <CheckCircle2 size={36} className="mx-auto mb-2 text-primary" />
          <p className="text-sm font-semibold text-foreground">Todas as medicações foram aplicadas! 🎉</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum remédio pendente no momento</p>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-destructive uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle size={12} /> Atrasados (+2h) — {overdue.length}
          </p>
          {overdue.map(med => <MedCard key={med.id} med={med} variant="overdue" />)}
        </div>
      )}

      {/* Past not overdue */}
      {pastNotOverdue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <Clock size={12} /> Horário passou — {pastNotOverdue.length}
          </p>
          {pastNotOverdue.map(med => <MedCard key={med.id} med={med} variant="past" />)}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Próximos — {upcoming.length}
          </p>
          {upcoming.map(med => <MedCard key={med.id} med={med} variant="upcoming" />)}
        </div>
      )}

      {/* Administered today */}
      {administered.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAdministered(!showAdministered)}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <CheckCircle2 size={12} className="text-primary" />
            Administrados ({administered.length})
            <span className="text-[10px]">{showAdministered ? '▲' : '▼'}</span>
          </button>
          {showAdministered && (
            <div className="space-y-1.5">
              {administered.map(med => (
                <div key={med.id} className="flex items-center justify-between p-2.5 rounded-xl border border-primary/20 bg-primary/5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={14} className="text-primary shrink-0" />
                    <span className="font-semibold truncate">{med.dog_name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="truncate">{getMedTypeIcon(med.medication_type)} {med.medication_name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {med.administered_at && (
                      <span className="text-[10px] text-primary font-mono">
                        ✓ {format(new Date(med.administered_at), 'HH:mm')}
                      </span>
                    )}
                    <button
                      onClick={() => handleUndo(med)}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded border border-border"
                    >
                      Desfazer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicationTab;
