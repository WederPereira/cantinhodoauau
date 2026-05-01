import React, { useMemo, useState } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, VaccineType, VACCINE_TYPE_LABELS, ANTIPULGAS_BRANDS, FleaType, getVaccineExpiryDate, getFleaExpiryDate, isExpired, isExpiringSoon } from '@/types/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Row = {
  client: Client;
  // ISO date strings (yyyy-MM-dd) for inputs
  gripe: string;
  v10: string;
  raiva: string;
  giardia: string;
  flea: string;
  fleaBrand: string;
  fleaDuration: 1 | 2 | 3 | 6 | 35 | 45;
  fleaType: FleaType;
};

const toInputDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return format(d, 'yyyy-MM-dd');
};

const buildInitialRow = (client: Client): Row => {
  const lastFlea = client.fleaHistory?.[0];
  return {
    client,
    gripe: toInputDate(client.vaccines.gripe),
    v10: toInputDate(client.vaccines.v10),
    raiva: toInputDate(client.vaccines.raiva),
    giardia: toInputDate(client.vaccines.giardia),
    flea: toInputDate(lastFlea?.date || client.vaccines.antipulgas),
    fleaBrand: lastFlea?.brand || 'Nexgard',
    fleaDuration: (lastFlea?.durationMonths || 1) as Row['fleaDuration'],
    fleaType: (lastFlea?.fleaType || 'fixo') as FleaType,
  };
};

const dateCellClass = (iso: string, isFlea: boolean, durationMonths?: number): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const expiry = isFlea ? getFleaExpiryDate(iso, durationMonths || 1) : getVaccineExpiryDate(iso);
  if (isExpired(expiry)) return 'border-destructive/50 bg-destructive/5';
  if (isExpiringSoon(expiry, 30)) return 'border-[hsl(var(--status-warning)/0.5)] bg-[hsl(var(--status-warning-bg))]';
  return 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800';
};

