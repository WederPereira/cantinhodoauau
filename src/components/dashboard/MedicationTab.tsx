import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { Pill, AlertTriangle, Clock, Dog, Check, Timer, Search, CheckCircle2, Plus, X, Syringe, Pencil, PawPrint } from 'lucide-react';
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
  notes: string;
  dog_name: string;
  source: 'hotel' | 'standalone';
  stay_id: string;
  client_id: string | null;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<MedItem | null>(null);

  // Add medication form
  const [selectedStayId, setSelectedStayId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newMedName, setNewMedName] = useState('');
  const [newMedType, setNewMedType] = useState('comprimido');
  const [newMedTime, setNewMedTime] = useState('');
  const [newMedRecurrence, setNewMedRecurrence] = useState('once');
  const [newMedNotes, setNewMedNotes] = useState('');
  const [staySearch, setStaySearch] = useState('');
  const [dogSearch, setDogSearch] = useState('');

  // Active stays for adding meds
  const [activeStays, setActiveStays] = useState<Array<{ id: string; dog_name: string; tutor_name: string; client_id: string }>>([]);
  // Dogs present at daycare today
  const [daycareDogNames, setDaycareDogNames] = useState<Set<string>>(new Set());

  const fetchMeds = useCallback(async () => {
    try {
      const { data: stays } = await supabase
        .from('hotel_stays')
        .select('id, dog_name, tutor_name, client_id')
        .eq('active', true);

      const staysList = stays || [];
      setActiveStays(staysList.map((s: any) => ({ id: s.id, dog_name: s.dog_name, tutor_name: s.tutor_name, client_id: s.client_id })));
      const stayMap = new Map(staysList.map((s: any) => [s.id, s.dog_name]));
      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      // Fetch ALL medications (hotel + standalone)
      const { data: allMeds } = await supabase
        .from('hotel_medications')
        .select('*')
        .order('scheduled_time', { ascending: true });

      const items: MedItem[] = (allMeds || []).map((m: any) => ({
        id: m.id,
        medication_name: m.medication_name,
        medication_type: m.medication_type || 'comprimido',
        scheduled_time: m.scheduled_time,
        administered: m.administered,
        administered_at: m.administered_at || null,
        recurrence: m.recurrence || 'once',
        notes: m.notes || '',
        dog_name: m.hotel_stay_id ? (stayMap.get(m.hotel_stay_id) || 'Dog') : (m.client_id ? (clientMap.get(m.client_id) || 'Dog') : 'Dog'),
        source: m.hotel_stay_id ? 'hotel' : 'standalone',
        stay_id: m.hotel_stay_id || '',
        client_id: m.client_id || null,
      }));

      setMeds(items);
    } catch (err) {
      console.error(err);
    }
  }, [clients]);

  // Fetch daycare dogs for today
  const fetchDaycareDogs = useCallback(async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('daily_records')
        .select('dog')
        .eq('date', todayStr);
      if (data) {
        setDaycareDogNames(new Set(data.map((d: any) => d.dog.toLowerCase())));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchMeds();
    fetchDaycareDogs();
    const channel = supabase
      .channel('med-tab-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_medications' }, fetchMeds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchMeds)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMeds, fetchDaycareDogs]);

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

  const handleDeleteMed = async (medId: string) => {
    try {
      await supabase.from('hotel_medications').delete().eq('id', medId);
      toast.success('Medicamento removido');
      fetchMeds();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleAddMedication = async () => {
    if ((!selectedStayId && !selectedClientId) || !newMedName || !newMedTime) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      await supabase.from('hotel_medications').insert({
        hotel_stay_id: selectedStayId || null,
        client_id: selectedClientId || null,
        medication_name: newMedName,
        medication_type: newMedType,
        scheduled_time: newMedTime,
        recurrence: newMedRecurrence,
        notes: newMedNotes,
      });
      toast.success(`${newMedName} adicionado!`);
      resetAddForm();
      setAddDialogOpen(false);
      fetchMeds();
    } catch {
      toast.error('Erro ao adicionar medicamento');
    }
  };

  const handleEditMedication = async () => {
    if (!editingMed || !newMedName || !newMedTime) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      await supabase.from('hotel_medications').update({
        medication_name: newMedName,
        medication_type: newMedType,
        scheduled_time: newMedTime,
        recurrence: newMedRecurrence,
        notes: newMedNotes,
      }).eq('id', editingMed.id);
      toast.success(`${newMedName} atualizado!`);
      setEditDialogOpen(false);
      setEditingMed(null);
      resetAddForm();
      fetchMeds();
    } catch {
      toast.error('Erro ao editar medicamento');
    }
  };

  const openEditDialog = (med: MedItem) => {
    setEditingMed(med);
    setNewMedName(med.medication_name);
    setNewMedType(med.medication_type);
    setNewMedTime(med.scheduled_time.slice(0, 5));
    setNewMedRecurrence(med.recurrence);
    setNewMedNotes(med.notes || '');
    setEditDialogOpen(true);
  };

  const resetAddForm = () => {
    setNewMedName('');
    setNewMedType('comprimido');
    setNewMedTime('');
    setNewMedRecurrence('once');
    setNewMedNotes('');
    setSelectedStayId('');
    setSelectedClientId('');
    setStaySearch('');
    setDogSearch('');
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

  // For the add dialog: show all registered dogs, not just hotel stays
  const allDogs = clients.map(c => {
    const hotelStay = activeStays.find(s => s.client_id === c.id);
    const isDaycare = daycareDogNames.has(c.name.toLowerCase());
    return {
      id: c.id,
      name: c.name,
      photo: c.photo,
      breed: c.breed,
      hotelStayId: hotelStay?.id || null,
      isDaycare,
      isHotel: !!hotelStay,
    };
  });

  const filteredDogs = allDogs.filter(d => {
    if (!dogSearch) return true;
    const q = dogSearch.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.breed.toLowerCase().includes(q);
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => openEditDialog(med)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil size={12} />
              </button>
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
      </div>
    );
  };

  const MedFormFields = () => (
    <div className="space-y-4">
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

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observações (opcional)</label>
        <Input placeholder="Ex: dar com comida" value={newMedNotes} onChange={e => setNewMedNotes(e.target.value)} className="text-sm h-9" />
      </div>
    </div>
  );

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
          {/* Add medication dialog */}
          <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) resetAddForm(); }}>
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

              <div className="space-y-4">
                {/* Select dog - ALL registered dogs */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dog</label>
                  <div className="relative mb-2">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar dog..." value={dogSearch} onChange={e => setDogSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                    {filteredDogs.map(dog => (
                      <button
                        key={dog.id}
                        onClick={() => {
                          if (dog.hotelStayId) {
                            setSelectedStayId(dog.hotelStayId);
                            setSelectedClientId(dog.id);
                          } else {
                            setSelectedStayId('');
                            setSelectedClientId(dog.id);
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center p-2 rounded-xl border-2 transition-all text-center relative",
                          (dog.hotelStayId && selectedStayId === dog.hotelStayId) || (!dog.hotelStayId && selectedClientId === dog.id)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/40 bg-card'
                        )}
                      >
                        {dog.photo ? (
                          <img src={dog.photo} alt={dog.name} className="w-10 h-10 rounded-full object-cover mb-1 border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-1">
                            <Dog size={16} className="text-muted-foreground" />
                          </div>
                        )}
                        <p className="font-semibold text-[10px] truncate w-full">{dog.name}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {dog.isHotel && <Badge variant="secondary" className="text-[7px] px-1 py-0">🏨</Badge>}
                          {dog.isDaycare && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 border-amber-400 text-amber-600 bg-amber-50">
                              <PawPrint size={7} className="mr-0.5" /> Creche
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Daycare warning */}
                  {selectedClientId && (() => {
                    const dog = clients.find(c => c.id === selectedClientId);
                    if (dog && daycareDogNames.has(dog.name.toLowerCase())) {
                      return (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                          <PawPrint size={14} />
                          <span><strong>{dog.name}</strong> está presente na creche hoje! Confira antes de aplicar.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <MedFormFields />

                <Button className="w-full gap-1.5" onClick={handleAddMedication} disabled={(!selectedStayId && !selectedClientId) || !newMedName || !newMedTime}>
                  <Plus size={14} /> Adicionar Medicamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit medication dialog */}
          <Dialog open={editDialogOpen} onOpenChange={(o) => { setEditDialogOpen(o); if (!o) { setEditingMed(null); resetAddForm(); } }}>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Pencil size={18} className="text-primary" /> Editar Medicamento
                </DialogTitle>
              </DialogHeader>
              {editingMed && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Dog size={16} className="text-primary" />
                    <span className="text-sm font-semibold">{editingMed.dog_name}</span>
                  </div>
                  <MedFormFields />
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => { handleDeleteMed(editingMed.id); setEditDialogOpen(false); setEditingMed(null); }}>
                      <X size={14} /> Remover
                    </Button>
                    <Button className="flex-1 gap-1.5" onClick={handleEditMedication} disabled={!newMedName || !newMedTime}>
                      <Check size={14} /> Salvar Alterações
                    </Button>
                  </div>
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
                      onClick={() => openEditDialog(med)}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded border border-border"
                    >
                      Editar
                    </button>
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
