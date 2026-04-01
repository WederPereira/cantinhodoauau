import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Utensils, UtensilsCrossed, Dog, RefreshCw, Calendar, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logAction } from '@/hooks/useActionLog';

interface TodayEntry {
  id: string;
  dog: string;
  tutor: string;
  raca: string;
  qrEntryId: string;
  ate: boolean;
  recordId: string | null;
}

const DaycarePresence: React.FC = () => {
  const [entries, setEntries] = useState<TodayEntry[]>([]);
  const [loading, setLoading] = useState(true);
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
          ate: record?.ate ?? false,
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

  const toggleAte = async (entry: TodayEntry) => {
    const newAte = !entry.ate;
    try {
      if (entry.recordId) {
        const { error } = await supabase
          .from('daily_records')
          .update({ ate: newAte, updated_at: new Date().toISOString() })
          .eq('id', entry.recordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_records')
          .insert({
            qr_entry_id: entry.qrEntryId,
            dog: entry.dog,
            tutor: entry.tutor,
            date: today,
            ate: newAte,
          });
        if (error) throw error;
      }

      setEntries(prev =>
        prev.map(e => e.id === entry.id ? { ...e, ate: newAte } : e)
      );

      toast.success(newAte ? `${entry.dog} comeu! ✅` : `${entry.dog} marcado como não comeu`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar registro');
    }
  };

  const ateCount = entries.filter(e => e.ate).length;
  const notAteCount = entries.length - ateCount;

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

      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Dog size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum dog deu entrada hoje</p>
          <p className="text-xs mt-1">Use o botão de Ler Entrada no Dashboard para registrar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <button
              key={entry.id}
              onClick={() => toggleAte(entry)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all active:scale-[0.98]",
                entry.ate
                  ? 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800'
                  : 'bg-card border-border hover:border-orange-300'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <div className="min-w-0 text-left">
                  <p className="font-semibold text-sm text-foreground truncate">{entry.dog}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground truncate">{entry.tutor}</span>
                    {entry.raca && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{entry.raca}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all",
                entry.ate
                  ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
              )}>
                {entry.ate ? (
                  <><Utensils size={14} /> Comeu</>
                ) : (
                  <><UtensilsCrossed size={14} /> Não comeu</>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DaycarePresence;
