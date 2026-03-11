import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Hotel, Plus, Camera, Pill, Clock, Trash2, X, ChevronDown, ChevronUp,
  AlertTriangle, Check, FileText, Dog, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
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
}

interface Medication {
  id: string;
  hotel_stay_id: string;
  medication_name: string;
  scheduled_time: string;
  administered: boolean;
  notes: string;
}

const HotelTab: React.FC = () => {
  const { clients } = useClients();
  const [stays, setStays] = useState<HotelStay[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStay, setExpandedStay] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [observations, setObservations] = useState('');
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('');
  const [addMedStayId, setAddMedStayId] = useState<string | null>(null);
  const alertedMeds = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStayId, setUploadingStayId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: staysData, error: sErr } = await supabase
        .from('hotel_stays')
        .select('*')
        .eq('active', true)
        .order('check_in', { ascending: false });
      if (sErr) throw sErr;

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

  // Medication alert system - check every 30s
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
          toast.warning(
            `⏰ Em ${diff} min: ${med.medication_name} para ${stay?.dog_name || 'dog'}`,
            { duration: 15000, icon: <Bell size={18} /> }
          );

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Remédio em ${diff} min!`, {
              body: `${med.medication_name} - ${stay?.dog_name}`,
              icon: '/favicon.ico',
            });
          }
        }
      });
    };

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [medications, stays]);

  const handleAddStay = async () => {
    if (!selectedClientId) {
      toast.error('Selecione um dog cadastrado');
      return;
    }
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
    } catch (err) {
      toast.error('Erro ao fazer checkout');
    }
  };

  const handleUpdateObservations = async (stayId: string, obs: string) => {
    try {
      const { error } = await supabase
        .from('hotel_stays')
        .update({ observations: obs, updated_at: new Date().toISOString() })
        .eq('id', stayId);
      if (error) throw error;
      toast.success('Observação salva');
    } catch (err) {
      toast.error('Erro ao salvar');
    }
  };

  const handleAddMedication = async (stayId: string) => {
    if (!medName || !medTime) {
      toast.error('Preencha nome e horário do remédio');
      return;
    }
    try {
      const { error } = await supabase.from('hotel_medications').insert({
        hotel_stay_id: stayId,
        medication_name: medName,
        scheduled_time: medTime,
      });
      if (error) throw error;
      toast.success(`Remédio ${medName} adicionado`);
      setMedName('');
      setMedTime('');
      setAddMedStayId(null);
      fetchData();
    } catch (err) {
      toast.error('Erro ao adicionar remédio');
    }
  };

  const handleToggleMed = async (med: Medication) => {
    try {
      const { error } = await supabase
        .from('hotel_medications')
        .update({ administered: !med.administered })
        .eq('id', med.id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleDeleteMed = async (medId: string) => {
    try {
      const { error } = await supabase
        .from('hotel_medications')
        .delete()
        .eq('id', medId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      toast.error('Erro ao remover');
    }
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
        const { error: upErr } = await supabase.storage
          .from('hotel-belongings')
          .upload(path, file);
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage
          .from('hotel-belongings')
          .getPublicUrl(path);
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
      const { error } = await supabase
        .from('hotel_stays')
        .update({ belongings_photos: newPhotos })
        .eq('id', stayId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      toast.error('Erro ao remover foto');
    }
  };

  const getMedsForStay = (stayId: string) => medications.filter(m => m.hotel_stay_id === stayId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hotel size={16} className="text-primary" />
          <span className="text-sm font-medium text-foreground">
            {stays.length} dog(s) hospedado(s)
          </span>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus size={14} /> Novo Check-in
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check-in Hotel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Dog cadastrado</label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o dog..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.tutorName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button onClick={handleAddStay}>Confirmar Check-in</Button>
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

            return (
              <div key={stay.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
                {/* Stay header */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() => setExpandedStay(isExpanded ? null : stay.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Dog size={18} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{stay.dog_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {stay.tutor_name} · Entrada: {format(new Date(stay.check_in), 'dd/MM HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                          onClick={() => {
                            setUploadingStayId(stay.id);
                            fileInputRef.current?.click();
                          }}
                          disabled={uploadingStayId === stay.id}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          {uploadingStayId === stay.id ? (
                            <span className="animate-spin text-xs">⏳</span>
                          ) : (
                            <Plus size={18} />
                          )}
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => {
                          if (uploadingStayId) handlePhotoUpload(uploadingStayId, e.target.files);
                          e.target.value = '';
                        }}
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
                                <Checkbox
                                  checked={med.administered}
                                  onCheckedChange={() => handleToggleMed(med)}
                                />
                                <Clock size={12} className="text-muted-foreground" />
                                <span className="font-mono">{med.scheduled_time.slice(0, 5)}</span>
                                <span className="font-medium">{med.medication_name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteMed(med.id)}
                              >
                                <Trash2 size={12} className="text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {addMedStayId === stay.id ? (
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              placeholder="Nome do remédio"
                              value={medName}
                              onChange={e => setMedName(e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              type="time"
                              value={medTime}
                              onChange={e => setMedTime(e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <Button size="sm" className="h-8" onClick={() => handleAddMedication(stay.id)}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddMedStayId(null)}>
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs w-full"
                          onClick={() => {
                            setAddMedStayId(stay.id);
                            setMedName('');
                            setMedTime('');
                          }}
                        >
                          <Plus size={12} /> Adicionar Remédio
                        </Button>
                      )}
                    </div>

                    {/* Checkout */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-1"
                      onClick={() => handleCheckout(stay)}
                    >
                      <AlertTriangle size={14} /> Fazer Checkout
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HotelTab;
