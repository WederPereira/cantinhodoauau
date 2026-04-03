import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, Search, ChevronLeft, ChevronRight, ClipboardList, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface FecesCollection {
  id: string;
  client_id: string;
  month_year: string;
  collected: boolean;
  collected_at: string | null;
  collected_by: string | null;
  collected_by_name: string;
  notes: string;
}

const FecesCollectionTab: React.FC = () => {
  const { clients } = useClients();
  const { session } = useAuth();
  const [collections, setCollections] = useState<FecesCollection[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feces_collections')
      .select('*')
      .eq('month_year', monthKey);
    if (data) setCollections(data as FecesCollection[]);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => {
    fetchCollections();
    const channel = supabase
      .channel('feces-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feces_collections' }, fetchCollections)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCollections]);

  const collectedMap = useMemo(() => {
    const map = new Map<string, FecesCollection>();
    collections.forEach(c => map.set(c.client_id, c));
    return map;
  }, [collections]);

  const filteredClients = useMemo(() => {
    let list = [...clients];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.tutorName.toLowerCase().includes(s));
    }
    // Sort: not collected first
    list.sort((a, b) => {
      const aCollected = collectedMap.get(a.id)?.collected ?? false;
      const bCollected = collectedMap.get(b.id)?.collected ?? false;
      if (aCollected === bCollected) return a.name.localeCompare(b.name);
      return aCollected ? 1 : -1;
    });
    return list;
  }, [clients, search, collectedMap]);

  const collectedCount = useMemo(() => {
    return clients.filter(c => collectedMap.get(c.id)?.collected).length;
  }, [clients, collectedMap]);

  const handleToggleCollected = async (clientId: string) => {
    if (!session?.user) return;
    const existing = collectedMap.get(clientId);
    const userName = session.user.user_metadata?.full_name || session.user.email || '';

    if (existing) {
      const newCollected = !existing.collected;
      await supabase
        .from('feces_collections')
        .update({
          collected: newCollected,
          collected_at: newCollected ? new Date().toISOString() : null,
          collected_by: newCollected ? session.user.id : null,
          collected_by_name: newCollected ? userName : '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('feces_collections').insert({
        client_id: clientId,
        month_year: monthKey,
        collected: true,
        collected_at: new Date().toISOString(),
        collected_by: session.user.id,
        collected_by_name: userName,
      });
    }
    toast.success(existing?.collected ? 'Coleta desmarcada' : 'Coleta registrada ✅');
  };

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft size={18} />
        </Button>
        <h3 className="text-sm font-semibold capitalize text-foreground">{monthLabel}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{collectedCount}</p>
          <p className="text-[10px] text-muted-foreground">Coletados</p>
        </div>
        <div className="flex-1 bg-muted/50 border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{clients.length - collectedCount}</p>
          <p className="text-[10px] text-muted-foreground">Pendentes</p>
        </div>
        <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{clients.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar pet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10 text-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
        {filteredClients.map(client => {
          const record = collectedMap.get(client.id);
          const isCollected = record?.collected ?? false;

          return (
            <div
              key={client.id}
              onClick={() => handleToggleCollected(client.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                isCollected
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800'
                  : 'bg-card border-border hover:border-primary/30'
              )}
            >
              {isCollected ? (
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Circle size={20} className="text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', isCollected && 'line-through text-muted-foreground')}>
                  {client.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {client.breed || 'SRD'} • {client.tutorName}
                </p>
              </div>
              {isCollected && record?.collected_by_name && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  por {record.collected_by_name.split(' ')[0]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FecesCollectionTab;
