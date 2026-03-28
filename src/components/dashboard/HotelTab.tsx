import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HotelAnalyticsTab from '@/components/dashboard/HotelAnalyticsTab';
import { useClients } from '@/context/ClientContext';
import { format, startOfDay, differenceInDays, addDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Hotel, Plus, Camera, Pill, Clock, Trash2, X, ChevronDown, ChevronUp,
  AlertTriangle, Check, FileText, Dog, Bell, Search, Copy, Calendar as CalendarIcon,
  Utensils, Undo2, Eye, Tag, Package, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAction } from '@/hooks/useActionLog';

interface HotelStay {
  id: string;
  client_id: string;
  dog_name: string;
  tutor_name: string;
  check_in: string;
  check_out: string | null;
  expected_checkout: string | null;
  observations: string;
  belongings_photos: string[];
  belonging_labels: Record<string, string>;
  active: boolean;
  ate: boolean;
}

interface Medication {
  id: string;
  hotel_stay_id: string;
  medication_name: string;
  scheduled_time: string;
  administered: boolean;
  administered_at: string | null;
  notes: string;
  recurrence: string;
}

interface HotelMeal {
  id: string;
  hotel_stay_id: string;
  date: string;
  meal_type: string;
  ate: boolean;
}

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Dose única' },
  { value: 'every_6h', label: 'A cada 6h' },
  { value: 'every_8h', label: 'A cada 8h' },
  { value: 'every_12h', label: 'A cada 12h' },
  { value: 'every_24h', label: '1x ao dia' },
];

const MEAL_TYPES = [
  { key: 'almoco', label: '🌤️ Almoço', icon: '🌤️' },
  { key: 'janta', label: '🌙 Janta', icon: '🌙' },
];

