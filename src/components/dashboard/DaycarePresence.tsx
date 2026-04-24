import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useClients } from '@/context/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Utensils, UtensilsCrossed, Dog, RefreshCw, Calendar, Search, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAction } from '@/hooks/useActionLog';

interface TodayEntry {
  id: string;
  dog: string;
  tutor: string;
  raca: string;
  qrEntryId: string;
  ate: boolean | null;
  notes: string | null;
  recordId: string | null;
}

const DaycarePresence: React.FC = () => {
  const { activeClients } = useClients();
  const [entries, setEntries] = useState<TodayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ate' | 'not_ate'>('all');
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const { data: qrData, error: qrError } = await supabase
        .from('qr_entries')
        .select('*')
        .gte('data_hora', startOfDay.toISOString())
        .lte('data_hora', endOfDay.toISOString())
        .order('data_hora', { ascending: true });

      if (qrError) throw qrError;

      const { data: records, error: recError } = await supabase
        .from('daily_records')
        .select('*')
        .eq('date', today);

      if (recError) throw recError;

      const recordMap = new Map(
        (records || []).map((r: any) => [r.qr_entry_id, r])
      );

      const mapped: TodayEntry[] = (qrData || []).map((qr: any) => {
        const record = recordMap.get(qr.id) as any;
        return {
          id: qr.id,
          dog: qr.dog,
          tutor: qr.tutor,
          raca: qr.raca,
          qrEntryId: qr.id,
          ate: record?.ate ?? null,
          notes: record?.notes ?? null,
          recordId: record?.id ?? null,
        };
      });

      setEntries(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar entradas do dia');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchEntries();
    const channel = supabase
      .channel('daycare-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_entries' }, () => fetchEntries())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_records' }, () => fetchEntries())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEntries]);

  const setMealStatus = async (entry: TodayEntry, newAte: boolean, newNotes: string | null) => {
    try {
      if (entry.recordId) {
        const { error } = await supabase
          .from('daily_records')
          .update({ ate: newAte, notes: newNotes, updated_at: new Date().toISOString() })
          .eq('id', entry.recordId);
        if (error) throw error;
        logAction('daycare_meal', 'daycare', entry.recordId, { dog_name: entry.dog, tutor_name: entry.tutor, ate: newAte, notes: newNotes });
      } else {
        const { data: newRecord, error } = await supabase
          .from('daily_records')
          .insert({
            qr_entry_id: entry.qrEntryId,
            dog: entry.dog,
            tutor: entry.tutor,
            date: today,
            ate: newAte,
            notes: newNotes,
          })
          .select('id')
          .single();
        if (error) throw error;
        logAction('daycare_meal', 'daycare', newRecord?.id, { dog_name: entry.dog, tutor_name: entry.tutor, ate: newAte, notes: newNotes });
      }

      setEntries(prev =>
        prev.map(e => e.id === entry.id ? { ...e, ate: newAte, notes: newNotes, recordId: entry.recordId || 'temp' } : e)
      );

      toast.success(`${entry.dog} atualizado!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar registro');
    }
  };

  const ateCount = entries.filter(e => e.ate === true).length;
  const notAteCount = entries.filter(e => e.ate === false).length;

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.dog.toLowerCase().includes(q) || e.tutor.toLowerCase().includes(q));
    }
    if (statusFilter === 'ate') list = list.filter(e => e.ate);
    return list;
  }, [entries, searchQuery, statusFilter]);

  const copyList = () => {
    const list = filteredEntries.map((e, idx) => `${idx + 1}. ${e.dog} (${e.tutor})`).join('\n');
    navigator.clipboard.writeText(list);
    toast.success('Lista copiada!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-primary" />
          <span className="text-sm font-medium text-foreground capitalize">{todayDisplay}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchEntries} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center shadow-soft">
          <Dog size={18} className="mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{entries.length}</p>
          <p className="text-[10px] text-muted-foreground">Presentes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center shadow-soft">
          <Utensils size={18} className="mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold text-green-600">{ateCount}</p>
          <p className="text-[10px] text-muted-foreground">Comeram</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center shadow-soft">
          <UtensilsCrossed size={18} className="mx-auto text-orange-500 mb-1" />
          <p className="text-2xl font-bold text-orange-500">{notAteCount}</p>
          <p className="text-[10px] text-muted-foreground">Não comeram</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pet ou tutor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[120px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ate">Comeram</SelectItem>
            <SelectItem value="not_ate">Não comeram</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={copyList} className="h-9 w-9 shrink-0" title="Copiar lista">
          <Copy size={16} />
        </Button>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Dog size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{entries.length === 0 ? 'Nenhum dog deu entrada hoje' : 'Nenhum resultado para a busca'}</p>
          {entries.length === 0 && <p className="text-xs mt-1">Use o botão de QR Code no Dashboard para registrar</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredEntries.map((entry, idx) => {
            const client = activeClients.find(c => c.name === entry.dog && c.tutorName === entry.tutor) || activeClients.find(c => c.name === entry.dog);
            return (
              <div
                key={entry.id}
                className={cn(
                  "bg-card border border-border rounded-2xl overflow-hidden transition-all hover:border-primary/30 hover:shadow-md flex flex-col",
                  entry.ate === true && entry.notes === 'tudo'
                    ? 'border-green-300 dark:border-green-800'
                    : entry.ate === true && entry.notes === 'metade'
                    ? 'border-amber-300 dark:border-amber-800'
                    : entry.ate === false
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-border'
                )}
              >
                {/* Image Section */}
                <div 
                  className="aspect-[4/3] bg-muted relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform flex-shrink-0"
                  onClick={() => client && window.dispatchEvent(new CustomEvent('openClientDetail', { detail: client.id }))}
                >
                  {client?.photo ? (
                    <img src={client.photo} alt={entry.dog} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50">
                      <Dog size={36} className="text-muted-foreground/30 mb-2" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 rounded-full w-5 h-5 flex items-center justify-center text-[10px] text-white font-mono font-bold">
                    {idx + 1}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8">
                    <p className="font-bold text-sm text-white truncate drop-shadow-md">{entry.dog}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-white/80 truncate drop-shadow">{entry.tutor}</span>
                      {entry.raca && (
                        <span className="text-[8px] bg-white/20 text-white px-1.5 py-0.5 rounded font-medium backdrop-blur-sm truncate max-w-[60px]">
                          {entry.raca}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meal Buttons Section */}
                <div className={cn(
                  "p-2.5 space-y-2 flex-grow flex flex-col justify-end",
                  entry.ate === true && entry.notes === 'tudo' ? 'bg-green-50 dark:bg-green-950/30' :
                  entry.ate === true && entry.notes === 'metade' ? 'bg-amber-50 dark:bg-amber-950/30' :
                  entry.ate === false ? 'bg-red-50 dark:bg-red-950/30' : ''
                )}>
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      onClick={() => setMealStatus(entry, true, 'tudo')}
                      className={cn(
                        "flex-1 flex justify-center items-center gap-1 py-1.5 rounded-md font-semibold text-[10px] border transition-all active:scale-95 shadow-sm",
                        entry.ate === true && entry.notes === 'tudo'
                          ? "bg-green-500 border-green-600 text-white"
                          : "bg-card border-border hover:border-green-400 text-muted-foreground hover:bg-green-50 dark:hover:bg-green-900/20"
                      )}
                    >
                      <Utensils size={12} /> Tudo
                    </button>
                    <button
                      onClick={() => setMealStatus(entry, true, 'metade')}
                      className={cn(
                        "flex-1 flex justify-center items-center gap-1 py-1.5 rounded-md font-semibold text-[10px] border transition-all active:scale-95 shadow-sm",
                        entry.ate === true && entry.notes === 'metade'
                          ? "bg-amber-500 border-amber-600 text-white"
                          : "bg-card border-border hover:border-amber-400 text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      )}
                    >
                      <Utensils size={12} /> Meio
                    </button>
                    <button
                      onClick={() => setMealStatus(entry, false, null)}
                      className={cn(
                        "flex-1 flex justify-center items-center gap-1 py-1.5 rounded-md font-semibold text-[10px] border transition-all active:scale-95 shadow-sm",
                        entry.ate === false
                          ? "bg-red-500 border-red-600 text-white"
                          : "bg-card border-border hover:border-red-400 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20"
                      )}
                    >
                      <UtensilsCrossed size={12} /> Não
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DaycarePresence;
