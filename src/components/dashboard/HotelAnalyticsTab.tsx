import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Hotel, Dog, Utensils, Pill, TrendingUp, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StayData {
  id: string;
  dog_name: string;
  tutor_name: string;
  check_in: string;
  check_out: string | null;
  expected_checkout: string | null;
  active: boolean;
}

interface MealData {
  hotel_stay_id: string;
  ate: boolean;
}

interface MedData {
  hotel_stay_id: string;
  administered: boolean;
}

const HotelAnalyticsTab: React.FC = () => {
  const [stays, setStays] = useState<StayData[]>([]);
  const [meals, setMeals] = useState<MealData[]>([]);
  const [meds, setMeds] = useState<MedData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [staysRes, mealsRes, medsRes] = await Promise.all([
        supabase.from('hotel_stays').select('id, dog_name, tutor_name, check_in, check_out, expected_checkout, active').order('check_in', { ascending: false }),
        supabase.from('hotel_meals').select('hotel_stay_id, ate'),
        supabase.from('hotel_medications').select('hotel_stay_id, administered'),
      ]);
      setStays(staysRes.data || []);
      setMeals(mealsRes.data || []);
      setMeds(medsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const totalStays = stays.length;
    const activeStays = stays.filter(s => s.active).length;
    const completedStays = stays.filter(s => !s.active).length;
    const totalMeals = meals.length;
    const mealsEaten = meals.filter(m => m.ate).length;
    const mealRate = totalMeals > 0 ? Math.round((mealsEaten / totalMeals) * 100) : 0;
    const totalMeds = meds.length;
    const medsAdministered = meds.filter(m => m.administered).length;
    const medRate = totalMeds > 0 ? Math.round((medsAdministered / totalMeds) * 100) : 0;

    const avgStayDays = completedStays > 0
      ? Math.round(stays.filter(s => !s.active && s.check_out).reduce((sum, s) => sum + Math.max(1, differenceInDays(new Date(s.check_out!), new Date(s.check_in))), 0) / completedStays)
      : 0;

    // Top dogs by frequency
    const dogCounts = new Map<string, number>();
    stays.forEach(s => dogCounts.set(s.dog_name, (dogCounts.get(s.dog_name) || 0) + 1));
    const topDogs = Array.from(dogCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Monthly stats (last 6 months)
    const now = new Date();
    const sixMonthsAgo = subMonths(startOfMonth(now), 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
    const monthlyData = months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const count = stays.filter(s => {
        const d = new Date(s.check_in);
        return d >= mStart && d <= mEnd;
      }).length;
      return { label: format(month, 'MMM', { locale: ptBR }), count };
    });
    const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);

    return { totalStays, activeStays, completedStays, mealRate, medRate, avgStayDays, topDogs, monthlyData, maxMonthly, mealsEaten, totalMeals, medsAdministered, totalMeds };
  }, [stays, meals, meds]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Carregando análises...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Hotel, label: 'Total Estadias', value: stats.totalStays, color: 'text-primary' },
          { icon: Dog, label: 'Hospedados Agora', value: stats.activeStays, color: 'text-green-600' },
          { icon: Calendar, label: 'Média (dias)', value: stats.avgStayDays, color: 'text-amber-600' },
          { icon: TrendingUp, label: 'Checkouts', value: stats.completedStays, color: 'text-blue-600' },
        ].map((card, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 text-center shadow-soft">
            <card.icon size={20} className={cn("mx-auto mb-1", card.color)} />
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Meal & Med Rates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Utensils size={16} className="text-green-600" />
            <span className="text-xs font-semibold text-foreground">Taxa de Alimentação</span>
          </div>
          <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all" style={{ width: `${stats.mealRate}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{stats.mealRate}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{stats.mealsEaten}/{stats.totalMeals} refeições</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={16} className="text-purple-600" />
            <span className="text-xs font-semibold text-foreground">Taxa de Medicação</span>
          </div>
          <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-all" style={{ width: `${stats.medRate}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{stats.medRate}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{stats.medsAdministered}/{stats.totalMeds} doses</p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">Check-ins por Mês</span>
        </div>
        <div className="flex items-end gap-2 h-32">
          {stats.monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-foreground">{m.count}</span>
              <div className="w-full bg-primary/20 rounded-t-md relative" style={{ height: `${Math.max(4, (m.count / stats.maxMonthly) * 100)}%` }}>
                <div className="absolute inset-0 bg-primary rounded-t-md" />
              </div>
              <span className="text-[9px] text-muted-foreground capitalize">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Dogs */}
      {stats.topDogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Dog size={16} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">Dogs Mais Frequentes</span>
          </div>
          <div className="space-y-2">
            {stats.topDogs.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{count}x</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${(count / stats.topDogs[0][1]) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelAnalyticsTab;
