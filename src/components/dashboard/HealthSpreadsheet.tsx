import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, VaccineType, VACCINE_TYPE_LABELS, ANTIPULGAS_BRANDS, FleaType, getVaccineExpiryDate, getFleaExpiryDate, isExpired, isExpiringSoon } from '@/types/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Save, Loader2, CheckCircle2, Maximize2, Minimize2, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Row = {
  client: Client;
  gripe: string;
  v10: string;
  raiva: string;
  giardia: string;
  flea: string;
  fleaBrand: string;
  fleaDuration: 1 | 2 | 3 | 6 | 35 | 45;
  fleaType: FleaType;
};

const VACCINE_FIELDS: VaccineType[] = ['gripe', 'v10', 'raiva', 'giardia'];
// Editable column order (used for keyboard navigation)
const COLS: (keyof Row)[] = ['gripe', 'v10', 'raiva', 'giardia', 'flea', 'fleaBrand', 'fleaDuration', 'fleaType'];

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
  if (isExpired(expiry)) return 'border-destructive/60 bg-destructive/10 text-destructive';
  if (isExpiringSoon(expiry, 30)) return 'border-[hsl(var(--status-warning)/0.6)] bg-[hsl(var(--status-warning-bg))]';
  return 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-700';
};

interface SheetProps {
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const SheetContent: React.FC<SheetProps> = ({ fullscreen, onToggleFullscreen }) => {
  const { activeClients: clients, addVaccineRecord, addFleaRecord } = useClients();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(clients.map(c => [c.id, buildInitialRow(c)]))
  );
  const [dirty, setDirty] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-sync when clients change
  React.useEffect(() => {
    setRows(prev => {
      const next: Record<string, Row> = {};
      for (const c of clients) {
        if (prev[c.id] && dirty[c.id]?.size) {
          next[c.id] = prev[c.id];
        } else {
          next[c.id] = buildInitialRow(c);
        }
      }
      return next;
    });
  }, [clients, dirty]);

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
    setRows(prev => ({ ...prev, [clientId]: { ...prev[clientId], [field]: value } }));
    setDirty(prev => {
      const next = { ...prev };
      const set = new Set(next[clientId] || []);
      set.add(field as string);
      next[clientId] = set;
      return next;
    });
  };

  const saveRow = useCallback(async (clientId: string, silent = false) => {
    const dirtyFields = dirty[clientId];
    if (!dirtyFields || dirtyFields.size === 0) return;
    const row = rows[clientId];
    if (!row) return;
    const original = buildInitialRow(row.client);

    setSaving(s => ({ ...s, [clientId]: true }));
    try {
      for (const v of VACCINE_FIELDS) {
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
      if (!silent) toast.success(`${row.client.name} atualizado`);
    } catch (e) {
      console.error(e);
      toast.error(`Erro ao salvar ${row.client.name}`);
    } finally {
      setSaving(s => ({ ...s, [clientId]: false }));
    }
  }, [dirty, rows, addVaccineRecord, addFleaRecord]);

  const saveAll = async () => {
    setSavingAll(true);
    const ids = Object.keys(dirty);
    for (const id of ids) {
      try { await saveRow(id, true); } catch (e) { console.error(e); }
    }
    setSavingAll(false);
    if (ids.length > 0) toast.success(`${ids.length} registro(s) salvo(s)`);
  };

  // Keyboard navigation: Enter / Arrow keys move between cells
  const handleCellKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    let target: HTMLElement | null = null;
    const move = (dRow: number, dCol: number) => {
      const newRow = rowIdx + dRow;
      const newCol = colIdx + dCol;
      target = containerRef.current?.querySelector<HTMLElement>(
        `[data-cell="${newRow}-${newCol}"]`
      ) || null;
    };
    if (e.key === 'Enter' || (e.key === 'ArrowDown' && (e.target as HTMLElement).tagName === 'INPUT')) {
      e.preventDefault();
      move(1, 0);
    } else if (e.key === 'ArrowUp' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      move(-1, 0);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // default tab goes right
    }
    if (target) {
      target.focus();
      if (target instanceof HTMLInputElement) target.select();
    }
  };

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-3', fullscreen ? 'h-full' : '')}>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 text-xs text-muted-foreground">
        ✏️ Edite direto na tabela. <strong>Tab</strong>/<strong>Enter</strong>/<strong>↑↓</strong> para navegar. As alterações são salvas automaticamente ao sair do campo. Cores: 🟥 vencido · 🟨 vencendo · 🟩 em dia.
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
        {onToggleFullscreen && (
          <Button onClick={onToggleFullscreen} variant="outline" size="sm" className="h-10 gap-1">
            {fullscreen ? <><Minimize2 size={14} /> Sair</> : <><Maximize2 size={14} /> Tela cheia</>}
          </Button>
        )}
      </div>

      <div className={cn(
        'border border-border rounded-xl overflow-auto bg-card',
        fullscreen ? 'flex-1 min-h-0' : 'max-h-[70vh]'
      )}>
        <table className="w-full text-xs border-collapse">
          <thead className="bg-muted sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="text-left p-2 font-semibold sticky left-0 bg-muted z-30 min-w-[180px] border-r border-border">Pet / Tutor</th>
              {VACCINE_FIELDS.map(v => (
                <th key={v} className="text-center p-2 font-semibold min-w-[140px] border-r border-border/50">
                  💉 {VACCINE_TYPE_LABELS[v]}
                </th>
              ))}
              <th className="text-center p-2 font-semibold min-w-[140px] border-r border-border/50">🐛 Antipulgas</th>
              <th className="text-center p-2 font-semibold min-w-[120px] border-r border-border/50">Marca</th>
              <th className="text-center p-2 font-semibold min-w-[90px] border-r border-border/50">Duração</th>
              <th className="text-center p-2 font-semibold min-w-[100px] border-r border-border/50">Tipo</th>
              <th className="text-center p-2 font-semibold sticky right-0 bg-muted z-30 min-w-[70px] border-l border-border">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, rowIdx) => {
              const row = rows[c.id];
              if (!row) return null;
              const isDirty = !!dirty[c.id]?.size;
              const isSaving = saving[c.id];
              return (
                <tr
                  key={c.id}
                  className={cn(
                    'border-b border-border/40 transition-colors',
                    rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                    isDirty && 'bg-primary/10',
                  )}
                >
                  <td className={cn(
                    'p-2 sticky left-0 z-10 border-r border-border',
                    isDirty ? 'bg-primary/10' : (rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/40')
                  )}>
                    <div className="flex items-center gap-2">
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-xs leading-tight">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.tutorName}</p>
                        {c.breed && <p className="text-[9px] text-muted-foreground/70 truncate italic">{c.breed}</p>}
                      </div>
                    </div>
                  </td>
                  {VACCINE_FIELDS.map((v, ci) => (
                    <td key={v} className="p-1 border-r border-border/30">
                      <Input
                        type="date"
                        value={row[v]}
                        onChange={e => setField(c.id, v, e.target.value)}
                        onBlur={() => dirty[c.id]?.has(v) && saveRow(c.id, true)}
                        onKeyDown={e => handleCellKeyDown(e, rowIdx, ci)}
                        data-cell={`${rowIdx}-${ci}`}
                        className={cn('h-9 text-xs px-2 font-mono', dateCellClass(row[v], false))}
                      />
                    </td>
                  ))}
                  <td className="p-1 border-r border-border/30">
                    <Input
                      type="date"
                      value={row.flea}
                      onChange={e => setField(c.id, 'flea', e.target.value)}
                      onBlur={() => dirty[c.id]?.has('flea') && saveRow(c.id, true)}
                      onKeyDown={e => handleCellKeyDown(e, rowIdx, 4)}
                      data-cell={`${rowIdx}-4`}
                      className={cn('h-9 text-xs px-2 font-mono', dateCellClass(row.flea, true, row.fleaDuration))}
                    />
                  </td>
                  <td className="p-1 border-r border-border/30">
                    <Select value={row.fleaBrand} onValueChange={v => { setField(c.id, 'fleaBrand', v); setTimeout(() => saveRow(c.id, true), 50); }}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANTIPULGAS_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1 border-r border-border/30">
                    <Select value={String(row.fleaDuration)} onValueChange={v => { setField(c.id, 'fleaDuration', Number(v)); setTimeout(() => saveRow(c.id, true), 50); }}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
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
                  <td className="p-1 border-r border-border/30">
                    <Select value={row.fleaType} onValueChange={v => { setField(c.id, 'fleaType', v as FleaType); setTimeout(() => saveRow(c.id, true), 50); }}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixo">Fixo</SelectItem>
                        <SelectItem value="nao_fixo">Não fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={cn(
                    'p-2 sticky right-0 z-10 text-center border-l border-border',
                    isDirty ? 'bg-primary/10' : (rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/40')
                  )}>
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin text-primary mx-auto" />
                    ) : isDirty ? (
                      <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-primary text-primary">●</Badge>
                    ) : (
                      <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                    )}
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

export const HealthSpreadsheet: React.FC = () => {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <SheetContent fullscreen={false} onToggleFullscreen={() => setFullscreen(true)} />
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="max-w-none w-screen h-screen p-3 sm:p-4 rounded-none border-0 flex flex-col gap-0 [&>button]:hidden"
        >
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-base font-semibold">📋 Planilha de Saúde — Tela cheia</h2>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(false)} className="h-8 w-8">
              <X size={18} />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <SheetContent fullscreen onToggleFullscreen={() => setFullscreen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HealthSpreadsheet;
