import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, AlertTriangle, Dog, Clock, CalendarPlus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isPast, differenceInHours, eachDayOfInterval, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const MEAL_TYPES = ['almoco', 'janta'];

interface CheckoutAlert {
  id: string;
  dog_name: string;
  expected_checkout: string;
  hours_overdue: number;
}

const HotelCheckoutAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<CheckoutAlert[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: stays } = await supabase
        .from('hotel_stays')
        .select('id, dog_name, expected_checkout')
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
            expected_checkout: stay.expected_checkout,
            hours_overdue: differenceInHours(new Date(), expected),
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

  const handleExtendStay = async (stayId: string, newDate: Date, dogName: string) => {
    try {
      const { data: stay } = await supabase.from('hotel_stays').select('expected_checkout').eq('id', stayId).single();
      await supabase.from('hotel_stays').update({ expected_checkout: newDate.toISOString() }).eq('id', stayId);
      const oldEnd = stay?.expected_checkout ? startOfDay(new Date(stay.expected_checkout)) : startOfDay(new Date());
      const newEnd = startOfDay(newDate);
      if (newEnd > oldEnd) {
        const newDays = eachDayOfInterval({ start: addDays(oldEnd, 1), end: newEnd });
        const newMealRows = newDays.flatMap(day =>
          MEAL_TYPES.map(mt => ({ hotel_stay_id: stayId, date: format(day, 'yyyy-MM-dd'), meal_type: mt, ate: false }))
        );
        if (newMealRows.length > 0) await supabase.from('hotel_meals').insert(newMealRows);
      }
      toast.success(`Estadia de ${dogName} prolongada até ${format(newDate, 'dd/MM')}!`);
      fetchAlerts();
    } catch { toast.error('Erro ao prolongar estadia'); }
  };

  const handleCheckout = async (stayId: string, dogName: string) => {
    try {
      await supabase.from('hotel_stays').update({ active: false, check_out: new Date().toISOString() }).eq('id', stayId);
      toast.success(`${dogName} fez checkout!`);
      fetchAlerts();
    } catch { toast.error('Erro ao fazer checkout'); }
  };

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
        Saiu ou precisa ficar mais dias?
      </p>
      <div className="space-y-2">
        {alerts.map(alert => (
          <div key={alert.id} className="p-2.5 rounded-lg border-2 border-destructive/30 bg-destructive/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Dog size={14} className="text-destructive shrink-0" />
                <span className="font-semibold truncate">{alert.dog_name}</span>
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
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1" onClick={() => handleCheckout(alert.id, alert.dog_name)}>
                <Check size={12} /> Confirmar Saída
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="secondary" className="flex-1 h-7 text-[10px] gap-1">
                    <CalendarPlus size={12} /> Prolongar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={new Date(alert.expected_checkout)}
                    onSelect={(d) => d && handleExtendStay(alert.id, d, alert.dog_name)}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelCheckoutAlerts;
