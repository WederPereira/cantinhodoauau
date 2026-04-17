import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Utensils, AlertTriangle, Dog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FeedingAlert {
  dog_name: string;
  tutor_name: string;
  missed_streak: number;
  stay_id: string;
}

const HotelFeedingAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<FeedingAlert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: stays } = await supabase
        .from('hotel_stays')
        .select('id, dog_name, tutor_name')
        .eq('active', true);
      if (!stays || stays.length === 0) { setAlerts([]); return; }

      const stayIds = stays.map((s: any) => s.id);
      const { data: meals } = await supabase
        .from('hotel_meals')
        .select('hotel_stay_id, date, meal_type, ate')
        .in('hotel_stay_id', stayIds);

      const result: FeedingAlert[] = [];
      const mealOrder = { almoco: 1, janta: 2 } as const;

      for (const stay of stays as any[]) {
        const stayMeals = (meals || [])
          .filter((m: any) => m.hotel_stay_id === stay.id && m.ate !== null)
          .sort((a: any, b: any) => {
            if (a.date === b.date) {
              return (mealOrder[a.meal_type as 'almoco' | 'janta'] || 0) - (mealOrder[b.meal_type as 'almoco' | 'janta'] || 0);
            }
            return a.date < b.date ? -1 : 1;
          });

        // count consecutive trailing "não comeu"
        let streak = 0;
        for (let i = stayMeals.length - 1; i >= 0; i--) {
          if (stayMeals[i].ate === false) streak++;
          else break;
        }

        if (streak >= 3) {
          result.push({
            dog_name: stay.dog_name,
            tutor_name: stay.tutor_name,
            missed_streak: streak,
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
    <div className="bg-card border border-destructive/40 rounded-xl p-4 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Utensils size={16} className="text-destructive" />
          Alerta de Alimentação
        </h3>
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle size={12} className="mr-1" />
          {alerts.length} dog(s) sem comer
        </Badge>
      </div>
      <div className="space-y-1.5">
        {alerts.map(alert => (
          <div key={alert.stay_id} className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Dog size={14} className="text-destructive shrink-0" />
              <span className="font-semibold truncate">{alert.dog_name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground truncate">{alert.tutor_name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-destructive font-semibold">
                {alert.missed_streak} refeições seguidas
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelFeedingAlerts;
