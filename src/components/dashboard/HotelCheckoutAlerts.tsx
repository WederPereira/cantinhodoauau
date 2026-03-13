import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, AlertTriangle, Dog, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isPast, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CheckoutAlert {
  id: string;
  dog_name: string;
  tutor_name: string;
  expected_checkout: string;
  hours_overdue: number;
  active: boolean;
}

const HotelCheckoutAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<CheckoutAlert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: stays } = await supabase
        .from('hotel_stays')
        .select('id, dog_name, tutor_name, expected_checkout, active')
        .eq('active', true)
        .not('expected_checkout', 'is', null);

      if (!stays) { setAlerts([]); return; }

      const result: CheckoutAlert[] = [];
      for (const stay of stays as any[]) {
        const expected = new Date(stay.expected_checkout);
        if (isPast(expected)) {
          result.push({
            id: stay.id,
            dog_name: stay.dog_name,
            tutor_name: stay.tutor_name,
            expected_checkout: stay.expected_checkout,
            hours_overdue: differenceInHours(new Date(), expected),
            active: stay.active,
          });
        }
      }
      result.sort((a, b) => b.hours_overdue - a.hours_overdue);
      setAlerts(result);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    const channel = supabase
      .channel('checkout-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchAlerts)
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [fetchAlerts]);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <LogOut size={16} className="text-destructive" />
          Saída Pendente
        </h3>
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle size={12} className="mr-1" />
          {alerts.length} dog(s)
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Dogs cuja data de saída já passou. Prolongaram a estadia ou esqueceu o checkout?
      </p>
      <div className="space-y-1.5">
        {alerts.map(alert => (
          <div key={alert.id} className="flex items-center justify-between p-2.5 rounded-lg border-2 border-destructive/30 bg-destructive/5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Dog size={14} className="text-destructive shrink-0" />
              <span className="font-semibold truncate">{alert.dog_name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground truncate">{alert.tutor_name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground">
                Saída: {format(new Date(alert.expected_checkout), 'dd/MM HH:mm', { locale: ptBR })}
              </span>
              <Badge variant="destructive" className="text-[8px] px-1.5 py-0">
                <Clock size={10} className="mr-0.5" />
                +{alert.hours_overdue}h
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelCheckoutAlerts;
