import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pill, AlertTriangle, Clock, Dog, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MedAlert {
  id: string;
  medication_name: string;
  scheduled_time: string;
  administered: boolean;
  administered_at: string | null;
  recurrence: string;
  dog_name: string;
}

const HotelMedicationAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<MedAlert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: stays } = await supabase
        .from('hotel_stays')
        .select('id, dog_name')
        .eq('active', true);
      if (!stays || stays.length === 0) { setAlerts([]); return; }

      const stayMap = new Map(stays.map((s: any) => [s.id, s.dog_name]));
      const stayIds = stays.map((s: any) => s.id);

      const { data: meds } = await supabase
        .from('hotel_medications')
        .select('*')
        .in('hotel_stay_id', stayIds)
        .order('scheduled_time', { ascending: true });

      if (!meds) { setAlerts([]); return; }

      const mapped: MedAlert[] = meds.map((m: any) => ({
        id: m.id,
        medication_name: m.medication_name,
        scheduled_time: m.scheduled_time,
        administered: m.administered,
        administered_at: m.administered_at || null,
        recurrence: m.recurrence || 'once',
        dog_name: stayMap.get(m.hotel_stay_id) || 'Dog',
      }));

      setAlerts(mapped);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const channel = supabase
      .channel('med-alerts-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_medications' }, fetchAlerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchAlerts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAlerts]);

  const handleAdminister = async (med: MedAlert) => {
    try {
      const { error } = await supabase
        .from('hotel_medications')
        .update({ administered: true, administered_at: new Date().toISOString() })
        .eq('id', med.id);
      if (error) throw error;
      toast.success(`${med.medication_name} administrado para ${med.dog_name} ✅`);
      fetchAlerts();
    } catch {
      toast.error('Erro ao registrar administração');
    }
  };

  // Check if medication is overdue (scheduled > 2h ago and not administered)
  const isOverdue = (med: MedAlert): boolean => {
    if (med.administered) return false;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [h, m] = med.scheduled_time.split(':').map(Number);
    const medMinutes = h * 60 + m;
    const diff = nowMinutes - medMinutes;
    return diff > 120; // more than 2 hours overdue
  };

  const pending = alerts.filter(a => !a.administered);
  const overdue = pending.filter(isOverdue);
  const upcoming = pending.filter(a => !isOverdue(a));

  if (alerts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Pill size={16} className="text-primary" />
          Remédios do Hotel
        </h3>
        {pending.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle size={12} className="mr-1" />
            {pending.length} pendente(s)
          </Badge>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Check size={14} className="text-green-600" /> Todos os remédios foram administrados
        </p>
      ) : (
        <div className="space-y-2">
          {/* Overdue - critical */}
          {overdue.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-destructive uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle size={10} /> Atrasados (+2h)
              </p>
              {overdue.map(med => (
                <button
                  key={med.id}
                  onClick={() => handleAdminister(med)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border-2 border-destructive/50 bg-destructive/10 text-xs hover:bg-destructive/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Dog size={14} className="text-destructive shrink-0" />
                    <span className="font-semibold truncate">{med.dog_name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="truncate">{med.medication_name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-destructive">
                      <Clock size={12} />
                      <span className="font-mono">{med.scheduled_time.slice(0, 5)}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-primary text-primary">
                      Aplicar
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Upcoming - normal pending */}
          {upcoming.length > 0 && (
            <div className="space-y-1.5">
              {overdue.length > 0 && (
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-1">Próximos</p>
              )}
              {upcoming.map(med => (
                <button
                  key={med.id}
                  onClick={() => handleAdminister(med)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Dog size={14} className="text-primary shrink-0" />
                    <span className="font-semibold truncate">{med.dog_name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="truncate">{med.medication_name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock size={12} />
                      <span className="font-mono">{med.scheduled_time.slice(0, 5)}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-primary text-primary">
                      Aplicar
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelMedicationAlerts;