const HotelTab: React.FC = () => {
  const { clients } = useClients();
  const [stays, setStays] = useState<HotelStay[]>([]);
  const [allStays, setAllStays] = useState<HotelStay[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [meals, setMeals] = useState<HotelMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStay, setExpandedStay] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [observations, setObservations] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [expectedCheckoutDate, setExpectedCheckoutDate] = useState<Date>(addDays(new Date(), 1));
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('');
  const [medRecurrence, setMedRecurrence] = useState('once');
  const [addMedStayId, setAddMedStayId] = useState<string | null>(null);
  const alertedMeds = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStayId, setUploadingStayId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [recentCheckouts, setRecentCheckouts] = useState<HotelStay[]>([]);
  const [uploadLabels, setUploadLabels] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<{ stayId: string; files: File[] } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: staysData, error: sErr } = await supabase
        .from('hotel_stays')
        .select('*')
        .eq('active', true)
        .order('check_in', { ascending: false });
      if (sErr) throw sErr;

      const { data: allData } = await supabase
        .from('hotel_stays')
        .select('*')
        .order('check_in', { ascending: false });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentCO } = await supabase
        .from('hotel_stays')
        .select('*')
        .eq('active', false)
        .gte('check_out', oneDayAgo)
        .order('check_out', { ascending: false });

      const activeIds = (staysData || []).map((s: any) => s.id);
      let medsData: any[] = [];
      let mealsData: any[] = [];
      if (activeIds.length > 0) {
        const { data: md } = await supabase
          .from('hotel_medications')
          .select('*')
          .in('hotel_stay_id', activeIds)
          .order('scheduled_time', { ascending: true });
        medsData = md || [];

        const { data: ml } = await supabase
          .from('hotel_meals')
          .select('*')
          .in('hotel_stay_id', activeIds)
          .order('date', { ascending: true });
        mealsData = ml || [];
      }

      setStays((staysData || []).map((s: any) => ({ ...s, belonging_labels: s.belonging_labels || {} })));
      setAllStays((allData || []).map((s: any) => ({ ...s, belonging_labels: s.belonging_labels || {} })));
      setMedications(medsData);
      setMeals(mealsData);
      setRecentCheckouts((recentCO || []).map((s: any) => ({ ...s, belonging_labels: s.belonging_labels || {} })));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do hotel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('hotel-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_medications' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_meals' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      medications.forEach(med => {
        if (med.administered) return;
        const [h, m] = med.scheduled_time.split(':').map(Number);
        const medMinutes = h * 60 + m;
        const diff = medMinutes - nowMinutes;
        if (diff >= 0 && diff <= 5 && !alertedMeds.current.has(med.id)) {
          alertedMeds.current.add(med.id);
          const stay = stays.find(s => s.id === med.hotel_stay_id);
          toast.warning(`⏰ Em ${diff} min: ${med.medication_name} para ${stay?.dog_name || 'dog'}`, { duration: 15000, icon: <Bell size={18} /> });
        }
      });
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [medications, stays]);

  const filteredClients = useMemo(() => {
    if (!searchFilter) return clients;
    const q = searchFilter.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.breed.toLowerCase().includes(q) ||
      c.tutorName.toLowerCase().includes(q)
    );
  }, [clients, searchFilter]);

  const datesWithStays = useMemo(() => {
    const set = new Set<string>();
    allStays.forEach(s => set.add(format(new Date(s.check_in), 'yyyy-MM-dd')));
    return set;
  }, [allStays]);

  const staysForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayStart = startOfDay(selectedDate);
    return allStays.filter(s => {
      const sDate = startOfDay(new Date(s.check_in));
      return sDate.getTime() === dayStart.getTime();
    });
  }, [allStays, selectedDate]);

  const handleAddStay = async () => {
    if (!selectedClientId) { toast.error('Selecione um dog'); return; }
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    try {
      const { error } = await supabase.from('hotel_stays').insert({
        client_id: client.id,
        dog_name: client.name,
        tutor_name: client.tutorName,
        observations,
        check_in: checkInDate.toISOString(),
        expected_checkout: expectedCheckoutDate.toISOString(),
      });
      if (error) throw error;

      const days = eachDayOfInterval({ start: checkInDate, end: expectedCheckoutDate });
      const { data: newStay } = await supabase
        .from('hotel_stays')
        .select('id')
        .eq('client_id', client.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newStay) {
        const mealRows = days.flatMap(day =>
          MEAL_TYPES.map(mt => ({
            hotel_stay_id: newStay.id,
            date: format(day, 'yyyy-MM-dd'),
            meal_type: mt.key,
            ate: false,
          }))
        );
        if (mealRows.length > 0) {
          await supabase.from('hotel_meals').insert(mealRows);
        }
      }

      logAction('checkin', 'hotel', newStay?.id, { dog_name: client.name, tutor_name: client.tutorName });
      toast.success(`${client.name} entrou no hotel! 🏨`);
      setAddDialogOpen(false);
      setSelectedClientId('');
      setObservations('');
      setSearchFilter('');
      setCheckInDate(new Date());
      setExpectedCheckoutDate(addDays(new Date(), 1));
      await fetchData();
      // Auto-expand the new stay
      if (newStay) setExpandedStay(newStay.id);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar entrada');
    }
  };

  const handleCheckout = async (stay: HotelStay) => {
    try {
      const { error } = await supabase
        .from('hotel_stays')
        .update({ active: false, check_out: new Date().toISOString() })
        .eq('id', stay.id);
      if (error) throw error;
      logAction('checkout', 'hotel', stay.id, { dog_name: stay.dog_name, tutor_name: stay.tutor_name });
      toast.success(`${stay.dog_name} fez checkout!`, {
        duration: 8000,
        action: { label: 'Desfazer', onClick: () => handleUndoCheckout(stay.id) },
      });
      fetchData();
    } catch { toast.error('Erro ao fazer checkout'); }
  };

  const handleUndoCheckout = async (stayId: string) => {
    try {
      const { error } = await supabase.from('hotel_stays').update({ active: true, check_out: null }).eq('id', stayId);
      if (error) throw error;
      toast.success('Checkout desfeito! 🔄');
      fetchData();
    } catch { toast.error('Erro ao desfazer checkout'); }
  };

  const handleDeleteStay = async (stayId: string) => {
    try {
      // Delete related meals and medications first
      await supabase.from('hotel_meals').delete().eq('hotel_stay_id', stayId);
      await supabase.from('hotel_medications').delete().eq('hotel_stay_id', stayId);
      const { error } = await supabase.from('hotel_stays').delete().eq('id', stayId);
      if (error) throw error;
      logAction('delete_stay', 'hotel', stayId);
      toast.success('Check-in apagado!');
      setDeleteConfirmId(null);
      fetchData();
    } catch { toast.error('Erro ao apagar check-in'); }
  };

  const handleToggleMeal = async (stayId: string, date: string, mealType: string) => {
    const existing = meals.find(m => m.hotel_stay_id === stayId && m.date === date && m.meal_type === mealType);
    try {
      if (existing) {
        await supabase.from('hotel_meals').update({ ate: !existing.ate }).eq('id', existing.id);
      } else {
        await supabase.from('hotel_meals').insert({ hotel_stay_id: stayId, date, meal_type: mealType, ate: true });
      }
      fetchData();
    } catch { toast.error('Erro ao atualizar refeição'); }
  };

  const handleUpdateObservations = async (stayId: string, obs: string) => {
    try {
      await supabase.from('hotel_stays').update({ observations: obs, updated_at: new Date().toISOString() }).eq('id', stayId);
      toast.success('Observação salva');
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleAddMedication = async (stayId: string) => {
    if (!medName || !medTime) { toast.error('Preencha nome e horário'); return; }
    try {
      await supabase.from('hotel_medications').insert({
        hotel_stay_id: stayId, medication_name: medName, scheduled_time: medTime, recurrence: medRecurrence,
      });
      toast.success(`Remédio ${medName} adicionado`);
      setMedName(''); setMedTime(''); setMedRecurrence('once'); setAddMedStayId(null);
      fetchData();
    } catch { toast.error('Erro ao adicionar remédio'); }
  };

  const handleToggleMed = async (med: Medication) => {
    try {
      await supabase.from('hotel_medications').update({
        administered: !med.administered,
        administered_at: !med.administered ? new Date().toISOString() : null,
      }).eq('id', med.id);
      fetchData();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDeleteMed = async (medId: string) => {
    try { await supabase.from('hotel_medications').delete().eq('id', medId); fetchData(); } catch { toast.error('Erro ao remover'); }
  };

  const handlePhotoUploadWithLabels = async (stayId: string, files: File[], labels: Record<string, string>) => {
    setUploadingStayId(stayId);
    try {
      const stay = stays.find(s => s.id === stayId);
      const newPhotos = [...(stay?.belongings_photos || [])];
      const newLabels = { ...(stay?.belonging_labels || {}) };
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${stayId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('hotel-belongings').upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('hotel-belongings').getPublicUrl(path);
        newPhotos.push(urlData.publicUrl);
        newLabels[urlData.publicUrl] = labels[`file_${i}`] || '';
      }
      await supabase.from('hotel_stays').update({ belongings_photos: newPhotos, belonging_labels: newLabels }).eq('id', stayId);
      toast.success('Foto(s) enviada(s) com etiqueta!');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingStayId(null);
      setPendingFiles(null);
      setUploadLabels({});
    }
  };

  const handleDeletePhoto = async (stayId: string, photoUrl: string) => {
    const stay = stays.find(s => s.id === stayId);
    if (!stay) return;
    const newPhotos = stay.belongings_photos.filter(p => p !== photoUrl);
    const newLabels = { ...stay.belonging_labels };
    delete newLabels[photoUrl];
    try {
      await supabase.from('hotel_stays').update({ belongings_photos: newPhotos, belonging_labels: newLabels }).eq('id', stayId);
      toast.success('Foto removida');
      fetchData();
    } catch { toast.error('Erro ao remover foto'); }
  };

  const handleUpdateLabel = async (stayId: string, photoUrl: string, label: string) => {
    const stay = stays.find(s => s.id === stayId);
    if (!stay) return;
    const newLabels = { ...(stay.belonging_labels || {}), [photoUrl]: label };
    try {
      await supabase.from('hotel_stays').update({ belonging_labels: newLabels }).eq('id', stayId);
      setStays(prev => prev.map(s => s.id === stayId ? { ...s, belonging_labels: newLabels } : s));
    } catch { /* silent */ }
  };

  const copySelectedDateHotel = () => {
    if (staysForSelectedDate.length === 0) return;
    const dateStr = format(selectedDate!, 'dd/MM/yyyy');
    const header = `\`HOTEL ${dateStr}:\``;
    const lines = staysForSelectedDate.map((s, i) => `${i + 1}. ${s.dog_name.toUpperCase()}`);
    const footer = `\`TOTAL:${staysForSelectedDate.length}\``;
    navigator.clipboard.writeText(`${header}\n\n${lines.join('\n\n')}\n\n${footer}`);
    toast.success('Lista copiada no formato WhatsApp!');
  };

  const getMedsForStay = (stayId: string) => medications.filter(m => m.hotel_stay_id === stayId);
  const getMealsForStay = (stayId: string) => meals.filter(m => m.hotel_stay_id === stayId);
  const recurrenceLabel = (val: string) => RECURRENCE_OPTIONS.find(o => o.value === val)?.label || val;

  const getStayDays = (stay: HotelStay): Date[] => {
    const start = new Date(stay.check_in);
    const end = stay.expected_checkout ? new Date(stay.expected_checkout) : new Date();
    return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
  };

  return (
    <>
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="active" className="gap-1 text-xs">
            <Hotel size={14} /> Hospedados
          </TabsTrigger>
          <TabsTrigger value="belongings" className="gap-1 text-xs">
            <Package size={14} /> Pertences
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs">
            <CalendarIcon size={14} /> Histórico
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 text-xs">
            <Timer size={14} /> Análise
          </TabsTrigger>
        </TabsList>

        {/* ===== ACTIVE STAYS ===== */}
        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hotel size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{stays.length} dog(s) hospedado(s)</span>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) { setSearchFilter(''); setSelectedClientId(''); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus size={14} /> Check-in</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Check-in Hotel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar por nome, raça ou tutor..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center",
                          selectedClientId === c.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40 bg-card'
                        )}
                      >
                        {c.photo ? (
                          <img src={c.photo} alt={c.name} className="w-12 h-12 rounded-full object-cover mb-1 border-2 border-border" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-1"><Dog size={20} className="text-muted-foreground" /></div>
                        )}
                        <p className="font-semibold text-xs text-foreground truncate w-full">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate w-full">{c.tutorName}</p>
                      </button>
                    ))}
                    {filteredClients.length === 0 && <p className="col-span-2 text-center text-sm text-muted-foreground py-8">Nenhum dog encontrado</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Data Entrada</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left text-sm h-9">
                            <CalendarIcon size={14} className="mr-2" />
                            {format(checkInDate, 'dd/MM/yyyy', { locale: ptBR })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={checkInDate} onSelect={(d) => d && setCheckInDate(d)} className="pointer-events-auto" locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Data Saída Prevista</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left text-sm h-9">
                            <CalendarIcon size={14} className="mr-2" />
                            {format(expectedCheckoutDate, 'dd/MM/yyyy', { locale: ptBR })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={expectedCheckoutDate} onSelect={(d) => d && setExpectedCheckoutDate(d)} className="pointer-events-auto" locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {differenceInDays(expectedCheckoutDate, checkInDate) + 1} dia(s) · {(differenceInDays(expectedCheckoutDate, checkInDate) + 1) * 2} refeições
                  </p>

                  <div>
                    <label className="text-sm font-medium text-foreground">Observações</label>
                    <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Alergias, comportamento, cuidados especiais..." className="mt-1" rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                  <Button onClick={handleAddStay} disabled={!selectedClientId}>Confirmar Check-in</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {recentCheckouts.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Undo2 size={10} /> Checkouts recentes (desfazer)
              </p>
              <div className="space-y-1">
                {recentCheckouts.slice(0, 5).map(stay => (
                  <div key={stay.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Dog size={12} className="text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{stay.dog_name}</span>
                      <span className="text-muted-foreground text-[10px]">{stay.check_out && format(new Date(stay.check_out), 'HH:mm')}</span>
                    </div>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => handleUndoCheckout(stay.id)}>
                      <Undo2 size={10} /> Desfazer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hotel size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum dog no hotel</p>
              <p className="text-xs mt-1">Faça um check-in para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stays.map(stay => {
                const isExpanded = expandedStay === stay.id;
                const stayMeds = getMedsForStay(stay.id);
                const stayMeals = getMealsForStay(stay.id);
                const pendingMeds = stayMeds.filter(m => !m.administered).length;
                const client = clients.find(c => c.id === stay.client_id);
                const stayDays = getStayDays(stay);
                const totalDays = stayDays.length;
                const daysElapsed = Math.max(1, differenceInDays(new Date(), new Date(stay.check_in)) + 1);
                const mealsEaten = stayMeals.filter(m => m.ate).length;
                const totalMealsExpected = totalDays * 2;
                const mealPercent = totalMealsExpected > 0 ? Math.round((mealsEaten / totalMealsExpected) * 100) : 0;

                return (
                  <div key={stay.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
                    {/* Collapsed header */}
                    <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedStay(isExpanded ? null : stay.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        {client?.photo ? (
                          <img src={client.photo} alt={stay.dog_name} className="w-11 h-11 rounded-full object-cover border-2 border-border shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Dog size={20} className="text-primary" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{stay.dog_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {client?.breed && <Badge variant="secondary" className="text-[8px] px-1.5 py-0">{client.breed}</Badge>}
                            {client?.petSize && <Badge variant="outline" className="text-[8px] px-1 py-0">{client.petSize}</Badge>}
                            <span className="text-[9px] text-muted-foreground">📅 {format(new Date(stay.check_in), 'dd/MM')} → {stay.expected_checkout ? format(new Date(stay.expected_checkout), 'dd/MM') : '?'}</span>
                            <span className="text-[9px] font-medium text-primary">{daysElapsed}/{totalDays}d</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Meal progress mini */}
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", mealPercent >= 70 ? "bg-green-500" : mealPercent >= 40 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${mealPercent}%` }} />
                          </div>
                          <span className="text-[8px] text-muted-foreground">{mealsEaten}/{totalMealsExpected}</span>
                        </div>
                        {pendingMeds > 0 && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            <Pill size={10} className="mr-0.5" />{pendingMeds}
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-3 space-y-4">
                        {/* Extra info */}
                        {client && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                            {client.petSize && <span>📏 Porte: <b className="text-foreground">{client.petSize}</b></span>}
                            {client.weight && <span>⚖️ Peso: <b className="text-foreground">{client.weight}kg</b></span>}
                            {client.gender && <span>{client.gender === 'Fêmea' ? '♀' : '♂'} Gênero: <b className="text-foreground">{client.gender}</b></span>}
                            {client.castrated !== undefined && <span>✂️ Castrado: <b className="text-foreground">{client.castrated ? 'Sim' : 'Não'}</b></span>}
                            {client.tutorPhone && <span>📞 Tel: <b className="text-foreground">{client.tutorPhone}</b></span>}
                            {stay.observations && <span className="col-span-2 sm:col-span-3">📝 {stay.observations}</span>}
                          </div>
                        )}

                        {/* Meals - Interactive Grid */}
                        <div>
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2">
                            <Utensils size={14} className="text-green-600" /> Refeições
                            <span className="text-[10px] text-muted-foreground font-normal ml-1">({mealsEaten}/{totalMealsExpected})</span>
                            <div className="flex-1 mx-2 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", mealPercent >= 70 ? "bg-green-500" : mealPercent >= 40 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${mealPercent}%` }} />
                            </div>
                            <span className="text-[10px] font-bold">{mealPercent}%</span>
                          </label>
                          <div className="overflow-x-auto -mx-1 px-1">
                            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `70px repeat(${Math.min(stayDays.length, 7)}, minmax(44px, 1fr))` }}>
                              <div />
                              {stayDays.slice(0, 7).map((day, i) => (
                                <div key={i} className={cn("text-[9px] text-center font-medium px-1 py-0.5 rounded", isSameDay(day, new Date()) ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground")}>
                                  {format(day, 'EEE', { locale: ptBR })}<br />{format(day, 'dd/MM')}
                                </div>
                              ))}
                              {MEAL_TYPES.map(mt => (
                                <React.Fragment key={mt.key}>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">{mt.icon} <span className="hidden sm:inline">{mt.label.split(' ')[1]}</span></div>
                                  {stayDays.slice(0, 7).map((day, i) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const meal = stayMeals.find(m => m.date === dateStr && m.meal_type === mt.key);
                                    const ate = meal?.ate || false;
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => handleToggleMeal(stay.id, dateStr, mt.key)}
                                        className={cn(
                                          "w-full h-9 rounded-lg border-2 text-sm font-bold transition-all active:scale-95",
                                          ate
                                            ? "bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400"
                                            : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                                        )}
                                      >
                                        {ate ? '✓' : '·'}
                                      </button>
                                    );
                                  })}
                                </React.Fragment>
                              ))}
                            </div>
                            {stayDays.length > 7 && (
                              <p className="text-[9px] text-muted-foreground mt-1">Mostrando 7 de {stayDays.length} dias</p>
                            )}
                          </div>
                        </div>

                        {/* Observations */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                            <FileText size={12} /> Observações
                          </label>
                          <Textarea defaultValue={stay.observations} onBlur={e => handleUpdateObservations(stay.id, e.target.value)} placeholder="Adicione observações..." rows={2} className="text-xs" />
                        </div>

                        {/* Inline photos */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                            <Camera size={12} /> Pertences ({stay.belongings_photos?.length || 0})
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {stay.belongings_photos?.map((url, i) => (
                              <div key={i} className="relative group">
                                <button onClick={() => setLightboxUrl(url)} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all">
                                  <img src={url} alt={stay.belonging_labels?.[url] || `Pertence ${i + 1}`} className="w-full h-full object-cover" />
                                </button>
                                <button
                                  onClick={() => handleDeletePhoto(stay.id, url)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                >
                                  <X size={10} />
                                </button>
                                {stay.belonging_labels?.[url] && (
                                  <p className="text-[7px] text-center text-muted-foreground truncate w-14 mt-0.5">{stay.belonging_labels[url]}</p>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => { setUploadingStayId(stay.id); cameraInputRef.current?.click(); }}
                              disabled={uploadingStayId === stay.id}
                              className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                            >
                              {uploadingStayId === stay.id ? <span className="animate-spin text-xs">⏳</span> : (
                                <>
                                  <Camera size={14} />
                                  <span className="text-[7px] mt-0.5">Foto</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => { setUploadingStayId(stay.id); fileInputRef.current?.click(); }}
                              disabled={uploadingStayId === stay.id}
                              className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                            >
                              <Plus size={14} />
                              <span className="text-[7px] mt-0.5">Arquivo</span>
                            </button>
                          </div>
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={e => {
                              if (uploadingStayId && e.target.files && e.target.files.length > 0) {
                                const filesArr = Array.from(e.target.files);
                                setPendingFiles({ stayId: uploadingStayId, files: filesArr });
                                setUploadLabels({});
                              }
                              e.target.value = '';
                            }}
                          />
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => {
                              if (uploadingStayId && e.target.files && e.target.files.length > 0) {
                                const filesArr = Array.from(e.target.files);
                                setPendingFiles({ stayId: uploadingStayId, files: filesArr });
                                setUploadLabels({});
                              }
                              e.target.value = '';
                            }}
                          />
                        </div>

                        {pendingFiles && pendingFiles.stayId === stay.id && (
                          <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
                            <p className="text-xs font-medium text-foreground">Etiquetas para {pendingFiles.files.length} foto(s):</p>
                            {pendingFiles.files.map((file, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <img src={URL.createObjectURL(file)} alt="" className="w-10 h-10 rounded object-cover border border-border" />
                                <Input
                                  placeholder="Ex: Coleira azul"
                                  value={uploadLabels[`file_${i}`] || ''}
                                  onChange={e => setUploadLabels(prev => ({ ...prev, [`file_${i}`]: e.target.value }))}
                                  className="h-7 text-xs flex-1"
                                />
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handlePhotoUploadWithLabels(pendingFiles.stayId, pendingFiles.files, uploadLabels)}>
                                <Check size={12} className="mr-1" /> Enviar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setPendingFiles(null); setUploadLabels({}); setUploadingStayId(null); }}>
                                <X size={12} />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Medications */}
                        <div>
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2">
                            <Pill size={14} className="text-purple-600" /> Remédios
                            {stayMeds.length > 0 && stay.expected_checkout && (
                              <span className="text-[9px] text-muted-foreground ml-1 font-normal">
                                ({Math.max(0, differenceInDays(new Date(stay.expected_checkout), new Date()))} dias restantes)
                              </span>
                            )}
                          </label>
                          {stayMeds.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {stayMeds.map(med => (
                                <div
                                  key={med.id}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-lg border-2 text-xs transition-all",
                                    med.administered ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-card border-border hover:border-primary/30'
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      onClick={() => handleToggleMed(med)}
                                      className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                        med.administered ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 hover:border-primary"
                                      )}
                                    >
                                      {med.administered && <Check size={12} />}
                                    </button>
                                    <Clock size={12} className="text-muted-foreground shrink-0" />
                                    <span className="font-mono">{med.scheduled_time.slice(0, 5)}</span>
                                    <span className="font-medium truncate">{med.medication_name}</span>
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">{recurrenceLabel(med.recurrence)}</Badge>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {med.administered && med.administered_at && (
                                      <span className="text-[9px] text-green-600">✓ {format(new Date(med.administered_at), 'HH:mm')}</span>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteMed(med.id)}>
                                      <Trash2 size={12} className="text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {addMedStayId === stay.id ? (
                            <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                              <div className="flex gap-2">
                                <Input placeholder="Nome do remédio" value={medName} onChange={e => setMedName(e.target.value)} className="text-xs h-8 flex-1" />
                                <Input type="time" value={medTime} onChange={e => setMedTime(e.target.value)} className="text-xs h-8 w-24" />
                              </div>
                              <div className="flex gap-2 items-center">
                                <Select value={medRecurrence} onValueChange={setMedRecurrence}>
                                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Recorrência" /></SelectTrigger>
                                  <SelectContent>
                                    {RECURRENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" className="h-8" onClick={() => handleAddMedication(stay.id)}><Check size={14} /></Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddMedStayId(null)}><X size={14} /></Button>
                              </div>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="gap-1 text-xs w-full" onClick={() => { setAddMedStayId(stay.id); setMedName(''); setMedTime(''); setMedRecurrence('once'); }}>
                              <Plus size={12} /> Adicionar Remédio
                            </Button>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={() => handleCheckout(stay)}>
                            <Check size={14} /> Checkout
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1 text-xs">
                                <CalendarIcon size={14} /> Prolongar
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={stay.expected_checkout ? new Date(stay.expected_checkout) : undefined}
                                onSelect={async (d) => {
                                  if (!d) return;
                                  try {
                                    // Extend expected checkout
                                    await supabase.from('hotel_stays').update({ expected_checkout: d.toISOString() }).eq('id', stay.id);
                                    // Add meal rows for new days
                                    const oldEnd = stay.expected_checkout ? startOfDay(new Date(stay.expected_checkout)) : startOfDay(new Date());
                                    const newEnd = startOfDay(d);
                                    if (newEnd > oldEnd) {
                                      const newDays = eachDayOfInterval({ start: addDays(oldEnd, 1), end: newEnd });
                                      const newMealRows = newDays.flatMap(day =>
                                        MEAL_TYPES.map(mt => ({ hotel_stay_id: stay.id, date: format(day, 'yyyy-MM-dd'), meal_type: mt.key, ate: false }))
                                      );
                                      if (newMealRows.length > 0) await supabase.from('hotel_meals').insert(newMealRows);
                                    }
                                    toast.success(`Estadia de ${stay.dog_name} prolongada até ${format(d, 'dd/MM')}!`);
                                    fetchData();
                                  } catch { toast.error('Erro ao prolongar'); }
                                }}
                                locale={ptBR}
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          {deleteConfirmId === stay.id ? (
                            <div className="flex gap-1">
                              <Button variant="destructive" size="sm" className="gap-1 text-[10px]" onClick={() => handleDeleteStay(stay.id)}>
                                Confirmar
                              </Button>
                              <Button variant="outline" size="sm" className="text-[10px]" onClick={() => setDeleteConfirmId(null)}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmId(stay.id)}>
                              <Trash2 size={14} /> Apagar
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== BELONGINGS TAB ===== */}
        <TabsContent value="belongings" className="space-y-4">
          {stays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum dog hospedado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {stays.map(stay => {
                const photos = stay.belongings_photos || [];
                const labels = stay.belonging_labels || {};
                if (photos.length === 0) return null;
                return (
                  <div key={stay.id} className="bg-card border border-border rounded-xl p-4 shadow-soft space-y-3">
                    <div className="flex items-center gap-2">
                      <Dog size={16} className="text-primary" />
                      <h4 className="text-sm font-bold text-foreground">{stay.dog_name}</h4>
                      <Badge variant="secondary" className="text-[10px]">{photos.length} item(ns)</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {photos.map((url, i) => (
                        <div key={i} className="space-y-1.5 group">
                          <button onClick={() => setLightboxUrl(url)} className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                            <img src={url} alt={labels[url] || `Pertence ${i + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <Tag size={10} className="text-muted-foreground shrink-0" />
                            <Input
                              placeholder="Ex: Coleira azul"
                              value={labels[url] || ''}
                              onChange={e => setStays(prev => prev.map(s => s.id === stay.id ? { ...s, belonging_labels: { ...s.belonging_labels, [url]: e.target.value } } : s))}
                              onBlur={e => handleUpdateLabel(stay.id, url, e.target.value)}
                              className="h-6 text-[10px] px-1.5"
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDeletePhoto(stay.id, url)}>
                              <Trash2 size={10} className="text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {stays.every(s => !s.belongings_photos?.length) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Camera size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum pertence registrado</p>
                  <p className="text-xs mt-1">Adicione fotos na aba Hospedados</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarIcon size={16} className="text-primary" />
              Calendário de Estadias
            </h3>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-shrink-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{ hasStay: (date) => datesWithStays.has(format(date, 'yyyy-MM-dd')) }}
                  modifiersStyles={{ hasStay: { backgroundColor: 'hsl(24, 95%, 60%)', color: 'white', borderRadius: '50%' } }}
                />
              </div>
              <div className="flex-1 min-w-0">
                {selectedDate ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</h4>
                      {staysForSelectedDate.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={copySelectedDateHotel}>
                          <Copy size={14} /> Copiar
                        </Button>
                      )}
                    </div>
                    {staysForSelectedDate.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma estadia neste dia</p>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-xs">{staysForSelectedDate.length} estadia(s)</Badge>
                        <div className="space-y-2">
                          {staysForSelectedDate.map((s, i) => (
                            <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                              <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}.</span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs text-foreground truncate">{s.dog_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{s.tutor_name}</p>
                                {s.check_out && <p className="text-[10px] text-muted-foreground">Checkout: {format(new Date(s.check_out), 'dd/MM HH:mm')}</p>}
                              </div>
                              <Badge variant={s.active ? 'default' : 'secondary'} className="text-[9px]">
                                {s.active ? 'Ativo' : 'Checkout'}
                              </Badge>
                              {deleteConfirmId === s.id ? (
                                <div className="flex gap-1">
                                  <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDeleteStay(s.id)}>
                                    <Check size={12} />
                                  </Button>
                                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirmId(null)}>
                                    <X size={12} />
                                  </Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmId(s.id)}>
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">Selecione uma data para ver as estadias</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <HotelAnalyticsTab />
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/95 border-none">
            <button onClick={() => setLightboxUrl(null)} className="absolute top-3 right-3 z-50 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors">
              <X size={20} />
            </button>
            <img src={lightboxUrl} alt="Pertence" className="w-full h-full max-h-[90vh] object-contain rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default HotelTab;
