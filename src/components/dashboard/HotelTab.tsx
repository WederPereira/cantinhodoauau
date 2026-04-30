import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { format, startOfDay, differenceInDays, addDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Hotel, Plus, Camera, Pill, Clock, Trash2, X, ChevronDown, ChevronUp,
  Check, FileText, Dog, Bell, Search, Copy, Calendar as CalendarIcon,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAction } from '@/hooks/useActionLog';
import { PetPhotoFrame } from '@/components/PetPhotoFrame';

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
  ate: boolean | null;
}

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Dose única' },
  { value: 'every_6h', label: 'A cada 6h' },
  { value: 'every_8h', label: 'A cada 8h' },
  { value: 'every_12h', label: 'A cada 12h' },
  { value: 'every_24h', label: '1x ao dia' },
];

const MEAL_TYPES = [
  { key: 'almoco', label: 'Almoço' },
  { key: 'janta', label: 'Janta' },
];

const getMealForCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // Until 18:30 show lunch, after that show dinner
  return totalMinutes <= 18 * 60 + 30 ? 'almoco' : 'janta';
};

const HotelTab: React.FC = () => {
  const { clients } = useClients();
  const [stays, setStays] = useState<HotelStay[]>([]);
  const [allStays, setAllStays] = useState<HotelStay[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [meals, setMeals] = useState<HotelMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStay, setExpandedStay] = useState<string | null>(null);
  const [sheetStayId, setSheetStayId] = useState<string | null>(null);
  const [activeSearch, setActiveSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [observations, setObservations] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [expectedCheckoutDate, setExpectedCheckoutDate] = useState<Date | undefined>(undefined);
  // Check-in step state
  const [checkinStep, setCheckinStep] = useState<1 | 2 | 3>(1);
  // Inline meds for check-in
  const [checkinMeds, setCheckinMeds] = useState<Array<{ name: string; time: string; recurrence: string }>>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('');
  const [newMedRecurrence, setNewMedRecurrence] = useState('once');
  // Inline photos for check-in
  const [checkinPhotos, setCheckinPhotos] = useState<Array<{ file: File; label: string }>>([]);
  const checkinFileRef = useRef<HTMLInputElement>(null);
  const checkinCameraRef = useRef<HTMLInputElement>(null);

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
        .from('hotel_stays').select('*').eq('active', true).order('check_in', { ascending: false });
      if (sErr) throw sErr;

      const { data: allData } = await supabase
        .from('hotel_stays').select('*').order('check_in', { ascending: false });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentCO } = await supabase
        .from('hotel_stays').select('*').eq('active', false).gte('check_out', oneDayAgo).order('check_out', { ascending: false });

      const activeIds = (staysData || []).map((s: any) => s.id);
      let medsData: any[] = [];
      let mealsData: any[] = [];
      if (activeIds.length > 0) {
        const { data: md } = await supabase.from('hotel_medications').select('*').in('hotel_stay_id', activeIds).order('scheduled_time', { ascending: true });
        const { data: ml } = await supabase.from('hotel_meals').select('*').in('hotel_stay_id', activeIds).order('date', { ascending: true });
        medsData = md || [];
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
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.breed.toLowerCase().includes(q) || c.tutorName.toLowerCase().includes(q));
  }, [clients, searchFilter]);

  const filteredActiveStays = useMemo(() => {
    if (!activeSearch) return stays;
    const q = activeSearch.toLowerCase();
    return stays.filter(s => s.dog_name.toLowerCase().includes(q) || s.tutor_name.toLowerCase().includes(q));
  }, [stays, activeSearch]);

  const datesWithStays = useMemo(() => {
    const set = new Set<string>();
    allStays.forEach(s => set.add(format(new Date(s.check_in), 'yyyy-MM-dd')));
    return set;
  }, [allStays]);

  const staysForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayStart = startOfDay(selectedDate);
    return allStays.filter(s => startOfDay(new Date(s.check_in)).getTime() === dayStart.getTime());
  }, [allStays, selectedDate]);

  const resetCheckinForm = () => {
    setSelectedClientId('');
    setObservations('');
    setSearchFilter('');
    setCheckInDate(new Date());
    setExpectedCheckoutDate(undefined);
    setCheckinStep(1);
    setCheckinMeds([]);
    setCheckinPhotos([]);
    setNewMedName('');
    setNewMedTime('');
    setNewMedRecurrence('once');
  };

  const handleAddStay = async () => {
    if (!selectedClientId) { toast.error('Selecione um dog'); return; }
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    try {
      const { error } = await supabase.from('hotel_stays').insert({
        client_id: client.id, dog_name: client.name, tutor_name: client.tutorName,
        observations, check_in: checkInDate.toISOString(), expected_checkout: expectedCheckoutDate ? expectedCheckoutDate.toISOString() : null,
      });
      if (error) throw error;

      const days = eachDayOfInterval({ start: checkInDate, end: expectedCheckoutDate || addDays(checkInDate, 30) });
      const { data: newStay } = await supabase
        .from('hotel_stays').select('id').eq('client_id', client.id).eq('active', true)
        .order('created_at', { ascending: false }).limit(1).single();

      if (newStay) {
        // Insert meals
        const mealRows = days.flatMap(day => MEAL_TYPES.map(mt => ({
          hotel_stay_id: newStay.id, date: format(day, 'yyyy-MM-dd'), meal_type: mt.key, ate: null,
        })));
        if (mealRows.length > 0) await supabase.from('hotel_meals').insert(mealRows);

        // Insert medications from check-in form
        if (checkinMeds.length > 0) {
          const medRows = checkinMeds.map(m => ({
            hotel_stay_id: newStay.id, medication_name: m.name, scheduled_time: m.time, recurrence: m.recurrence,
          }));
          await supabase.from('hotel_medications').insert(medRows);
        }

        // Upload belongings photos from check-in form
        if (checkinPhotos.length > 0) {
          const photoUrls: string[] = [];
          const photoLabels: Record<string, string> = {};
          for (const p of checkinPhotos) {
            const ext = p.file.name.split('.').pop();
            const path = `${newStay.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const { error: upErr } = await supabase.storage.from('hotel-belongings').upload(path, p.file);
            if (upErr) { console.error(upErr); continue; }
            const { data: urlData } = supabase.storage.from('hotel-belongings').getPublicUrl(path);
            photoUrls.push(urlData.publicUrl);
            if (p.label) photoLabels[urlData.publicUrl] = p.label;
          }
          if (photoUrls.length > 0) {
            await supabase.from('hotel_stays').update({ belongings_photos: photoUrls, belonging_labels: photoLabels }).eq('id', newStay.id);
          }
        }

        logAction('checkin', 'hotel', newStay.id, { dog_name: client.name, tutor_name: client.tutorName });
        setExpandedStay(newStay.id);
      }

      toast.success(`${client.name} entrou no hotel! 🏨`);
      setAddDialogOpen(false);
      resetCheckinForm();
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar entrada');
    }
  };

  const handleCheckout = async (stay: HotelStay) => {
    try {
      const { error } = await supabase.from('hotel_stays').update({ active: false, check_out: new Date().toISOString() }).eq('id', stay.id);
      if (error) throw error;
      logAction('checkout', 'hotel', stay.id, { dog_name: stay.dog_name, tutor_name: stay.tutor_name });
      toast.success(`${stay.dog_name} fez checkout!`, { duration: 8000, action: { label: 'Desfazer', onClick: () => handleUndoCheckout(stay.id) } });
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

  const handleSetMeal = async (stayId: string, date: string, mealType: string, ateValue: boolean) => {
    const existing = meals.find(m => m.hotel_stay_id === stayId && m.date === date && m.meal_type === mealType);
    try {
      if (existing) {
        // If clicking the same value, keep it (don't toggle to null)
        const newVal = existing.ate === ateValue ? null : ateValue;
        await supabase.from('hotel_meals').update({ ate: newVal }).eq('id', existing.id);
        logAction('mark_meal', 'meal', existing.id, { meal_type: mealType, date, ate: newVal });
      } else {
        const { data: newMeal } = await supabase.from('hotel_meals').insert({ hotel_stay_id: stayId, date, meal_type: mealType, ate: ateValue }).select('id').single();
        logAction('mark_meal', 'meal', newMeal?.id, { meal_type: mealType, date, ate: ateValue });
      }
      fetchData();
    } catch { toast.error('Erro ao atualizar refeição'); }
  };

  const handleUpdateObservations = async (stayId: string, obs: string) => {
    try { await supabase.from('hotel_stays').update({ observations: obs, updated_at: new Date().toISOString() }).eq('id', stayId); toast.success('Observação salva'); } catch { toast.error('Erro ao salvar'); }
  };

  const handleAddMedication = async (stayId: string) => {
    if (!medName || !medTime) { toast.error('Preencha nome e horário'); return; }
    try {
      await supabase.from('hotel_medications').insert({ hotel_stay_id: stayId, medication_name: medName, scheduled_time: medTime, recurrence: medRecurrence });
      toast.success(`Remédio ${medName} adicionado`);
      setMedName(''); setMedTime(''); setMedRecurrence('once'); setAddMedStayId(null);
      fetchData();
    } catch { toast.error('Erro ao adicionar remédio'); }
  };

  const handleToggleMed = async (med: Medication) => {
    try {
      await supabase.from('hotel_medications').update({ administered: !med.administered, administered_at: !med.administered ? new Date().toISOString() : null }).eq('id', med.id);
      if (!med.administered) logAction('administer_med', 'medication', med.id, { medication_name: med.medication_name });
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
      toast.success('Foto(s) enviada(s)!');
      fetchData();
    } catch (err) { console.error(err); toast.error('Erro ao enviar foto'); }
    finally { setUploadingStayId(null); setPendingFiles(null); setUploadLabels({}); }
  };

  const handleDeletePhoto = async (stayId: string, photoUrl: string) => {
    const stay = stays.find(s => s.id === stayId);
    if (!stay) return;
    const newPhotos = stay.belongings_photos.filter(p => p !== photoUrl);
    const newLabels = { ...stay.belonging_labels }; delete newLabels[photoUrl];
    try { await supabase.from('hotel_stays').update({ belongings_photos: newPhotos, belonging_labels: newLabels }).eq('id', stayId); toast.success('Foto removida'); fetchData(); } catch { toast.error('Erro ao remover foto'); }
  };

  const handleUpdateLabel = async (stayId: string, photoUrl: string, label: string) => {
    const stay = stays.find(s => s.id === stayId);
    if (!stay) return;
    const newLabels = { ...(stay.belonging_labels || {}), [photoUrl]: label };
    try { await supabase.from('hotel_stays').update({ belonging_labels: newLabels }).eq('id', stayId); setStays(prev => prev.map(s => s.id === stayId ? { ...s, belonging_labels: newLabels } : s)); } catch { /* silent */ }
  };

  const copySelectedDateHotel = () => {
    if (staysForSelectedDate.length === 0) return;
    const dateStr = format(selectedDate!, 'dd/MM/yyyy');
    const header = `\`HOTEL ${dateStr}:\``;
    const lines = staysForSelectedDate.map((s, i) => `${i + 1}. ${s.dog_name.toUpperCase()}`);
    const footer = `\`TOTAL:${staysForSelectedDate.length}\``;
    navigator.clipboard.writeText(`${header}\n\n${lines.join('\n\n')}\n\n${footer}`);
    toast.success('Lista copiada!');
  };

  const getMedsForStay = (stayId: string) => medications.filter(m => m.hotel_stay_id === stayId);
  const getMealsForStay = (stayId: string) => meals.filter(m => m.hotel_stay_id === stayId);
  const recurrenceLabel = (val: string) => RECURRENCE_OPTIONS.find(o => o.value === val)?.label || val;

  const getStayDays = (stay: HotelStay): Date[] => {
    const start = new Date(stay.check_in);
    const end = stay.expected_checkout ? new Date(stay.expected_checkout) : new Date();
    return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
  };

  // ============ RENDER ============
  return (
    <>
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="active" className="gap-1.5 text-xs font-medium">
            <Hotel size={14} /> Hospedados
            {stays.length > 0 && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-0.5">{stays.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="belongings-all" className="gap-1.5 text-xs font-medium">
            <Package size={14} /> Pertences
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs font-medium">
            <CalendarIcon size={14} /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ===== ACTIVE STAYS ===== */}
        <TabsContent value="active" className="space-y-4">
          {/* Check-in button */}
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetCheckinForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 h-11 text-sm font-semibold rounded-xl">
                <Plus size={16} /> Novo Check-in
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Hotel size={18} className="text-primary" /> Check-in Hotel
                </DialogTitle>
              </DialogHeader>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3].map(step => (
                  <button
                    key={step}
                    onClick={() => step === 1 || (step === 2 && selectedClientId) || (step === 3 && selectedClientId) ? setCheckinStep(step as 1|2|3) : null}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-all",
                      checkinStep >= step ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
                <span className={checkinStep === 1 ? "text-primary font-semibold" : ""}>1. Dog & Datas</span>
                <span className={checkinStep === 2 ? "text-primary font-semibold" : ""}>2. Pertences</span>
                <span className={checkinStep === 3 ? "text-primary font-semibold" : ""}>3. Remédios</span>
              </div>

              {/* Step 1: Select dog + dates */}
              {checkinStep === 1 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar dog..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-9" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className={cn(
                          "flex flex-col items-center p-2 rounded-xl border-2 transition-all text-center",
                          selectedClientId === c.id ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border hover:border-primary/40 bg-card'
                        )}
                      >
                        {c.photo ? (
                          <img src={c.photo} alt={c.name} className="w-12 h-12 rounded-xl object-cover mb-1 border border-border" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-1"><Dog size={20} className="text-muted-foreground" /></div>
                        )}
                        <p className="font-semibold text-[10px] text-foreground truncate w-full">{c.name}</p>
                        <p className="text-[8px] text-muted-foreground truncate w-full">{c.breed}</p>
                      </button>
                    ))}
                    {filteredClients.length === 0 && <p className="col-span-3 text-center text-xs text-muted-foreground py-6">Nenhum dog encontrado</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Entrada</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left text-xs h-9">
                            <CalendarIcon size={12} className="mr-1.5" />
                            {format(checkInDate, 'dd/MM/yy', { locale: ptBR })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={checkInDate} onSelect={(d) => d && setCheckInDate(d)} className="pointer-events-auto" locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Saída Prevista</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left text-xs h-9">
                            <CalendarIcon size={12} className="mr-1.5" />
                            {expectedCheckoutDate ? format(expectedCheckoutDate, 'dd/MM/yy', { locale: ptBR }) : 'Indeterminado'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={expectedCheckoutDate} onSelect={(d) => setExpectedCheckoutDate(d)} className="pointer-events-auto" locale={ptBR} />
                          <div className="p-2 border-t">
                            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpectedCheckoutDate(undefined)}>Indeterminado</Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {expectedCheckoutDate ? `${differenceInDays(expectedCheckoutDate, checkInDate) + 1} dia(s) · ${(differenceInDays(expectedCheckoutDate, checkInDate) + 1) * 2} refeições` : 'Estadia por tempo indeterminado'}
                  </p>

                  <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observações (alergias, comportamento...)" rows={2} className="text-xs" />

                  <Button className="w-full" onClick={() => { if (!selectedClientId) { toast.error('Selecione um dog'); return; } setCheckinStep(2); }} disabled={!selectedClientId}>
                    Próximo: Pertences →
                  </Button>
                </div>
              )}

              {/* Step 2: Belongings photos */}
              {checkinStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Fotografe os pertences do dog para registro.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => checkinCameraRef.current?.click()}>
                      <Camera size={14} /> Tirar Foto
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => checkinFileRef.current?.click()}>
                      <Plus size={14} /> Galeria
                    </Button>
                  </div>
                  <input ref={checkinCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                    if (e.target.files?.[0]) setCheckinPhotos(prev => [...prev, { file: e.target.files![0], label: '' }]);
                    e.target.value = '';
                  }} />
                  <input ref={checkinFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files).map(f => ({ file: f, label: '' }));
                      setCheckinPhotos(prev => [...prev, ...newFiles]);
                    }
                    e.target.value = '';
                  }} />

                  {checkinPhotos.length > 0 && (
                    <div className="space-y-2">
                      {checkinPhotos.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                          <img src={URL.createObjectURL(p.file)} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
                          <Input
                            placeholder="Ex: Coleira azul"
                            value={p.label}
                            onChange={e => setCheckinPhotos(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                            className="h-8 text-xs flex-1"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCheckinPhotos(prev => prev.filter((_, j) => j !== i))}>
                            <X size={14} className="text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {checkinPhotos.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Camera size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Nenhum pertence adicionado</p>
                      <p className="text-[10px]">Você pode pular esta etapa</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setCheckinStep(1)}>← Voltar</Button>
                    <Button className="flex-1" onClick={() => setCheckinStep(3)}>Próximo: Remédios →</Button>
                  </div>
                </div>
              )}

              {/* Step 3: Medications */}
              {checkinStep === 3 && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Adicione remédios que o dog precisa tomar durante a estadia.</p>

                  {checkinMeds.length > 0 && (
                    <div className="space-y-1.5">
                      {checkinMeds.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5 text-xs">
                          <Pill size={14} className="text-purple-500 shrink-0" />
                          <span className="font-medium flex-1">{m.name}</span>
                          <span className="font-mono text-muted-foreground">{m.time}</span>
                          <Badge variant="outline" className="text-[8px] px-1 py-0">{recurrenceLabel(m.recurrence)}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCheckinMeds(prev => prev.filter((_, j) => j !== i))}>
                            <X size={12} className="text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Nome do remédio" value={newMedName} onChange={e => setNewMedName(e.target.value)} className="text-xs h-8 flex-1" />
                      <Input type="time" value={newMedTime} onChange={e => setNewMedTime(e.target.value)} className="text-xs h-8 w-24" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select value={newMedRecurrence} onValueChange={setNewMedRecurrence}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-8 gap-1" onClick={() => {
                        if (!newMedName || !newMedTime) { toast.error('Preencha nome e horário'); return; }
                        setCheckinMeds(prev => [...prev, { name: newMedName, time: newMedTime, recurrence: newMedRecurrence }]);
                        setNewMedName(''); setNewMedTime(''); setNewMedRecurrence('once');
                      }}>
                        <Plus size={12} /> Adicionar
                      </Button>
                    </div>
                  </div>

                  {checkinMeds.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Pill size={28} className="mx-auto mb-1.5 opacity-30" />
                      <p className="text-[10px]">Nenhum remédio adicionado · Você pode pular esta etapa</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setCheckinStep(2)}>← Voltar</Button>
                    <Button className="flex-1 gap-1.5" onClick={handleAddStay}>
                      <Check size={14} /> Confirmar Check-in
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Search bar */}
          {stays.length > 0 && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar dog ou tutor..."
                  value={activeSearch}
                  onChange={e => setActiveSearch(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-xl"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const dateStr = format(new Date(), 'dd/MM/yyyy');
                const lines = filteredActiveStays.map((s, idx) => {
                  const client = clients.find(c => c.id === s.client_id);
                  const breed = client?.breed || s.dog_name;
                  const todayMeals = getMealsForStay(s.id).filter(m => m.date === today && m.ate !== null);
                  let status = '📋 Sem registro';
                  if (todayMeals.length > 0) {
                    const ateCount = todayMeals.filter(m => m.ate === true).length;
                    const notAteCount = todayMeals.filter(m => m.ate === false).length;
                    if (ateCount > 0 && notAteCount === 0) status = '✅ Comeu';
                    else if (notAteCount > 0 && ateCount === 0) status = '❌ Não comeu';
                    else status = '⚠️ Parcial';
                  }
                  return `${idx + 1}. ${s.dog_name} (${breed}) - ${status}`;
                }).join('\n');
                const list = `HOTEL ${dateStr}:\n${lines}`;
                navigator.clipboard.writeText(list);
                toast.success('Lista do hotel copiada!');
              }} className="h-9 w-9 shrink-0" title="Copiar lista">
                <Copy size={16} />
              </Button>
            </div>
          )}

          {/* Recent checkouts - undo bar */}
          {recentCheckouts.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Undo2 size={10} /> Checkouts recentes
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentCheckouts.slice(0, 5).map(stay => (
                  <button key={stay.id} onClick={() => handleUndoCheckout(stay.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs shrink-0 hover:border-primary/50 transition-colors">
                    <Undo2 size={10} className="text-primary" />
                    <span className="font-medium">{stay.dog_name}</span>
                    <span className="text-[10px] text-muted-foreground">{stay.check_out && format(new Date(stay.check_out), 'HH:mm')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active stays as cards grid */}
          {filteredActiveStays.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Hotel size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">{activeSearch ? 'Nenhum resultado' : 'Nenhum dog no hotel'}</p>
              <p className="text-xs mt-1 opacity-60">{activeSearch ? 'Tente outro termo' : 'Faça um check-in para começar'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredActiveStays.map(stay => {
                const stayMeds = getMedsForStay(stay.id);
                const stayMeals = getMealsForStay(stay.id);
                const pendingMeds = stayMeds.filter(m => !m.administered).length;
                const client = clients.find(c => c.id === stay.client_id);
                const stayDays = getStayDays(stay);
                const totalDays = stayDays.length;
                const daysElapsed = Math.max(1, differenceInDays(new Date(), new Date(stay.check_in)) + 1);
                const mealsEaten = stayMeals.filter(m => m.ate === true).length;
                const mealsNotEaten = stayMeals.filter(m => m.ate === false).length;
                const mealsMarked = mealsEaten + mealsNotEaten;
                const mealsExpectedUpToToday = daysElapsed * 2;
                const mealPercent = mealsExpectedUpToToday > 0 ? Math.round((mealsMarked / mealsExpectedUpToToday) * 100) : 0;
                const hasPhotos = (stay.belongings_photos?.length || 0) > 0;

                // Today's meals
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const todayMeals = MEAL_TYPES.map(mt => {
                  const meal = stayMeals.find(m => m.date === todayStr && m.meal_type === mt.key);
                  return { ...mt, ate: meal?.ate ?? null };
                });

                return (
                  <div
                    key={stay.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    {/* Large photo - clickable to open sheet */}
                    <PetPhotoFrame
                      clientId={client?.id}
                      dogName={stay.dog_name}
                      tutorName={stay.tutor_name}
                      photoUrl={client?.photo}
                      alt={stay.dog_name}
                      rounded="md"
                      ringWidth={4}
                      className="aspect-[4/3] cursor-pointer active:scale-[0.98] transition-transform rounded-none"
                      onClick={() => setSheetStayId(stay.id)}
                      fallback={(
                        <div className="w-full h-full flex items-center justify-center">
                          <Dog size={36} className="text-muted-foreground/30" />
                        </div>
                      )}
                    >
                      {/* Badges overlay */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                        {pendingMeds > 0 && (
                          <Badge variant="destructive" className="text-[8px] px-1.5 py-0 animate-pulse">
                            <Pill size={8} className="mr-0.5" />{pendingMeds}
                          </Badge>
                        )}
                        {hasPhotos && (
                          <Badge variant="secondary" className="text-[8px] px-1.5 py-0">
                            <Package size={8} className="mr-0.5" />{stay.belongings_photos?.length}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 pt-6 z-10">
                        <p className="font-bold text-sm text-white truncate">{stay.dog_name}</p>
                        <p className="text-[10px] text-white/70 truncate">{stay.tutor_name}</p>
                      </div>
                    </PetPhotoFrame>
                    {/* Info + meal buttons below photo */}
                    <div className="p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>📅 {format(new Date(stay.check_in), 'dd/MM')} → {stay.expected_checkout ? format(new Date(stay.expected_checkout), 'dd/MM') : '?'}</span>
                        <Badge variant="secondary" className="text-[8px] px-1 py-0">{daysElapsed}/{totalDays}d</Badge>
                      </div>
                      {/* Today's meal button - time based */}
                      {(() => {
                        const currentMealKey = getMealForCurrentTime();
                        const currentMeal = MEAL_TYPES.find(mt => mt.key === currentMealKey)!;
                        const ateVal = todayMeals.find(m => m.key === currentMealKey)?.ate ?? null;
                        const isLunch = currentMealKey === 'almoco';
                        return (
                          <div className="space-y-1.5">
                            <div className={cn(
                              "rounded-lg p-1 transition-all",
                              isLunch
                                ? "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30"
                                : "bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-950/30 dark:to-purple-950/30"
                            )}>
                              <p className={cn("text-[9px] font-bold text-center mb-1",
                                isLunch ? "text-amber-700 dark:text-amber-400" : "text-indigo-700 dark:text-indigo-400"
                              )}>
                                {currentMeal.label}
                              </p>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSetMeal(stay.id, todayStr, currentMealKey, true); }}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-md text-[10px] font-semibold border transition-all active:scale-95",
                                    ateVal === true
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "bg-card border-border hover:border-primary/40 text-muted-foreground"
                                  )}
                                >
                                  ✅ Comeu
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSetMeal(stay.id, todayStr, currentMealKey, false); }}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-md text-[10px] font-semibold border transition-all active:scale-95",
                                    ateVal === false
                                      ? "bg-destructive border-destructive text-destructive-foreground"
                                      : "bg-card border-border hover:border-destructive/40 text-muted-foreground"
                                  )}
                                >
                                  ❌ Não
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", mealPercent >= 70 ? "bg-[hsl(var(--status-ok))]" : mealPercent >= 40 ? "bg-[hsl(var(--status-warning))]" : "bg-destructive")} style={{ width: `${mealPercent}%` }} />
                        </div>
                        <span className="text-[8px] text-muted-foreground font-mono">{mealsMarked}/{mealsExpectedUpToToday} analisadas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== DOG PROFILE SHEET ===== */}
          <Sheet open={!!sheetStayId} onOpenChange={(open) => { if (!open) setSheetStayId(null); }}>
            <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto p-0">
              {sheetStayId && (() => {
                const stay = stays.find(s => s.id === sheetStayId);
                if (!stay) return null;
                const client = clients.find(c => c.id === stay.client_id);
                const stayMeals = getMealsForStay(stay.id);
                const stayMeds = getMedsForStay(stay.id);
                const stayDays = getStayDays(stay);
                const totalDays = stayDays.length;
                const daysElapsed = Math.max(1, differenceInDays(new Date(), new Date(stay.check_in)) + 1);
                const todayStr = format(new Date(), 'yyyy-MM-dd');

                return (
                  <div>
                    {/* Profile header */}
                    <div className="relative">
                      <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/10 relative overflow-hidden">
                        {client?.photo && (
                          <img src={client.photo} alt={stay.dog_name} className="w-full h-full object-cover opacity-40" />
                        )}
                      </div>
                      <div className="absolute -bottom-8 left-4">
                        {client?.photo ? (
                          <img onClick={() => client && window.dispatchEvent(new CustomEvent('openClientDetail', { detail: client.id }))} src={client.photo} alt={stay.dog_name} className="w-20 h-20 rounded-2xl object-cover border-4 border-background shadow-lg cursor-pointer hover:scale-105 transition-transform" title="Abrir Perfil do Dog" />
                        ) : (
                          <div onClick={() => client && window.dispatchEvent(new CustomEvent('openClientDetail', { detail: client.id }))} className="w-20 h-20 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" title="Abrir Perfil do Dog">
                            <Dog size={32} className="text-primary" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pt-10 pb-4 space-y-4">
                      {/* Name & info */}
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{stay.dog_name}</h2>
                        <p className="text-sm text-muted-foreground">{stay.tutor_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            📅 {format(new Date(stay.check_in), 'dd/MM')} → {stay.expected_checkout ? format(new Date(stay.expected_checkout), 'dd/MM') : '?'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{daysElapsed}/{totalDays} dias</Badge>
                        </div>
                      </div>



                      {/* Meals history - spreadsheet style */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico de Refeições</h3>
                        <div className="overflow-y-auto max-h-[300px] overflow-x-auto -mx-4 px-4 scrollbar-thin">
                          <table className="w-full text-[10px] border-collapse min-w-[300px]">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left p-1.5 font-semibold text-muted-foreground border border-border sticky left-0 bg-muted/50 z-10">Data</th>
                                {MEAL_TYPES.map(mt => (
                                  <th key={mt.key} className="text-center p-1.5 font-semibold text-muted-foreground border border-border min-w-[100px]">
                                    {mt.key === 'almoco' ? '☀️' : '🌙'} {mt.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[...stayDays].reverse().map((day, i) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const isToday = isSameDay(day, new Date());
                                return (
                                  <tr key={i} className={cn(isToday && "bg-primary/5")}>
                                    <td className={cn("p-1.5 border border-border font-medium sticky left-0 z-10",
                                      isToday ? "bg-primary/10 text-primary font-bold" : "bg-card text-foreground")}>
                                      {format(day, 'EEE dd/MM', { locale: ptBR })}
                                      {isToday && <span className="ml-1 text-[8px]">hoje</span>}
                                    </td>
                                    {MEAL_TYPES.map(mt => {
                                      const meal = stayMeals.find(m => m.date === dateStr && m.meal_type === mt.key);
                                      const ateVal = meal?.ate ?? null;
                                      return (
                                        <td key={mt.key} className="p-1 border border-border text-center">
                                          <div className="flex gap-1 justify-center">
                                            <button
                                              onClick={() => handleSetMeal(stay.id, dateStr, mt.key, true)}
                                              className={cn(
                                                "px-2 py-1 rounded text-[9px] font-semibold transition-all active:scale-95 border",
                                                ateVal === true
                                                  ? "bg-primary border-primary text-primary-foreground"
                                                  : "bg-card border-border hover:border-primary/40 text-muted-foreground"
                                              )}
                                            >
                                              ✅
                                            </button>
                                            <button
                                              onClick={() => handleSetMeal(stay.id, dateStr, mt.key, false)}
                                              className={cn(
                                                "px-2 py-1 rounded text-[9px] font-semibold transition-all active:scale-95 border",
                                                ateVal === false
                                                  ? "bg-destructive border-destructive text-destructive-foreground"
                                                  : "bg-card border-border hover:border-destructive/40 text-muted-foreground"
                                              )}
                                            >
                                              ❌
                                            </button>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Medications */}
                      {stayMeds.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                            <Pill size={12} /> Medicamentos ({stayMeds.filter(m => !m.administered).length} pendente)
                          </h3>
                          {stayMeds.map(med => (
                            <div key={med.id} className={cn("flex items-center justify-between p-2.5 rounded-xl border text-xs",
                              med.administered ? 'bg-primary/5 border-primary/20' : 'bg-card border-border')}>
                              <div className="flex items-center gap-2 min-w-0">
                                <button onClick={() => handleToggleMed(med)}
                                  className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                                    med.administered ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary")}>
                                  {med.administered && <Check size={12} />}
                                </button>
                                <span className="font-mono text-[10px]">{med.scheduled_time.slice(0, 5)}</span>
                                <span className="font-medium truncate">{med.medication_name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {med.administered && med.administered_at && <span className="text-[8px] text-primary">✓{format(new Date(med.administered_at), 'HH:mm')}</span>}
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteMed(med.id)}>
                                  <Trash2 size={10} className="text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add medication inline */}
                      {addMedStayId === stay.id ? (
                        <div className="space-y-2 bg-muted/30 rounded-xl p-3">
                          <div className="flex gap-2">
                            <Input placeholder="Remédio" value={medName} onChange={e => setMedName(e.target.value)} className="text-xs h-8 flex-1" />
                            <Input type="time" value={medTime} onChange={e => setMedTime(e.target.value)} className="text-xs h-8 w-24" />
                          </div>
                          <div className="flex gap-2">
                            <Select value={medRecurrence} onValueChange={setMedRecurrence}>
                              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent>{RECURRENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
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

                      {/* Belongings photos */}
                      {(stay.belongings_photos?.length || 0) > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                            <Package size={12} /> Pertences
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {stay.belongings_photos?.map((url, i) => (
                              <div key={i} className="relative group">
                                <button onClick={() => setLightboxUrl(url)} className="w-16 h-16 rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/50">
                                  <img src={url} alt={stay.belonging_labels?.[url] || `Pertence ${i + 1}`} className="w-full h-full object-cover" />
                                </button>
                                {stay.belonging_labels?.[url] && <p className="text-[7px] text-center text-muted-foreground truncate w-16 mt-0.5">{stay.belonging_labels[url]}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observations */}
                      <div className="space-y-1.5">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</h3>
                        <Textarea defaultValue={stay.observations} onBlur={e => handleUpdateObservations(stay.id, e.target.value)} placeholder="Observações..." rows={2} className="text-xs" />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 pb-4">
                        <Button variant="destructive" size="sm" className="flex-1 gap-1 text-xs h-10" onClick={() => { handleCheckout(stay); setSheetStayId(null); }}>
                          <Check size={14} /> Checkout
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1 text-xs h-10">
                              <CalendarIcon size={14} /> Prolongar
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={stay.expected_checkout ? new Date(stay.expected_checkout) : undefined}
                              onSelect={async (d) => {
                                if (!d) return;
                                try {
                                  await supabase.from('hotel_stays').update({ expected_checkout: d.toISOString() }).eq('id', stay.id);
                                  const oldEnd = stay.expected_checkout ? startOfDay(new Date(stay.expected_checkout)) : startOfDay(new Date());
                                  const newEnd = startOfDay(d);
                                  if (newEnd > oldEnd) {
                                    const newDays = eachDayOfInterval({ start: addDays(oldEnd, 1), end: newEnd });
                                    const newMealRows = newDays.flatMap(day => MEAL_TYPES.map(mt => ({ hotel_stay_id: stay.id, date: format(day, 'yyyy-MM-dd'), meal_type: mt.key, ate: null })));
                                    if (newMealRows.length > 0) await supabase.from('hotel_meals').insert(newMealRows);
                                  }
                                  toast.success(`Prolongado até ${format(d, 'dd/MM')}!`);
                                  fetchData();
                                } catch { toast.error('Erro ao prolongar'); }
                              }}
                              locale={ptBR} className="pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                        {deleteConfirmId === stay.id ? (
                          <div className="flex gap-1">
                            <Button variant="destructive" size="sm" className="text-[10px] h-10" onClick={() => { handleDeleteStay(stay.id); setSheetStayId(null); }}>Confirmar</Button>
                            <Button variant="outline" size="sm" className="text-[10px] h-10" onClick={() => setDeleteConfirmId(null)}>Não</Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10 text-xs h-10" onClick={() => setDeleteConfirmId(stay.id)}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ===== BELONGINGS ALL TAB ===== */}
        <TabsContent value="belongings-all" className="space-y-4">
          {stays.filter(s => (s.belongings_photos?.length || 0) > 0).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Nenhum pertence registrado</p>
              <p className="text-xs mt-1 opacity-60">Adicione pertences no check-in ou no card do hóspede</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stays.filter(s => (s.belongings_photos?.length || 0) > 0).map(stay => {
                const client = clients.find(c => c.id === stay.client_id);
                return (
                  <div key={stay.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3 border-b border-border">
                      {client?.photo ? (
                        <img src={client.photo} alt={stay.dog_name} className="w-10 h-10 rounded-xl object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Dog size={16} className="text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{stay.dog_name}</p>
                        <p className="text-[10px] text-muted-foreground">{stay.belongings_photos?.length || 0} pertence(s)</p>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-3 gap-2">
                        {stay.belongings_photos?.map((url, i) => (
                          <div key={i} className="relative group">
                            <button onClick={() => setLightboxUrl(url)} className="w-full aspect-square rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all">
                              <img src={url} alt={stay.belonging_labels?.[url] || `Pertence ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                            {stay.belonging_labels?.[url] && (
                              <p className="text-[9px] text-center text-muted-foreground truncate mt-1">{stay.belonging_labels[url]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarIcon size={16} className="text-primary" /> Calendário de Estadias
            </h3>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-shrink-0">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate}
                  modifiers={{ hasStay: (date) => datesWithStays.has(format(date, 'yyyy-MM-dd')) }}
                  modifiersStyles={{ hasStay: { backgroundColor: 'hsl(24, 95%, 60%)', color: 'white', borderRadius: '50%' } }} />
              </div>
              <div className="flex-1 min-w-0">
                {selectedDate ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</h4>
                      {staysForSelectedDate.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={copySelectedDateHotel}>
                          <Copy size={12} /> Copiar
                        </Button>
                      )}
                    </div>
                    {staysForSelectedDate.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma estadia neste dia</p>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-xs">{staysForSelectedDate.length} estadia(s)</Badge>
                        <div className="space-y-2">
                          {staysForSelectedDate.map((s, i) => {
                            const sc = clients.find(c => c.id === s.client_id);
                            return (
                              <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl border border-border bg-muted/30">
                                {sc?.photo ? (
                                  <img src={sc.photo} alt={s.dog_name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Dog size={16} className="text-primary" /></div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-xs text-foreground truncate">{s.dog_name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{s.tutor_name}</p>
                                </div>
                                <Badge variant={s.active ? 'default' : 'secondary'} className="text-[9px]">{s.active ? 'Ativo' : 'Checkout'}</Badge>
                                {deleteConfirmId === s.id ? (
                                  <div className="flex gap-1">
                                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDeleteStay(s.id)}><Check size={12} /></Button>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirmId(null)}><X size={12} /></Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmId(s.id)}><Trash2 size={12} /></Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-8 text-center">Selecione uma data para ver as estadias</p>
                )}
              </div>
            </div>
          </div>
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
