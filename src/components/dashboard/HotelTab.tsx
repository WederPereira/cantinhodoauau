import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Hotel, Plus, Camera, Pill, Clock, Trash2, X, ChevronDown, ChevronUp,
  AlertTriangle, Check, FileText, Dog, Bell, Search, Copy, Calendar as CalendarIcon,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface HotelStay {
  id: string;
  client_id: string;
  dog_name: string;
  tutor_name: string;
  check_in: string;
  check_out: string | null;
  observations: string;
  belongings_photos: string[];
  active: boolean;
  ate: boolean;
}

interface Medication {
  id: string;
  hotel_stay_id: string;
  medication_name: string;
  scheduled_time: string;
  administered: boolean;
  notes: string;
  recurrence: string;
}

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Dose única' },
  { value: 'every_6h', label: 'A cada 6h' },
  { value: 'every_8h', label: 'A cada 8h' },
  { value: 'every_12h', label: 'A cada 12h' },
  { value: 'every_24h', label: '1x ao dia' },
];

const HotelTab: React.FC = () => {
  const { clients } = useClients();
  const [stays, setStays] = useState<HotelStay[]>([]);
  const [allStays, setAllStays] = useState<HotelStay[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStay, setExpandedStay] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [observations, setObservations] = useState('');
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('');
  const [medRecurrence, setMedRecurrence] = useState('once');
  const [addMedStayId, setAddMedStayId] = useState<string | null>(null);
  const alertedMeds = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStayId, setUploadingStayId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: staysData, error: sErr } = await supabase
        .from('hotel_stays')
        .select('*')
        .eq('active', true)
        .order('check_in', { ascending: false });
      if (sErr) throw sErr;

      // Fetch ALL stays for history calendar
      const { data: allData } = await supabase
        .from('hotel_stays')
        .select('*')
        .order('check_in', { ascending: false });

      const stayIds = (staysData || []).map((s: any) => s.id);
      let medsData: any[] = [];
      if (stayIds.length > 0) {
        const { data, error: mErr } = await supabase
          .from('hotel_medications')
          .select('*')
          .in('hotel_stay_id', stayIds)
          .order('scheduled_time', { ascending: true });
        if (mErr) throw mErr;
        medsData = data || [];
      }

      setStays(staysData || []);
      setAllStays(allData || []);
      setMedications(medsData);
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Medication alert system
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
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Remédio em ${diff} min!`, { body: `${med.medication_name} - ${stay?.dog_name}`, icon: '/favicon.ico' });
          }
        }
      });
    };
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [medications, stays]);

  // Filtered clients for check-in dialog
  const filteredClients = useMemo(() => {
    if (!searchFilter) return clients;
    const q = searchFilter.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.breed.toLowerCase().includes(q) ||
      c.tutorName.toLowerCase().includes(q)
    );
  }, [clients, searchFilter]);

  // Calendar history data
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
      });
      if (error) throw error;
      toast.success(`${client.name} entrou no hotel! 🏨`);
      setAddDialogOpen(false);
      setSelectedClientId('');
      setObservations('');
      setSearchFilter('');
      fetchData();
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
      toast.success(`${stay.dog_name} fez checkout! ✅`);
      fetchData();
    } catch { toast.error('Erro ao fazer checkout'); }
  };

  const handleToggleAte = async (stay: HotelStay) => {
    try {
      const { error } = await supabase
        .from('hotel_stays')
        .update({ ate: !stay.ate, updated_at: new Date().toISOString() })
        .eq('id', stay.id);
      if (error) throw error;
      setStays(prev => prev.map(s => s.id === stay.id ? { ...s, ate: !s.ate } : s));
      toast.success(stay.ate ? `${stay.dog_name} marcado como não comeu` : `${stay.dog_name} comeu! ✅`);
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleUpdateObservations = async (stayId: string, obs: string) => {
    try {
      const { error } = await supabase
        .from('hotel_stays')
        .update({ observations: obs, updated_at: new Date().toISOString() })
        .eq('id', stayId);
      if (error) throw error;
      toast.success('Observação salva');
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleAddMedication = async (stayId: string) => {
    if (!medName || !medTime) { toast.error('Preencha nome e horário'); return; }
    try {
      const { error } = await supabase.from('hotel_medications').insert({
        hotel_stay_id: stayId,
        medication_name: medName,
        scheduled_time: medTime,
        recurrence: medRecurrence,
      });
      if (error) throw error;
      toast.success(`Remédio ${medName} adicionado`);
      setMedName('');
      setMedTime('');
      setMedRecurrence('once');
      setAddMedStayId(null);
      fetchData();
    } catch { toast.error('Erro ao adicionar remédio'); }
  };

  const handleToggleMed = async (med: Medication) => {
    try {
      const { error } = await supabase
        .from('hotel_medications')
        .update({ administered: !med.administered })
        .eq('id', med.id);
      if (error) throw error;
      fetchData();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDeleteMed = async (medId: string) => {
    try {
      const { error } = await supabase.from('hotel_medications').delete().eq('id', medId);
      if (error) throw error;
      fetchData();
    } catch { toast.error('Erro ao remover'); }
  };

  const handlePhotoUpload = async (stayId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingStayId(stayId);
    try {
      const stay = stays.find(s => s.id === stayId);
      const newPhotos = [...(stay?.belongings_photos || [])];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${stayId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('hotel-belongings').upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('hotel-belongings').getPublicUrl(path);
        newPhotos.push(urlData.publicUrl);
      }
      const { error } = await supabase
        .from('hotel_stays')
        .update({ belongings_photos: newPhotos, updated_at: new Date().toISOString() })
        .eq('id', stayId);
      if (error) throw error;
      toast.success('Foto(s) enviada(s)!');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingStayId(null);
    }
  };

  const handleDeletePhoto = async (stayId: string, photoUrl: string) => {
    const stay = stays.find(s => s.id === stayId);
    if (!stay) return;
    const newPhotos = stay.belongings_photos.filter(p => p !== photoUrl);
    try {
      const { error } = await supabase.from('hotel_stays').update({ belongings_photos: newPhotos }).eq('id', stayId);
      if (error) throw error;
      fetchData();
    } catch { toast.error('Erro ao remover foto'); }
  };

  const copySelectedDateHotel = () => {
    if (staysForSelectedDate.length === 0) return;
    const dateStr = format(selectedDate!, 'dd/MM/yyyy');
    const header = `\`HOTEL ${dateStr}:\``;
    const lines = staysForSelectedDate.map((s, i) => `${i + 1}. ${s.dog_name.toUpperCase()}`);
    const footer = `\`TOTAL:${staysForSelectedDate.length}\``;
    const text = `${header}\n\n${lines.join('\n\n')}\n\n${footer}`;
    navigator.clipboard.writeText(text);
    toast.success('Lista copiada no formato WhatsApp!');
  };

  const getMedsForStay = (stayId: string) => medications.filter(m => m.hotel_stay_id === stayId);
  const recurrenceLabel = (val: string) => RECURRENCE_OPTIONS.find(o => o.value === val)?.label || val;

  return (
    <Tabs defaultValue="active" className="space-y-4">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="active" className="gap-1 text-xs">
          <Hotel size={14} /> Hospedados
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-1 text-xs">
          <CalendarIcon size={14} /> Histórico
        </TabsTrigger>
      </TabsList>

      {/* ===== ACTIVE STAYS ===== */}
      <TabsContent value="active" className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hotel size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">
              {stays.length} dog(s) hospedado(s)
            </span>
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
                {/* Search filter */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, raça ou tutor..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Dog cards grid */}
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClientId(c.id)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                        selectedClientId === c.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/40 bg-card'
                      }`}
                    >
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} className="w-14 h-14 rounded-full object-cover mb-2 border-2 border-border" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-2">
                          <Dog size={24} className="text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-semibold text-xs text-foreground truncate w-full">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate w-full">{c.breed || 'Sem raça'}</p>
                      <p className="text-[10px] text-muted-foreground truncate w-full">{c.tutorName}</p>
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-muted-foreground py-8">Nenhum dog encontrado</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Observações</label>
                  <Textarea
                    value={observations}
                    onChange={e => setObservations(e.target.value)}
                    placeholder="Alergias, comportamento, cuidados especiais..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleAddStay} disabled={!selectedClientId}>Confirmar Check-in</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stay list */}
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
              const pendingMeds = stayMeds.filter(m => !m.administered).length;
              const client = clients.find(c => c.id === stay.client_id);

              return (
                <div key={stay.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
                  {/* Stay header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setExpandedStay(isExpanded ? null : stay.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {client?.photo ? (
                        <img src={client.photo} alt={stay.dog_name} className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Dog size={18} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{stay.dog_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {stay.tutor_name} · {format(new Date(stay.check_in), 'dd/MM HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Ate badge */}
                      <div onClick={e => { e.stopPropagation(); handleToggleAte(stay); }} className="cursor-pointer">
                        <Badge variant={stay.ate ? 'default' : 'outline'} className={`text-[9px] px-1.5 py-0 ${stay.ate ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                          <Utensils size={10} className="mr-0.5" />
                          {stay.ate ? 'Comeu' : 'Não comeu'}
                        </Badge>
                      </div>
                      {pendingMeds > 0 && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                          <Pill size={10} className="mr-0.5" />{pendingMeds}
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-4">
                      {/* Observations */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <FileText size={12} /> Observações
                        </label>
                        <Textarea
                          defaultValue={stay.observations}
                          onBlur={e => handleUpdateObservations(stay.id, e.target.value)}
                          placeholder="Adicione observações..."
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      {/* Photos */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <Camera size={12} /> Pertences
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {stay.belongings_photos?.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group">
                              <img src={url} alt={`Pertence ${i + 1}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => handleDeletePhoto(stay.id, url)}
                                className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => { setUploadingStayId(stay.id); fileInputRef.current?.click(); }}
                            disabled={uploadingStayId === stay.id}
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          >
                            {uploadingStayId === stay.id ? <span className="animate-spin text-xs">⏳</span> : <Plus size={18} />}
                          </button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e => { if (uploadingStayId) handlePhotoUpload(uploadingStayId, e.target.files); e.target.value = ''; }}
                        />
                      </div>

                      {/* Medications */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                          <Pill size={12} /> Remédios
                        </label>
                        {stayMeds.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {stayMeds.map(med => (
                              <div
                                key={med.id}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                                  med.administered
                                    ? 'bg-muted/50 border-border line-through text-muted-foreground'
                                    : 'bg-card border-border'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Checkbox checked={med.administered} onCheckedChange={() => handleToggleMed(med)} />
                                  <Clock size={12} className="text-muted-foreground" />
                                  <span className="font-mono">{med.scheduled_time.slice(0, 5)}</span>
                                  <span className="font-medium">{med.medication_name}</span>
                                  <Badge variant="outline" className="text-[8px] px-1 py-0">{recurrenceLabel(med.recurrence)}</Badge>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteMed(med.id)}>
                                  <Trash2 size={12} className="text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {addMedStayId === stay.id ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input placeholder="Nome do remédio" value={medName} onChange={e => setMedName(e.target.value)} className="text-xs h-8 flex-1" />
                              <Input type="time" value={medTime} onChange={e => setMedTime(e.target.value)} className="text-xs h-8 w-24" />
                            </div>
                            <div className="flex gap-2 items-center">
                              <Select value={medRecurrence} onValueChange={setMedRecurrence}>
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Recorrência" />
                                </SelectTrigger>
                                <SelectContent>
                                  {RECURRENCE_OPTIONS.map(o => (
                                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-8" onClick={() => handleAddMedication(stay.id)}>
                                <Check size={14} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddMedStayId(null)}>
                                <X size={14} />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline" size="sm" className="gap-1 text-xs w-full"
                            onClick={() => { setAddMedStayId(stay.id); setMedName(''); setMedTime(''); setMedRecurrence('once'); }}
                          >
                            <Plus size={12} /> Adicionar Remédio
                          </Button>
                        )}
                      </div>

                      {/* Checkout */}
                      <Button variant="destructive" size="sm" className="w-full gap-1" onClick={() => handleCheckout(stay)}>
                        <AlertTriangle size={14} /> Fazer Checkout
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
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
                modifiers={{
                  hasStay: (date) => datesWithStays.has(format(date, 'yyyy-MM-dd')),
                }}
                modifiersStyles={{
                  hasStay: {
                    backgroundColor: 'hsl(24, 95%, 60%)',
                    color: 'white',
                    borderRadius: '50%',
                  },
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              {selectedDate ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </h4>
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
                            </div>
                            <Badge variant={s.active ? 'default' : 'secondary'} className="text-[9px]">
                              {s.active ? 'Ativo' : 'Checkout'}
                            </Badge>
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
    </Tabs>
  );
};

export default HotelTab;
