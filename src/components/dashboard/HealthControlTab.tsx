import React, { useMemo, useState } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, VaccineType, VACCINE_TYPE_LABELS, getVaccineExpiryDate, getFleaExpiryDate, isExpiringSoon, isExpired, formatDate, ANTIPULGAS_BRANDS } from '@/types/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Syringe, Bug, MessageCircle, Search, CheckCircle2, AlertTriangle, XCircle, Filter, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { toast } from 'sonner';
import FecesCollectionTab from './FecesCollectionTab';

type HealthCategory = 'vaccines' | 'flea' | 'feces';
type HealthStatus = 'ok' | 'expiring' | 'expired' | 'none';

interface VaccineStatus {
  type: string;
  label: string;
  status: HealthStatus;
  expiryDate?: Date;
  lastDate?: string;
}

interface ClientHealthInfo {
  client: Client;
  vaccines: VaccineStatus[];
  flea: VaccineStatus;
  worstStatus: HealthStatus;
}

const getStatusPriority = (s: HealthStatus) => s === 'expired' ? 0 : s === 'expiring' ? 1 : s === 'none' ? 2 : 3;

const StatusBadge: React.FC<{ status: HealthStatus; expiryDate?: Date; lastDate?: string }> = ({ status, expiryDate, lastDate }) => {
  const dateText = lastDate ? format(new Date(lastDate), "dd/MM/yyyy", { locale: ptBR }) : (expiryDate ? formatDate(expiryDate) : '');
  
  if (status === 'none') {
    return <Badge variant="outline" className="text-xs text-muted-foreground border-muted cursor-pointer hover:opacity-80">Sem registro</Badge>;
  }
  if (status === 'expired') {
    return (
      <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5 cursor-pointer hover:opacity-80">
        <XCircle size={12} className="mr-1" />
        Vencida {dateText}
      </Badge>
    );
  }
  if (status === 'expiring') {
    return (
      <Badge variant="outline" className="text-xs text-[hsl(var(--status-warning))] border-[hsl(var(--status-warning)/0.3)] bg-[hsl(var(--status-warning-bg))] cursor-pointer hover:opacity-80">
        <AlertTriangle size={12} className="mr-1" />
        Vencendo {dateText}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30 cursor-pointer hover:opacity-80">
      <CheckCircle2 size={12} className="mr-1" />
      Em dia {dateText}
    </Badge>
  );
};

const buildWhatsAppMessage = (client: Client, info: ClientHealthInfo): string => {
  const lines: string[] = [];
  lines.push(`Olá, ${client.tutorName}! 🐾✨`);
  lines.push('');
  lines.push(`Passando para informar sobre a saúde do(a) *${client.name}*:`);
  lines.push('');

  info.vaccines.forEach(v => {
    if (v.status === 'expired') {
      lines.push(`❌ A vacina *${v.label}* está *vencida* desde ${v.expiryDate ? formatDate(v.expiryDate) : ''}. É importante atualizar o quanto antes! 💉`);
    } else if (v.status === 'expiring') {
      lines.push(`⚠️ A vacina *${v.label}* está *para vencer* em ${v.expiryDate ? formatDate(v.expiryDate) : ''}. Agende a renovação! 📅`);
    } else if (v.status === 'ok') {
      lines.push(`✅ A vacina *${v.label}* está *em dia* até ${v.expiryDate ? formatDate(v.expiryDate) : ''}.`);
    } else {
      lines.push(`📋 A vacina *${v.label}* ainda *não possui registro*. Que tal agendar?`);
    }
  });

  lines.push('');

  if (info.flea.status === 'expired') {
    lines.push(`❌ O *antipulgas* está *vencido* desde ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}. Vamos renovar? 🐛`);
  } else if (info.flea.status === 'expiring') {
    lines.push(`⚠️ O *antipulgas* está *para vencer* em ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}. Fique atento(a)! 🐛`);
  } else if (info.flea.status === 'ok') {
    lines.push(`✅ O *antipulgas* está *em dia* até ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}.`);
  } else {
    lines.push(`📋 O *antipulgas* ainda *não possui registro*. Que tal agendar?`);
  }

  lines.push('');
  lines.push('Ficamos à disposição para agendar! 🏥💕');
  lines.push('');
  lines.push('Atenciosamente, equipe *Cantinho do AuAu* 🐶');

  return lines.join('\n');
};

const openWhatsApp = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const HealthControlTab: React.FC = () => {
  const { clients, addVaccineRecord, addFleaRecord } = useClients();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring' | 'ok'>('all');
  const [category, setCategory] = useState<HealthCategory>('vaccines');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const clientHealthData = useMemo((): ClientHealthInfo[] => {
    return clients.map(client => {
      const vaccineKeys: VaccineType[] = ['gripe', 'v10', 'raiva', 'giardia'];
      const vaccines: VaccineStatus[] = vaccineKeys.map(key => {
        const lastDate = client.vaccines[key];
        if (!lastDate) {
          return { type: key, label: VACCINE_TYPE_LABELS[key], status: 'none' as HealthStatus };
        }
        const expiry = getVaccineExpiryDate(lastDate);
        let status: HealthStatus = 'ok';
        if (isExpired(expiry)) status = 'expired';
        else if (isExpiringSoon(expiry, 30)) status = 'expiring';
        return { type: key, label: VACCINE_TYPE_LABELS[key], status, expiryDate: expiry, lastDate };
      });

      let flea: VaccineStatus = { type: 'antipulgas', label: 'Antipulgas', status: 'none' };
      if (client.fleaHistory && client.fleaHistory.length > 0) {
        const lastFlea = client.fleaHistory[0];
        const expiry = getFleaExpiryDate(lastFlea.date, lastFlea.durationMonths);
        let status: HealthStatus = 'ok';
        if (isExpired(expiry)) status = 'expired';
        else if (isExpiringSoon(expiry, 15)) status = 'expiring';
        flea = { type: 'antipulgas', label: `Antipulgas (${lastFlea.brand})`, status, expiryDate: expiry, lastDate: lastFlea.date };
      } else if (client.vaccines.antipulgas) {
        const expiry = getFleaExpiryDate(client.vaccines.antipulgas, 1);
        let status: HealthStatus = 'ok';
        if (isExpired(expiry)) status = 'expired';
        else if (isExpiringSoon(expiry, 15)) status = 'expiring';
        flea = { type: 'antipulgas', label: 'Antipulgas', status, expiryDate: expiry, lastDate: client.vaccines.antipulgas };
      }

      const allStatuses = [...vaccines.map(v => v.status), flea.status];
      const worstStatus: HealthStatus = allStatuses.includes('expired') ? 'expired' : allStatuses.includes('expiring') ? 'expiring' : 'ok';

      return { client, vaccines, flea, worstStatus };
    });
  }, [clients]);

  // Compute separate stats for vaccines and flea
  const vaccineStats = useMemo(() => {
    let expired = 0, expiring = 0, ok = 0;
    clientHealthData.forEach(d => {
      const worst = d.vaccines.reduce<HealthStatus>((acc, v) => {
        if (v.status === 'expired') return 'expired';
        if (v.status === 'expiring' && acc !== 'expired') return 'expiring';
        if (v.status === 'ok' && acc === 'none') return 'ok';
        return acc;
      }, 'none');
      if (worst === 'expired') expired++;
      else if (worst === 'expiring') expiring++;
      else if (worst === 'ok') ok++;
    });
    return { expired, expiring, ok };
  }, [clientHealthData]);

  const fleaStats = useMemo(() => {
    let expired = 0, expiring = 0, ok = 0;
    clientHealthData.forEach(d => {
      if (d.flea.status === 'expired') expired++;
      else if (d.flea.status === 'expiring') expiring++;
      else if (d.flea.status === 'ok') ok++;
    });
    return { expired, expiring, ok };
  }, [clientHealthData]);

  const stats = category === 'vaccines' ? vaccineStats : fleaStats;

  const filtered = useMemo(() => {
    let data = clientHealthData;

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(d => d.client.name.toLowerCase().includes(s) || d.client.tutorName.toLowerCase().includes(s));
    }

    if (category === 'vaccines') {
      if (filter === 'expired') data = data.filter(d => d.vaccines.some(v => v.status === 'expired'));
      else if (filter === 'expiring') data = data.filter(d => d.vaccines.some(v => v.status === 'expiring'));
      else if (filter === 'ok') data = data.filter(d => d.vaccines.every(v => v.status === 'ok' || v.status === 'none') && d.vaccines.some(v => v.status === 'ok'));
    } else {
      if (filter === 'expired') data = data.filter(d => d.flea.status === 'expired');
      else if (filter === 'expiring') data = data.filter(d => d.flea.status === 'expiring');
      else if (filter === 'ok') data = data.filter(d => d.flea.status === 'ok');
    }

    data.sort((a, b) => {
      const aStatus = category === 'vaccines'
        ? (a.vaccines.some(v => v.status === 'expired') ? 'expired' : a.vaccines.some(v => v.status === 'expiring') ? 'expiring' : 'ok')
        : a.flea.status;
      const bStatus = category === 'vaccines'
        ? (b.vaccines.some(v => v.status === 'expired') ? 'expired' : b.vaccines.some(v => v.status === 'expiring') ? 'expiring' : 'ok')
        : b.flea.status;
      return getStatusPriority(aStatus as HealthStatus) - getStatusPriority(bStatus as HealthStatus);
    });
    return data;
  }, [clientHealthData, search, filter, category]);

  const hasIssues = (info: ClientHealthInfo) => {
    if (category === 'vaccines') return info.vaccines.some(v => v.status === 'expired' || v.status === 'expiring');
    return info.flea.status === 'expired' || info.flea.status === 'expiring';
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Category Toggle */}
      <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
        <button
          onClick={() => { setCategory('vaccines'); setFilter('all'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
            category === 'vaccines'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Syringe size={15} />
          Vacinas
        </button>
        <button
          onClick={() => { setCategory('flea'); setFilter('all'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
            category === 'flea'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Bug size={15} />
          Antipulgas
        </button>
        <button
          onClick={() => { setCategory('feces'); setFilter('all'); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
            category === 'feces'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FlaskConical size={15} />
          Coleta
        </button>
      </div>

      {category === 'feces' ? (
        <FecesCollectionTab />
      ) : (
      <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-2.5 sm:p-3 text-center cursor-pointer hover:bg-destructive/10 transition-colors"
          onClick={() => setFilter(f => f === 'expired' ? 'all' : 'expired')}>
          <XCircle size={18} className="text-destructive mx-auto mb-0.5 sm:mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-destructive">{stats.expired}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Vencidas</p>
        </div>
        <div className="bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning)/0.2)] rounded-xl p-2.5 sm:p-3 text-center cursor-pointer hover:opacity-80 transition-colors"
          onClick={() => setFilter(f => f === 'expiring' ? 'all' : 'expiring')}>
          <AlertTriangle size={18} className="text-[hsl(var(--status-warning))] mx-auto mb-0.5 sm:mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-[hsl(var(--status-warning))]">{stats.expiring}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Vencendo</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 sm:p-3 text-center cursor-pointer hover:opacity-80 transition-colors"
          onClick={() => setFilter(f => f === 'ok' ? 'all' : 'ok')}>
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-0.5 sm:mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.ok}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Em dia</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pet ou tutor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        {filter !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setFilter('all')} className="shrink-0 h-10">
            <Filter size={14} className="mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto pr-0.5 sm:pr-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado.</p>
        )}
        {filtered.map(info => (
          <div key={info.client.id} className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 shadow-soft">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base text-foreground truncate">{info.client.name}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{info.client.tutorName} • {info.client.breed || 'SRD'}</p>
              </div>
              {hasIssues(info) && info.client.tutorPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30 gap-1 text-xs shrink-0 h-8 px-2.5"
                  onClick={() => openWhatsApp(info.client.tutorPhone, buildWhatsAppMessage(info.client, info))}
                >
                  <MessageCircle size={13} />
                  <span className="hidden sm:inline">Avisar</span>
                </Button>
              )}
            </div>

            {/* Category-specific content */}
            {category === 'vaccines' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {info.vaccines.map(v => {
                  const popKey = `${info.client.id}-${v.type}`;
                  return (
                    <div key={v.type} className="space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <Syringe size={10} />
                        {v.label}
                      </div>
                      <Popover open={editingKey === popKey} onOpenChange={(open) => setEditingKey(open ? popKey : null)}>
                        <PopoverTrigger asChild>
                          <button className="text-left">
                            <StatusBadge status={v.status} expiryDate={v.expiryDate} lastDate={v.lastDate} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={v.lastDate ? new Date(v.lastDate) : undefined}
                            onSelect={(d) => {
                              if (d) {
                                addVaccineRecord(info.client.id, v.type as VaccineType, d.toISOString());
                                toast.success(`${v.label} atualizada: ${format(d, "dd/MM/yyyy", { locale: ptBR })}`);
                                setEditingKey(null);
                              }
                            }}
                            initialFocus
                            className="pointer-events-auto"
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-0.5 sm:space-y-1">
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <Bug size={10} />
                  {info.flea.label}
                </div>
                <Popover open={editingKey === `${info.client.id}-flea`} onOpenChange={(open) => setEditingKey(open ? `${info.client.id}-flea` : null)}>
                  <PopoverTrigger asChild>
                    <button className="text-left">
                      <StatusBadge status={info.flea.status} expiryDate={info.flea.expiryDate} lastDate={info.flea.lastDate} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={info.flea.lastDate ? new Date(info.flea.lastDate) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          const lastFlea = info.client.fleaHistory?.[0];
                          addFleaRecord(info.client.id, d.toISOString(), lastFlea?.brand || 'Antipulgas', (lastFlea?.durationMonths || 1) as 1 | 2 | 3 | 6);
                          toast.success(`Antipulgas atualizado: ${format(d, "dd/MM/yyyy", { locale: ptBR })}`);
                          setEditingKey(null);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {info.flea.lastDate && (
                  <p className="text-[10px] text-muted-foreground">Última aplicação: {formatDate(new Date(info.flea.lastDate))}</p>
                )}
              </div>
            )}

            {hasIssues(info) && !info.client.tutorPhone && (
              <p className="text-[11px] text-muted-foreground italic">⚠️ Sem telefone cadastrado.</p>
            )}
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
};