export const HealthSpreadsheet: React.FC = () => {
  const { activeClients: clients, addVaccineRecord, addFleaRecord } = useClients();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(clients.map(c => [c.id, buildInitialRow(c)]))
  );
  const [dirty, setDirty] = useState<Record<string, Set<string>>>({});
  const [savingAll, setSavingAll] = useState(false);

  // Re-sync when clients change (e.g. after save)
  React.useEffect(() => {
    setRows(prev => {
      const next: Record<string, Row> = {};
      for (const c of clients) {
        next[c.id] = prev[c.id] ? { ...buildInitialRow(c), ...{
          // Preserve in-flight edits if any
          gripe: prev[c.id].gripe || toInputDate(c.vaccines.gripe),
          v10: prev[c.id].v10 || toInputDate(c.vaccines.v10),
          raiva: prev[c.id].raiva || toInputDate(c.vaccines.raiva),
          giardia: prev[c.id].giardia || toInputDate(c.vaccines.giardia),
        }} : buildInitialRow(c);
      }
      return next;
    });
  }, [clients]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return clients
      .filter(c => !s || c.name.toLowerCase().includes(s) || c.tutorName.toLowerCase().includes(s) || (c.breed || '').toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, search]);

  const dirtyCount = useMemo(
    () => Object.values(dirty).reduce((a, s) => a + s.size, 0),
    [dirty]
  );

  const setField = (clientId: string, field: keyof Row, value: any) => {
    setRows(prev => ({
      ...prev,
      [clientId]: { ...prev[clientId], [field]: value },
    }));
    setDirty(prev => {
      const next = { ...prev };
      const set = new Set(next[clientId] || []);
      set.add(field as string);
      next[clientId] = set;
      return next;
    });
  };

  const saveRow = async (clientId: string) => {
    const dirtyFields = dirty[clientId];
    if (!dirtyFields || dirtyFields.size === 0) return;
    const row = rows[clientId];
    const original = buildInitialRow(row.client);

    const vaccineFields: (VaccineType)[] = ['gripe', 'v10', 'raiva', 'giardia'];
    for (const v of vaccineFields) {
      if (dirtyFields.has(v) && row[v] && row[v] !== original[v]) {
        await addVaccineRecord(clientId, v, new Date(row[v]).toISOString());
      }
    }

    const fleaChanged = ['flea', 'fleaBrand', 'fleaDuration', 'fleaType'].some(f => dirtyFields.has(f));
    if (fleaChanged && row.flea) {
      await addFleaRecord(
        clientId,
        new Date(row.flea).toISOString(),
        row.fleaBrand || 'Nexgard',
        row.fleaDuration,
        undefined,
        row.fleaType
      );
    }

    setDirty(prev => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
    toast.success(`${row.client.name} atualizado`);
  };

  const saveAll = async () => {
    setSavingAll(true);
    const ids = Object.keys(dirty);
    for (const id of ids) {
      try {
        await saveRow(id);
      } catch (e) {
        console.error('Erro salvando', id, e);
      }
    }
    setSavingAll(false);
    toast.success(`${ids.length} registro(s) salvo(s)`);
  };

  return (
    <div className="space-y-3">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-xs text-muted-foreground">
          ✏️ Edite as datas direto na planilha. Cores indicam status (vermelho = vencido, amarelo = vencendo, verde = em dia). Clique em <strong>Salvar</strong> para confirmar as alterações.
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pet, tutor ou raça..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Button
          onClick={saveAll}
          disabled={dirtyCount === 0 || savingAll}
          size="sm"
          className="h-10 gap-1"
        >
          {savingAll ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar todos {dirtyCount > 0 && `(${dirtyCount})`}
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="border-b border-border">
              <th className="text-left p-2 font-semibold sticky left-0 bg-muted/50 z-20 min-w-[160px]">Pet / Tutor</th>
              {(['gripe', 'v10', 'raiva', 'giardia'] as VaccineType[]).map(v => (
                <th key={v} className="text-center p-2 font-semibold min-w-[130px]">
                  💉 {VACCINE_TYPE_LABELS[v]}
                </th>
              ))}
              <th className="text-center p-2 font-semibold min-w-[130px]">🐛 Antipulgas</th>
              <th className="text-center p-2 font-semibold min-w-[120px]">Marca</th>
              <th className="text-center p-2 font-semibold min-w-[80px]">Duração</th>
              <th className="text-center p-2 font-semibold min-w-[100px]">Tipo</th>
              <th className="text-center p-2 font-semibold sticky right-0 bg-muted/50 min-w-[80px]">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const row = rows[c.id];
              if (!row) return null;
              const isDirty = !!dirty[c.id]?.size;
              return (
                <tr
                  key={c.id}
                  className={cn('border-b border-border/50 hover:bg-muted/20 transition-colors', isDirty && 'bg-primary/5')}
                >
                  <td className="p-2 sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate text-xs">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.tutorName}</p>
                      </div>
                      {isDirty && <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary text-primary">●</Badge>}
                    </div>
                  </td>
                  {(['gripe', 'v10', 'raiva', 'giardia'] as VaccineType[]).map(v => (
                    <td key={v} className="p-1.5">
                      <Input
                        type="date"
                        value={row[v]}
                        onChange={e => setField(c.id, v, e.target.value)}
                        className={cn('h-8 text-xs px-2', dateCellClass(row[v], false))}
                      />
                    </td>
                  ))}
                  <td className="p-1.5">
                    <Input
                      type="date"
                      value={row.flea}
                      onChange={e => setField(c.id, 'flea', e.target.value)}
                      className={cn('h-8 text-xs px-2', dateCellClass(row.flea, true, row.fleaDuration))}
                    />
                  </td>
                  <td className="p-1.5">
                    <Select value={row.fleaBrand} onValueChange={v => setField(c.id, 'fleaBrand', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANTIPULGAS_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1.5">
                    <Select value={String(row.fleaDuration)} onValueChange={v => setField(c.id, 'fleaDuration', Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 mês</SelectItem>
                        <SelectItem value="2">2 meses</SelectItem>
                        <SelectItem value="3">3 meses</SelectItem>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="35">35 dias</SelectItem>
                        <SelectItem value="45">45 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1.5">
                    <Select value={row.fleaType} onValueChange={v => setField(c.id, 'fleaType', v as FleaType)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixo">Fixo</SelectItem>
                        <SelectItem value="nao_fixo">Não fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1.5 sticky right-0 bg-background">
                    <Button
                      size="sm"
                      variant={isDirty ? 'default' : 'ghost'}
                      disabled={!isDirty}
                      onClick={() => saveRow(c.id)}
                      className="h-8 text-xs gap-1 w-full"
                    >
                      {isDirty ? <Save size={12} /> : <CheckCircle2 size={12} />}
                      {isDirty ? 'Salvar' : 'OK'}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">Nenhum pet encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HealthSpreadsheet;
