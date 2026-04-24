import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useClients } from '@/context/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { Car, Copy, Check, Plus, Trash2, ArrowRight, ArrowLeft, ArrowLeftRight, Search, X, Dog, Save, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';

type TaxiDirection = 'ida' | 'volta' | 'ida_volta';

interface TaxiEntry {
  id: string;
  clientId: string;
  dogName: string;
  tutorName: string;
  direction: TaxiDirection;
}

interface TaxiGroup {
  id: string;
  name: string;
  entries: TaxiEntry[];
}

const DIRECTION_LABELS: Record<TaxiDirection, string> = {
  ida: 'Só ida',
  volta: 'Só volta',
  ida_volta: 'Ida e volta',
};

const DIRECTION_ICONS: Record<TaxiDirection, React.ReactNode> = {
  ida: <ArrowRight size={14} />,
  volta: <ArrowLeft size={14} />,
  ida_volta: <ArrowLeftRight size={14} />,
};

const DIRECTION_COLORS: Record<TaxiDirection, string> = {
  ida: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  volta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ida_volta: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const STORAGE_KEY = 'taxi-dog-list';

const loadTaxiList = (): TaxiEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveTaxiList = (list: TaxiEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const TaxiTab: React.FC = () => {
  const { clients } = useClients();
  const [taxiList, setTaxiList] = useState<TaxiEntry[]>(loadTaxiList);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<TaxiDirection>('ida_volta');
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<'all' | TaxiDirection>('all');
  const [showSelector, setShowSelector] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fixed groups
  const [groups, setGroups] = useState<TaxiGroup[]>([]);
  const [saveGroupName, setSaveGroupName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    const { data } = await supabase.from('taxi_groups').select('*').order('name');
    if (data) setGroups(data.map((g: any) => ({ id: g.id, name: g.name, entries: g.entries as TaxiEntry[] })));
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleSaveGroup = async () => {
    if (!saveGroupName.trim() || taxiList.length === 0) {
      toast.error('Dê um nome e tenha pelo menos 1 pet na lista');
      return;
    }
    try {
      await supabase.from('taxi_groups').insert({ name: saveGroupName.trim(), entries: taxiList as any });
      toast.success(`Grupo "${saveGroupName}" salvo!`);
      setSaveGroupName('');
      setSaveDialogOpen(false);
      fetchGroups();
    } catch { toast.error('Erro ao salvar grupo'); }
  };

  const handleLoadGroup = (group: TaxiGroup) => {
    setTaxiList(group.entries);
    saveTaxiList(group.entries);
    setLoadDialogOpen(false);
    toast.success(`Grupo "${group.name}" carregado!`);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await supabase.from('taxi_groups').delete().eq('id', groupId);
      toast.success('Grupo removido');
      fetchGroups();
    } catch { toast.error('Erro ao remover'); }
  };

  const availableClients = useMemo(() => {
    const usedIds = new Set(taxiList.map(e => e.clientId));
    return clients.filter(c => !usedIds.has(c.id));
  }, [clients, taxiList]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return availableClients;
    const q = searchQuery.toLowerCase();
    return availableClients.filter(c =>
      c.name.toLowerCase().includes(q) || c.tutorName.toLowerCase().includes(q)
    );
  }, [availableClients, searchQuery]);

  const filteredList = useMemo(() => {
    if (filter === 'all') return taxiList;
    return taxiList.filter(e => e.direction === filter);
  }, [taxiList, filter]);

  const handleAdd = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const entry: TaxiEntry = {
      id: crypto.randomUUID(),
      clientId: client.id,
      dogName: client.name,
      tutorName: client.tutorName,
      direction: selectedDirection,
    };
    const updated = [...taxiList, entry];
    setTaxiList(updated);
    saveTaxiList(updated);
    setSearchQuery('');
    toast.success(`${client.name} adicionado à lista de táxi`);
  };

  const handleRemove = (id: string) => {
    const updated = taxiList.filter(e => e.id !== id);
    setTaxiList(updated);
    saveTaxiList(updated);
    toast.success('Removido da lista');
  };

  const handleChangeDirection = (id: string, direction: TaxiDirection) => {
    const updated = taxiList.map(e => e.id === id ? { ...e, direction } : e);
    setTaxiList(updated);
    saveTaxiList(updated);
  };

  const handleCopy = () => {
    const lines = filteredList.map(e => {
      const dir = DIRECTION_LABELS[e.direction];
      return `🐾 ${e.dogName} (${e.tutorName}) — ${dir}`;
    });
    const header = `🚕 Lista Táxi Dog — ${filteredList.length} pets\n${'─'.repeat(30)}`;
    const idaCount = filteredList.filter(e => e.direction === 'ida' || e.direction === 'ida_volta').length;
    const voltaCount = filteredList.filter(e => e.direction === 'volta' || e.direction === 'ida_volta').length;
    const summary = `\n${'─'.repeat(30)}\n📊 Ida: ${idaCount} | Volta: ${voltaCount}`;
    const text = `${header}\n${lines.join('\n')}${summary}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Lista copiada!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const counts = useMemo(() => ({
    total: taxiList.length,
    ida: taxiList.filter(e => e.direction === 'ida').length,
    volta: taxiList.filter(e => e.direction === 'volta').length,
    ida_volta: taxiList.filter(e => e.direction === 'ida_volta').length,
  }), [taxiList]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => setFilter('all')} className={`rounded-xl p-2.5 text-center transition-all border ${filter === 'all' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card'}`}>
          <p className="text-lg font-bold text-foreground">{counts.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </button>
        <button onClick={() => setFilter('ida')} className={`rounded-xl p-2.5 text-center transition-all border ${filter === 'ida' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-border bg-card'}`}>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{counts.ida}</p>
          <p className="text-[10px] text-muted-foreground">Só ida</p>
        </button>
        <button onClick={() => setFilter('volta')} className={`rounded-xl p-2.5 text-center transition-all border ${filter === 'volta' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-sm' : 'border-border bg-card'}`}>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{counts.volta}</p>
          <p className="text-[10px] text-muted-foreground">Só volta</p>
        </button>
        <button onClick={() => setFilter('ida_volta')} className={`rounded-xl p-2.5 text-center transition-all border ${filter === 'ida_volta' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm' : 'border-border bg-card'}`}>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{counts.ida_volta}</p>
          <p className="text-[10px] text-muted-foreground">Ida/Volta</p>
        </button>
      </div>

      {/* Fixed groups bar */}
      <div className="flex gap-2">
        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1 h-9">
              <FolderOpen size={14} /> Grupos Fixos
              {groups.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0">{groups.length}</Badge>}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Grupos Fixos de Táxi</DialogTitle>
            </DialogHeader>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum grupo salvo. Salve a lista atual como grupo fixo.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {groups.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <button onClick={() => handleLoadGroup(g)} className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-sm truncate">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.entries.length} pets</p>
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteGroup(g.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" disabled={taxiList.length === 0}>
              <Save size={14} /> Salvar Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Salvar como Grupo Fixo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome do grupo (ex: Segunda-feira)" value={saveGroupName} onChange={e => setSaveGroupName(e.target.value)} className="h-10" />
              <p className="text-xs text-muted-foreground">{taxiList.length} pet(s) na lista atual</p>
              <Button className="w-full" onClick={handleSaveGroup} disabled={!saveGroupName.trim()}>
                <Save size={14} className="mr-1.5" /> Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Direction selector */}
      <div className="flex gap-1.5">
        {(['ida', 'volta', 'ida_volta'] as TaxiDirection[]).map(dir => (
          <button
            key={dir}
            onClick={() => setSelectedDirection(dir)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-medium transition-all border ${
              selectedDirection === dir
                ? DIRECTION_COLORS[dir] + ' border-current shadow-sm'
                : 'border-border bg-card text-muted-foreground'
            }`}
          >
            {DIRECTION_ICONS[dir]}
            {DIRECTION_LABELS[dir]}
          </button>
        ))}
      </div>

      {/* Search + Add */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSelector(true); }}
            onFocus={() => setShowSelector(true)}
            placeholder="Buscar pet pelo nome ou tutor..."
            className="pl-9 pr-9 h-11"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setShowSelector(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>

        {showSelector && (
          <div className="space-y-1.5">
            {filteredClients.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                {searchQuery ? 'Nenhum pet encontrado' : 'Todos os pets já estão na lista'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                {filteredClients.slice(0, 20).map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleAdd(client.id)}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 text-left transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm active:scale-[0.97]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Dog size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{client.tutorName}</p>
                    </div>
                    <Plus size={14} className="shrink-0 text-primary" />
                  </button>
                ))}
              </div>
            )}
            {filteredClients.length > 20 && (
              <p className="text-center text-[11px] text-muted-foreground">
                Mostrando 20 de {filteredClients.length} — use a busca para filtrar
              </p>
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowSelector(false)}>
              Fechar
            </Button>
          </div>
        )}

        {!showSelector && (
          <Button variant="outline" className="w-full h-11 gap-2 border-dashed" onClick={() => { setShowSelector(true); setTimeout(() => searchRef.current?.focus(), 100); }}>
            <Plus size={16} />
            Adicionar pet ao táxi
          </Button>
        )}
      </div>

      {/* Copy button */}
      {filteredList.length > 0 && (
        <Button onClick={handleCopy} variant="outline" className="w-full gap-2 h-10">
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          {copied ? 'Copiado!' : `Copiar lista (${filteredList.length} pets)`}
        </Button>
      )}

      {/* List */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Car size={32} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum pet na lista de táxi</p>
            </CardContent>
          </Card>
        ) : (
          filteredList.map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Dog size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{entry.dogName}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.tutorName}</p>
                </div>
                <Select value={entry.direction} onValueChange={(v) => handleChangeDirection(entry.id, v as TaxiDirection)}>
                  <SelectTrigger className="w-auto h-8 text-xs gap-1 border-0 bg-transparent p-0 pr-2 shadow-none">
                    <Badge className={`${DIRECTION_COLORS[entry.direction]} gap-1 text-[11px] font-medium px-2 py-0.5`}>
                      {DIRECTION_ICONS[entry.direction]}
                      {DIRECTION_LABELS[entry.direction]}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ida">🔵 Só ida</SelectItem>
                    <SelectItem value="volta">🟠 Só volta</SelectItem>
                    <SelectItem value="ida_volta">🟢 Ida e volta</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => handleRemove(entry.id)}>
                  <Trash2 size={15} />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TaxiTab;
