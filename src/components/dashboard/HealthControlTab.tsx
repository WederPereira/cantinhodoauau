import React, { useMemo, useState } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, VaccineType, VACCINE_TYPE_LABELS, getVaccineExpiryDate, getFleaExpiryDate, isExpiringSoon, isExpired, formatDate } from '@/types/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Syringe, Bug, MessageCircle, Search, CheckCircle2, AlertTriangle, XCircle, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const StatusBadge: React.FC<{ status: HealthStatus; expiryDate?: Date }> = ({ status, expiryDate }) => {
  if (status === 'none') {
    return <Badge variant="outline" className="text-xs text-muted-foreground border-muted">Sem registro</Badge>;
  }
  if (status === 'expired') {
    return (
      <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5">
        <XCircle size={12} className="mr-1" />
        Vencida {expiryDate && formatDate(expiryDate)}
      </Badge>
    );
  }
  if (status === 'expiring') {
    return (
      <Badge variant="outline" className="text-xs text-[hsl(var(--status-warning))] border-[hsl(var(--status-warning)/0.3)] bg-[hsl(var(--status-warning-bg))]">
        <AlertTriangle size={12} className="mr-1" />
        Vencendo {expiryDate && formatDate(expiryDate)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30">
      <CheckCircle2 size={12} className="mr-1" />
      Em dia {expiryDate && formatDate(expiryDate)}
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
    }
  });

  if (info.flea.status === 'expired') {
    lines.push(`❌ O *antipulgas* está *vencido* desde ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}. Vamos renovar? 🐛`);
  } else if (info.flea.status === 'expiring') {
    lines.push(`⚠️ O *antipulgas* está *para vencer* em ${info.flea.expiryDate ? formatDate(info.flea.expiryDate) : ''}. Fique atento(a)! 🐛`);
  }

  lines.push('');
  lines.push('Ficamos à disposição para agendar! 🏥💕');
  lines.push('');
  lines.push('Atenciosamente, sua Pet Shop 🐶🐱');

  return lines.join('\n');
};

const openWhatsApp = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const HealthControlTab: React.FC = () => {
  const { clients } = useClients();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring' | 'ok'>('all');

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

  const filtered = useMemo(() => {
    let data = clientHealthData;

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(d => d.client.name.toLowerCase().includes(s) || d.client.tutorName.toLowerCase().includes(s));
    }

    if (filter === 'expired') data = data.filter(d => d.worstStatus === 'expired');
    else if (filter === 'expiring') data = data.filter(d => d.worstStatus === 'expiring');
    else if (filter === 'ok') data = data.filter(d => d.worstStatus === 'ok' && d.vaccines.some(v => v.status !== 'none'));

    data.sort((a, b) => getStatusPriority(a.worstStatus) - getStatusPriority(b.worstStatus));
    return data;
  }, [clientHealthData, search, filter]);

  const stats = useMemo(() => {
    const expired = clientHealthData.filter(d => d.worstStatus === 'expired').length;
    const expiring = clientHealthData.filter(d => d.worstStatus === 'expiring').length;
    const ok = clientHealthData.filter(d => d.worstStatus === 'ok' && d.vaccines.some(v => v.status !== 'none')).length;
    return { expired, expiring, ok };
  }, [clientHealthData]);

  const hasIssues = (info: ClientHealthInfo) =>
    info.vaccines.some(v => v.status === 'expired' || v.status === 'expiring') ||
    info.flea.status === 'expired' || info.flea.status === 'expiring';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-center cursor-pointer hover:bg-destructive/10 transition-colors"
          onClick={() => setFilter(f => f === 'expired' ? 'all' : 'expired')}>
          <XCircle size={20} className="text-destructive mx-auto mb-1" />
          <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
          <p className="text-xs text-muted-foreground">Vencidas</p>
        </div>
        <div className="bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning)/0.2)] rounded-xl p-3 text-center cursor-pointer hover:opacity-80 transition-colors"
          onClick={() => setFilter(f => f === 'expiring' ? 'all' : 'expiring')}>
          <AlertTriangle size={20} className="text-[hsl(var(--status-warning))] mx-auto mb-1" />
          <p className="text-2xl font-bold text-[hsl(var(--status-warning))]">{stats.expiring}</p>
          <p className="text-xs text-muted-foreground">Vencendo</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center cursor-pointer hover:opacity-80 transition-colors"
          onClick={() => setFilter(f => f === 'ok' ? 'all' : 'ok')}>
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.ok}</p>
          <p className="text-xs text-muted-foreground">Em dia</p>
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
            className="pl-9"
          />
        </div>
        {filter !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setFilter('all')} className="shrink-0">
            <Filter size={14} className="mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado.</p>
        )}
        {filtered.map(info => (
          <div key={info.client.id} className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-soft">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{info.client.name}</p>
                <p className="text-xs text-muted-foreground">{info.client.tutorName} • {info.client.breed || 'SRD'}</p>
              </div>
              {hasIssues(info) && info.client.tutorPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30 gap-1.5"
                  onClick={() => openWhatsApp(info.client.tutorPhone, buildWhatsAppMessage(info.client, info))}
                >
                  <MessageCircle size={14} />
                  Avisar Tutor
                </Button>
              )}
            </div>

            {/* Vaccines grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {info.vaccines.map(v => (
                <div key={v.type} className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Syringe size={10} />
                    {v.label}
                  </div>
                  <StatusBadge status={v.status} expiryDate={v.expiryDate} />
                </div>
              ))}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bug size={10} />
                  {info.flea.label}
                </div>
                <StatusBadge status={info.flea.status} expiryDate={info.flea.expiryDate} />
              </div>
            </div>

            {/* WhatsApp for mobile when no phone */}
            {hasIssues(info) && !info.client.tutorPhone && (
              <p className="text-xs text-muted-foreground italic">⚠️ Sem telefone cadastrado para enviar aviso.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
