import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, startOfDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Hotel, Dog, Utensils, Pill, TrendingUp, Calendar as CalendarIcon, Trophy, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const HotelAnalyticsTab: React.FC = () => {
  const [stays, setStays] = useState<StayData[]>([]);
  const [meals, setMeals] = useState<MealData[]>([]);
  const [meds, setMeds] = useState<MedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

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

    const dogCounts = new Map<string, number>();
    stays.forEach(s => dogCounts.set(s.dog_name, (dogCounts.get(s.dog_name) || 0) + 1));
    const topDogs = Array.from(dogCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([dog, count]) => ({ dog, count }));

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

    const dayOfWeekData = DAY_NAMES.map((name, i) => {
      const count = stays.filter(s => getDay(new Date(s.check_in)) === i).length;
      return { day: name, entradas: count };
    });

    return { totalStays, activeStays, completedStays, mealRate, medRate, avgStayDays, topDogs, monthlyData, maxMonthly, mealsEaten, totalMeals, medsAdministered, totalMeds, dayOfWeekData };
  }, [stays, meals, meds]);

  const datesWithStays = useMemo(() => {
    const set = new Set<string>();
    stays.forEach(s => set.add(format(new Date(s.check_in), 'yyyy-MM-dd')));
    return set;
  }, [stays]);

  const staysForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayStart = startOfDay(selectedDate);
    return stays.filter(s => startOfDay(new Date(s.check_in)).getTime() === dayStart.getTime());
  }, [stays, selectedDate]);

  const copySelectedDateHotel = () => {
    if (staysForSelectedDate.length === 0) return;
    const dateStr = format(selectedDate!, 'dd/MM/yyyy');
    const header = `\`HOTEL ${dateStr}:\``;
    const lines = staysForSelectedDate.map((s, i) => `${i + 1}. ${s.dog_name.toUpperCase()}`);
    const footer = `\`TOTAL:${staysForSelectedDate.length}\``;
    navigator.clipboard.writeText(`${header}\n\n${lines.join('\n\n')}\n\n${footer}`);
    toast.success('Lista copiada!');
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
  };

  const barColors = ['hsl(24, 95%, 60%)', 'hsl(174, 72%, 40%)', 'hsl(220, 70%, 55%)', 'hsl(340, 75%, 55%)', 'hsl(45, 90%, 50%)', 'hsl(150, 60%, 45%)', 'hsl(280, 60%, 55%)'];

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
          { icon: CalendarIcon, label: 'Média (dias)', value: stats.avgStayDays, color: 'text-amber-600' },
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

      {/* Charts - Top Dogs & Day of week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-accent" />
            Dogs Mais Frequentes
          </h3>
          {stats.topDogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma estadia registrada</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.topDogs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis dataKey="dog" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} estadia(s)`, 'Frequência']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.topDogs.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarIcon size={16} className="text-primary" />
            Check-ins por Dia da Semana
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} check-in(s)`, 'Check-ins']} />
              <Bar dataKey="entradas" fill="hsl(24, 95%, 60%)" radius={[4, 4, 0, 0]}>
                {stats.dayOfWeekData.map((entry, i) => {
                  const maxVal = Math.max(...stats.dayOfWeekData.map(d => d.entradas));
                  return <Cell key={i} fill={entry.entradas === maxVal && maxVal > 0 ? 'hsl(24, 95%, 60%)' : 'hsl(174, 72%, 40%)'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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

      {/* Calendar */}
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
              modifiers={{ hasStay: (date) => datesWithStays.has(format(date, 'yyyy-MM-dd')) }}
              modifiersStyles={{ hasStay: { backgroundColor: 'hsl(24, 95%, 60%)', color: 'white', borderRadius: '50%' } }}
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
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {staysForSelectedDate.map(s => (
                        <Card key={s.id} className="shadow-sm">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Dog size={14} className="text-primary" />
                              <div>
                                <span className="text-sm font-medium">{s.dog_name}</span>
                                <p className="text-[10px] text-muted-foreground">{s.tutor_name}</p>
                              </div>
                            </div>
                            <Badge variant={s.active ? 'default' : 'secondary'} className="text-[9px]">{s.active ? 'Ativo' : 'Checkout'}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
                Selecione um dia no calendário
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelAnalyticsTab;
