import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pill, AlertTriangle, Clock, Dog, Check, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

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
  const [now, setNow] = useState(new Date());
  const { isAdmin } = useUserRole();
  const notifiedOverdueRef = useRef<Set<string>>(new Set());

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

      setAlerts(meds.map((m: any) => ({
        id: m.id,
        medication_name: m.medication_name,
        scheduled_time: m.scheduled_time,
        administered: m.administered,
        administered_at: m.administered_at || null,
        recurrence: m.recurrence || 'once',
        dog_name: stayMap.get(m.hotel_stay_id) || 'Dog',
      })));
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

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Send browser notification for overdue medications (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    alerts.forEach(med => {
      if (med.administered) return;
      const [h, m] = med.scheduled_time.split(':').map(Number);
      const medMinutes = h * 60 + m;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes - medMinutes >= 120 && !notifiedOverdueRef.current.has(med.id)) {
        notifiedOverdueRef.current.add(med.id);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Remédio atrasado +2h!', {
            body: `${med.dog_name} — ${med.medication_name} (${med.scheduled_time.slice(0, 5)})`,
            icon: '/app-icon.png',
          });
        }
      }
    });
  }, [alerts, now, isAdmin]);

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

  const getMedMinutes = (med: MedAlert) => {
    const [h, m] = med.scheduled_time.split(':').map(Number);
    return h * 60 + m;
  };

  const getNowMinutes = () => now.getHours() * 60 + now.getMinutes();

  const isOverdue = (med: MedAlert): boolean => {
    if (med.administered) return false;
    return getNowMinutes() - getMedMinutes(med) > 120;
  };

  const getCountdown = (med: MedAlert): string => {
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

  const isUpcoming = (med: MedAlert): boolean => {
    if (med.administered) return false;
    const diff = getMedMinutes(med) - getNowMinutes();
    return diff > 0;
  };

  const isPastNotOverdue = (med: MedAlert): boolean => {
    if (med.administered) return false;
    const diff = getNowMinutes() - getMedMinutes(med);
    return diff >= 0 && diff <= 120;
  };

  const pending = alerts.filter(a => !a.administered);
  const overdue = pending.filter(isOverdue);
  const pastNotOverdue = pending.filter(isPastNotOverdue);
  const upcoming = pending.filter(isUpcoming);

  if (alerts.length === 0) return null;

  const MedButton = ({ med, variant }: { med: MedAlert; variant: 'overdue' | 'past' | 'upcoming' }) => {
    const countdown = getCountdown(med);
    const classes = {
      overdue: 'border-2 border-destructive/50 bg-destructive/10 hover:bg-destructive/20',
      past: 'border-2 border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/40',
      upcoming: 'border border-border bg-card hover:bg-muted/50',
    };

    return (
      <button
        onClick={() => handleAdminister(med)}
        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors cursor-pointer ${classes[variant]}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Dog size={14} className={variant === 'overdue' ? 'text-destructive shrink-0' : 'text-primary shrink-0'} />
          <span className="font-semibold truncate">{med.dog_name}</span>
          <span className="text-muted-foreground">—</span>
          <span className="truncate">{med.medication_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1 font-mono text-xs font-bold ${variant === 'overdue' ? 'text-destructive' : variant === 'past' ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
            <Timer size={12} />
            <span>{countdown}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock size={12} />
            <span className="font-mono">{med.scheduled_time.slice(0, 5)}</span>
          </div>
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-primary text-primary">
            Aplicar
          </Badge>
        </div>
      </button>
    );
  };

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
          {overdue.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-destructive uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle size={10} /> Atrasados (+2h)
              </p>
              {overdue.map(med => <MedButton key={med.id} med={med} variant="overdue" />)}
            </div>
          )}
          {pastNotOverdue.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                <Clock size={10} /> Horário passou
              </p>
              {pastNotOverdue.map(med => <MedButton key={med.id} med={med} variant="past" />)}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="space-y-1.5">
              {(overdue.length > 0 || pastNotOverdue.length > 0) && (
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-1">Próximos</p>
              )}
              {upcoming.map(med => <MedButton key={med.id} med={med} variant="upcoming" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelMedicationAlerts;
