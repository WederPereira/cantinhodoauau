import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Search, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
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
  const { clients: allClients, activeClients } = useClients();
  const { session } = useAuth();
  const [collections, setCollections] = useState<FecesCollection[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'pending' | 'collected'>('pending');

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
    let list = [...activeClients];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.tutorName.toLowerCase().includes(s));
    }

    if (viewTab === 'collected') {
      list = list.filter(c => collectedMap.get(c.id)?.collected);
      list.sort((a, b) => {
        const aDate = collectedMap.get(a.id)?.collected_at || '';
        const bDate = collectedMap.get(b.id)?.collected_at || '';
        return bDate.localeCompare(aDate);
      });
    } else {
      list = list.filter(c => !collectedMap.get(c.id)?.collected);
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [allClients, search, collectedMap, viewTab]);

  const collectedCount = useMemo(() => {
    return activeClients.filter(c => collectedMap.get(c.id)?.collected).length;
  }, [activeClients, collectedMap]);

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
          <p className="text-xl font-bold text-foreground">{activeClients.length - collectedCount}</p>
          <p className="text-[10px] text-muted-foreground">Pendentes</p>
        </div>
        <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{activeClients.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Tabs: Pendentes / Coletados */}
      <div className="flex gap-2">
        <Button
          variant={viewTab === 'pending' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 gap-1 text-xs"
          onClick={() => setViewTab('pending')}
        >
          <Circle size={12} /> Pendentes ({activeClients.length - collectedCount})
        </Button>
        <Button
          variant={viewTab === 'collected' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setViewTab('collected')}
        >
          <CheckCircle2 size={12} /> Coletados ({collectedCount})
        </Button>
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
        {filteredClients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {viewTab === 'collected' ? 'Nenhuma coleta registrada' : 'Todos coletados! 🎉'}
          </div>
        )}
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
                {isCollected && record && (
                  <div className="flex items-center gap-2 mt-1">
                    {record.collected_at && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <Calendar size={10} />
                        {format(new Date(record.collected_at), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    )}
                    {record.collected_by_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User size={10} />
                        {record.collected_by_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FecesCollectionTab;
