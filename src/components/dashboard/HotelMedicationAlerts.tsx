import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pill, AlertTriangle, Clock, Dog, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MedAlert {
  id: string;
  medication_name: string;
  scheduled_time: string;
  administered: boolean;
  recurrence: string;
  dog_name: string;
}

const HotelMedicationAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<MedAlert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      // Get active stays
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

  const pending = alerts.filter(a => !a.administered);
  const administered = alerts.filter(a => a.administered);

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
        <div className="space-y-1.5">
          {pending.map(med => (
            <div key={med.id} className="flex items-center justify-between p-2 rounded-lg border border-destructive/30 bg-destructive/5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Dog size={14} className="text-primary shrink-0" />
                <span className="font-semibold truncate">{med.dog_name}</span>
                <span className="text-muted-foreground">—</span>
                <span className="truncate">{med.medication_name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                <Clock size={12} />
                <span className="font-mono">{med.scheduled_time.slice(0, 5)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotelMedicationAlerts;
