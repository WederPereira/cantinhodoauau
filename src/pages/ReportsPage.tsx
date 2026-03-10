import React, { useMemo, useState, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { useWalkInBaths } from '@/context/WalkInBathContext';
import { formatCurrency } from '@/types/client';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar as CalendarIcon, Bath, Dog, Copy, Trophy, Clock } from 'lucide-react';
import { Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, getDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface QrEntry {
  id: string;
  tutor: string;
  dog: string;
  raca: string;
  data_hora: string;
}

const ReportsPage: React.FC = () => {
  const { clients } = useClients();
  const { baths } = useWalkInBaths();
  const [periodMonths, setPeriodMonths] = useState('6');
  const [entries, setEntries] = useState<QrEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const numMonths = parseInt(periodMonths);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoadingEntries(true);
      const { data, error } = await supabase
        .from('qr_entries' as any)
        .select('*')
        .order('data_hora', { ascending: false });
      if (!error && data) {
        setEntries(data as any as QrEntry[]);
      }
      setLoadingEntries(false);
    };
    fetchEntries();
  }, []);

  // Walk-in bath revenue over time
  const bathRevenueData = useMemo(() => {
    const months: { month: string; receita: number; quantidade: number }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, 'MMM/yy', { locale: ptBR });

      let receita = 0;
      let quantidade = 0;
      baths.forEach(b => {
        const bDate = new Date(b.date);
        if (isWithinInterval(bDate, { start, end })) {
          receita += b.price;
          quantidade++;
        }
      });
      months.push({ month: label, receita, quantidade });
    }
    return months;
  }, [baths, numMonths]);

  const totalBathRevenue = useMemo(() => baths.reduce((s, b) => s + b.price, 0), [baths]);

  // New clients per month
  const newClientsData = useMemo(() => {
    const months: { month: string; novos: number }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, 'MMM/yy', { locale: ptBR });

      const novos = clients.filter(c => {
        const created = new Date(c.createdAt);
        return isWithinInterval(created, { start, end });
      }).length;
      months.push({ month: label, novos });
    }
    return months;
  }, [clients, numMonths]);

  // === QR Entry Analytics ===

  // Top dogs by frequency
  const topDogs = useMemo(() => {
    const freq: Record<string, number> = {};
    entries.forEach(e => {
      const key = e.dog;
      freq[key] = (freq[key] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dog, count]) => ({ dog, count }));
  }, [entries]);

  // Day of week frequency
  const dayOfWeekData = useMemo(() => {
    const freq = [0, 0, 0, 0, 0, 0, 0];
    entries.forEach(e => {
      const day = getDay(new Date(e.data_hora));
      freq[day]++;
    });
    return DAY_NAMES.map((name, i) => ({ day: name, entradas: freq[i] }));
  }, [entries]);

  // Entries for the selected calendar date
  const entriesForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayStart = startOfDay(selectedDate);
    return entries.filter(e => {
      const eDate = startOfDay(new Date(e.data_hora));
      return eDate.getTime() === dayStart.getTime();
    });
  }, [entries, selectedDate]);

  // Frequency summary for selected date
  const selectedDateSummary = useMemo(() => {
    const freq: Record<string, number> = {};
    entriesForSelectedDate.forEach(e => {
      freq[e.dog] = (freq[e.dog] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([dog, count]) => ({ dog, count }));
  }, [entriesForSelectedDate]);

  // Dates that have entries (for calendar highlighting)
  const datesWithEntries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      set.add(format(new Date(e.data_hora), 'yyyy-MM-dd'));
    });
    return set;
  }, [entries]);

  const copySelectedDateDogs = () => {
    if (selectedDateSummary.length === 0) return;
    const total = selectedDateSummary.reduce((s, d) => s + d.count, 0);
    const lines = selectedDateSummary.map(d => `${d.dog} (${d.count}x)`);
    lines.push(`\nTotal: ${total} entrada(s)`);
    const text = `Entradas ${format(selectedDate!, 'dd/MM/yyyy')}:\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text);
    toast.success('Lista copiada!');
  };

  const CustomTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
  };

  const barColors = ['hsl(24, 95%, 60%)', 'hsl(174, 72%, 40%)', 'hsl(220, 70%, 55%)', 'hsl(340, 75%, 55%)', 'hsl(45, 90%, 50%)', 'hsl(150, 60%, 45%)', 'hsl(280, 60%, 55%)'];

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="text-primary" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
              <p className="text-sm text-muted-foreground">Análise e métricas do negócio</p>
            </div>
          </div>
          <Select value={periodMonths} onValueChange={setPeriodMonths}>
            <SelectTrigger className="w-[140px] h-9">
              <CalendarIcon size={14} className="mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-primary" />
              <p className="text-xs text-muted-foreground">Total Clientes</p>
            </div>
            <p className="text-xl font-bold text-foreground">{clients.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-accent" />
              <p className="text-xs text-muted-foreground">Receita Banhos</p>
            </div>
            <p className="text-xl font-bold text-accent">{formatCurrency(totalBathRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{baths.length} banhos registrados</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Bath size={16} className="text-primary" />
              <p className="text-xs text-muted-foreground">Média por Banho</p>
            </div>
            <p className="text-xl font-bold text-foreground">{baths.length > 0 ? formatCurrency(totalBathRevenue / baths.length) : 'R$ 0'}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-primary" />
              <p className="text-xs text-muted-foreground">Entradas QR</p>
            </div>
            <p className="text-xl font-bold text-foreground">{entries.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">registros de entrada</p>
          </div>
        </div>

        {/* Bath Revenue Chart */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            Receita Banhos por Mês
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={bathRevenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24, 95%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(24, 95%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                contentStyle={CustomTooltipStyle}
                formatter={(value: number, name: string) => [
                  name === 'receita' ? formatCurrency(value) : value,
                  name === 'receita' ? 'Receita' : 'Quantidade'
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => value === 'receita' ? 'Receita' : 'Qtd. Banhos'} />
              <Area type="monotone" dataKey="receita" stroke="hsl(24, 95%, 60%)" strokeWidth={2} fill="url(#revenueGradient)" />
              <Line type="monotone" dataKey="quantidade" stroke="hsl(174, 72%, 40%)" strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* New Clients Chart */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Novos Clientes por Mês
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={newClientsData}>
              <defs>
                <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={CustomTooltipStyle} />
              <Area type="monotone" dataKey="novos" stroke="hsl(174, 72%, 40%)" strokeWidth={2} fill="url(#clientsGradient)" name="Novos Clientes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* === Frequency Analytics Section === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Top Dogs */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-accent" />
              Dogs Mais Frequentes
            </h3>
            {loadingEntries ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : topDogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma entrada registrada</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topDogs} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis dataKey="dog" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <Tooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => [`${v} entrada(s)`, 'Frequência']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topDogs.map((_, i) => (
                      <Cell key={i} fill={barColors[i % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Day of Week */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarIcon size={16} className="text-primary" />
              Entradas por Dia da Semana
            </h3>
            {loadingEntries ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => [`${v} entrada(s)`, 'Entradas']} />
                  <Bar dataKey="entradas" fill="hsl(174, 72%, 40%)" radius={[4, 4, 0, 0]}>
                    {dayOfWeekData.map((entry, i) => {
                      const maxVal = Math.max(...dayOfWeekData.map(d => d.entradas));
                      return (
                        <Cell
                          key={i}
                          fill={entry.entradas === maxVal && maxVal > 0 ? 'hsl(24, 95%, 60%)' : 'hsl(174, 72%, 40%)'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarIcon size={16} className="text-primary" />
            Calendário de Entradas
          </h3>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-shrink-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasEntry: (date) => datesWithEntries.has(format(date, 'yyyy-MM-dd')),
                }}
                modifiersStyles={{
                  hasEntry: {
                    backgroundColor: 'hsl(174, 72%, 40%)',
                    color: 'white',
                    borderRadius: '50%',
                  },
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              {selectedDate ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </h4>
                    {selectedDateSummary.length > 0 && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={copySelectedDateDogs}>
                        <Copy size={14} /> Copiar lista
                      </Button>
                    )}
                  </div>

                  {entriesForSelectedDate.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma entrada neste dia</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {entriesForSelectedDate.length} entrada(s)
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {selectedDateSummary.length} dog(s) único(s)
                        </Badge>
                      </div>
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {selectedDateSummary.map(({ dog, count }) => (
                          <Card key={dog} className="shadow-sm">
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Dog size={14} className="text-primary" />
                                <span className="text-sm font-medium">{dog}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {count}x
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
                  Selecione um dia no calendário para ver as entradas
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
