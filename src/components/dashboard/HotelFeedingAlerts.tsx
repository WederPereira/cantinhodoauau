import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Utensils, AlertTriangle, Dog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';

interface FeedingAlert {
  dog_name: string;
  tutor_name: string;
  total_meals: number;
  meals_eaten: number;
  days: number;
  stay_id: string;
}

const HotelFeedingAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<FeedingAlert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: stays } = await supabase
        .from('hotel_stays')
        .select('id, dog_name, tutor_name, check_in')
        .eq('active', true);
      if (!stays || stays.length === 0) { setAlerts([]); return; }

      const stayIds = stays.map((s: any) => s.id);
      const { data: meals } = await supabase
        .from('hotel_meals')
        .select('*')
        .in('hotel_stay_id', stayIds);

      const result: FeedingAlert[] = [];
      for (const stay of stays as any[]) {
        const stayMeals = (meals || []).filter((m: any) => m.hotel_stay_id === stay.id);
        const days = Math.max(1, differenceInDays(new Date(), new Date(stay.check_in)) + 1);
        const totalExpected = days * 3;
        const eaten = stayMeals.filter((m: any) => m.ate).length;
        const ratio = totalExpected > 0 ? eaten / totalExpected : 1;
        if (ratio < 0.5 && days >= 1) {
          result.push({
            dog_name: stay.dog_name,
            tutor_name: stay.tutor_name,
            total_meals: totalExpected,
            meals_eaten: eaten,
            days,
            stay_id: stay.id,
          });
        }
      }
      setAlerts(result);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const channel = supabase
      .channel('feeding-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_meals' }, fetchAlerts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchAlerts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAlerts]);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Utensils size={16} className="text-amber-600" />
          Alerta de Alimentação
        </h3>
        <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">
          <AlertTriangle size={12} className="mr-1" />
          {alerts.length} dog(s) comendo pouco
        </Badge>
      </div>
      <div className="space-y-1.5">
        {alerts.map(alert => (
          <div key={alert.stay_id} className="flex items-center justify-between p-2.5 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Dog size={14} className="text-amber-600 shrink-0" />
              <span className="font-semibold truncate">{alert.dog_name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground truncate">{alert.tutor_name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-amber-600 dark:text-amber-400">
                {alert.meals_eaten}/{alert.total_meals} refeições
              </span>
              <span className="text-muted-foreground">({alert.days}d)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelFeedingAlerts;
