import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Copy, Trophy, Dog } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface QrEntry {
  id: string;
  tutor: string;
  dog: string;
  raca: string;
  data_hora: string;
}

const FrequencyAnalytics: React.FC = () => {
  const [entries, setEntries] = useState<QrEntry[]>([]);
  const [dailyRecords, setDailyRecords] = useState<Array<{ dog: string; date: string; ate: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      const [entriesRes, recordsRes] = await Promise.all([
        supabase.from('qr_entries').select('*').order('data_hora', { ascending: false }),
        supabase.from('daily_records').select('dog, date, ate'),
      ]);
      if (!entriesRes.error && entriesRes.data) setEntries(entriesRes.data as any as QrEntry[]);
      if (!recordsRes.error && recordsRes.data) setDailyRecords(recordsRes.data as any);
      setLoading(false);
    };
    fetchEntries();
  }, []);

  const topDogs = useMemo(() => {
    const freq: Record<string, { dog: string; raca: string; count: number }> = {};
    entries.forEach(e => {
      const key = `${e.dog}||${e.raca || ''}`;
      if (!freq[key]) freq[key] = { dog: e.dog, raca: e.raca || '', count: 0 };
      freq[key].count++;
    });
    return Object.values(freq)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(d => ({ dog: d.raca ? `${d.dog} (${d.raca})` : d.dog, count: d.count }));
  }, [entries]);

  const dayOfWeekData = useMemo(() => {
    const freq = [0, 0, 0, 0, 0, 0, 0];
    entries.forEach(e => { freq[getDay(new Date(e.data_hora))]++; });
    return DAY_NAMES.map((name, i) => ({ day: name, entradas: freq[i] }));
  }, [entries]);

  const entriesForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayStart = startOfDay(selectedDate);
    return entries.filter(e => startOfDay(new Date(e.data_hora)).getTime() === dayStart.getTime());
  }, [entries, selectedDate]);

  const selectedDateSummary = useMemo(() => {
    const freq: Record<string, { dog: string; raca: string; count: number }> = {};
    entriesForSelectedDate.forEach(e => {
      const key = `${e.dog}||${e.raca || ''}`;
      if (!freq[key]) freq[key] = { dog: e.dog, raca: e.raca || '', count: 0 };
      freq[key].count++;
    });
    return Object.values(freq)
      .sort((a, b) => b.count - a.count)
      .map(d => ({ dog: d.raca ? `${d.dog} (${d.raca})` : d.dog, count: d.count }));
  }, [entriesForSelectedDate]);

  const datesWithEntries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(format(new Date(e.data_hora), 'yyyy-MM-dd')));
    return set;
  }, [entries]);

  const copySelectedDateDogs = () => {
    if (selectedDateSummary.length === 0) return;
    const total = selectedDateSummary.reduce((s, d) => s + d.count, 0);
    const dateStr = format(selectedDate!, 'dd/MM/yyyy');
    const dayRecords = dailyRecords.filter(r => r.date === format(selectedDate!, 'yyyy-MM-dd'));
    const header = `\`CRECHE ${dateStr}:\``;
    const lines = selectedDateSummary.map((d, i) => {
      const record = dayRecords.find(r => r.dog.toLowerCase() === d.dog.split(' (')[0].toLowerCase());
      const ateStatus = record ? (record.ate ? '✅' : '❌') : '⏳';
      return `${i + 1}. ${d.dog.toUpperCase()} ${ateStatus}`;
    });
    const footer = `\`TOTAL:${total}\``;
    navigator.clipboard.writeText(`${header}\n\n${lines.join('\n\n')}\n\n${footer}`);
    toast.success('Lista copiada no formato WhatsApp!');
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

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Carregando análises...</p>;

  return (
    <div className="space-y-4">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-accent" />
            Dogs Mais Frequentes
          </h3>
          {topDogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma entrada registrada</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topDogs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis dataKey="dog" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} entrada(s)`, 'Frequência']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {topDogs.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarIcon size={16} className="text-primary" />
            Entradas por Dia da Semana
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} entrada(s)`, 'Entradas']} />
              <Bar dataKey="entradas" fill="hsl(174, 72%, 40%)" radius={[4, 4, 0, 0]}>
                {dayOfWeekData.map((entry, i) => {
                  const maxVal = Math.max(...dayOfWeekData.map(d => d.entradas));
                  return <Cell key={i} fill={entry.entradas === maxVal && maxVal > 0 ? 'hsl(24, 95%, 60%)' : 'hsl(174, 72%, 40%)'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CalendarIcon size={16} className="text-primary" />
          Calendário de Entradas
        </h3>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasEntry: (date) => datesWithEntries.has(format(date, 'yyyy-MM-dd')) }}
              modifiersStyles={{ hasEntry: { backgroundColor: 'hsl(174, 72%, 40%)', color: 'white', borderRadius: '50%' } }}
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
                      <Copy size={14} /> Copiar
                    </Button>
                  )}
                </div>
                {entriesForSelectedDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma entrada neste dia</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">{entriesForSelectedDate.length} entrada(s)</Badge>
                      <Badge variant="secondary" className="text-xs">{selectedDateSummary.length} dog(s)</Badge>
                    </div>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      {selectedDateSummary.map(({ dog, count }) => (
                        <Card key={dog} className="shadow-sm">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Dog size={14} className="text-primary" />
                              <span className="text-sm font-medium">{dog}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{count}x</Badge>
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

export default FrequencyAnalytics;
