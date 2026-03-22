import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useClients } from '@/context/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { getHealthAlerts } from '@/types/client';
import {
  Users, Hotel, PawPrint, HeartPulse, AlertTriangle, Pill, Utensils,
  LogOut, Cake, Car, TrendingUp, Clock, ChevronRight, Dog, Timer, Check, Bug, Syringe,
  ChevronLeft, Copy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast, differenceInHours, differenceInYears, getMonth } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ptBR } from 'date-fns/locale';

interface DashboardOverviewProps {
  onTabChange: (tab: string) => void;
  onClientClick: (clientId: string) => void;
}

interface HotelStaySummary {
  id: string;
  dog_name: string;
  tutor_name: string;
  check_in: string;
  expected_checkout: string | null;
  active: boolean;
  days_staying: number;
  is_overdue: boolean;
}

interface MedPending {
  id: string;
  medication_name: string;
  scheduled_time: string;
  dog_name: string;
  administered: boolean;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onTabChange, onClientClick }) => {
  const { clients } = useClients();
  const [hotelStays, setHotelStays] = useState<HotelStaySummary[]>([]);
  const [daycareCount, setDaycareCount] = useState(0);
  const [pendingMeds, setPendingMeds] = useState<MedPending[]>([]);
  const [feedingAlerts, setFeedingAlerts] = useState(0);
  const [now, setNow] = useState(new Date());

  // Tick for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch hotel stays
  const fetchHotel = useCallback(async () => {
    const { data } = await supabase.from('hotel_stays').select('*').eq('active', true);
    if (data) {
      const stays: HotelStaySummary[] = data.map((s: any) => ({
        id: s.id,
        dog_name: s.dog_name,
        tutor_name: s.tutor_name,
        check_in: s.check_in,
        expected_checkout: s.expected_checkout,
        active: s.active,
        days_staying: Math.max(1, differenceInDays(new Date(), new Date(s.check_in)) + 1),
        is_overdue: s.expected_checkout ? isPast(new Date(s.expected_checkout)) : false,
      }));
      setHotelStays(stays);
    }
  }, []);

  // Fetch today's daycare
  const fetchDaycare = useCallback(async () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const { count } = await supabase
      .from('qr_entries')
      .select('*', { count: 'exact', head: true })
      .gte('data_hora', start.toISOString())
      .lte('data_hora', end.toISOString());
    setDaycareCount(count || 0);
  }, []);

  // Fetch pending meds
  const fetchMeds = useCallback(async () => {
    const { data: stays } = await supabase.from('hotel_stays').select('id, dog_name').eq('active', true);
    if (!stays || stays.length === 0) { setPendingMeds([]); return; }
    const stayMap = new Map(stays.map((s: any) => [s.id, s.dog_name]));
    const { data: meds } = await supabase
      .from('hotel_medications')
      .select('*')
      .in('hotel_stay_id', stays.map((s: any) => s.id))
      .eq('administered', false)
      .order('scheduled_time', { ascending: true });
    setPendingMeds((meds || []).map((m: any) => ({
      id: m.id,
      medication_name: m.medication_name,
      scheduled_time: m.scheduled_time,
      dog_name: stayMap.get(m.hotel_stay_id) || '',
      administered: m.administered,
    })));
  }, []);

  // Fetch feeding alerts count
  const fetchFeeding = useCallback(async () => {
    const { data: stays } = await supabase.from('hotel_stays').select('id, check_in').eq('active', true);
    if (!stays || stays.length === 0) { setFeedingAlerts(0); return; }
    const { data: meals } = await supabase.from('hotel_meals').select('*').in('hotel_stay_id', stays.map((s: any) => s.id));
    let count = 0;
    for (const stay of stays as any[]) {
      const stayMeals = (meals || []).filter((m: any) => m.hotel_stay_id === stay.id);
      const days = Math.max(1, differenceInDays(new Date(), new Date(stay.check_in)) + 1);
      const expected = days * 3;
      const eaten = stayMeals.filter((m: any) => m.ate).length;
      if (expected > 0 && eaten / expected < 0.5) count++;
    }
    setFeedingAlerts(count);
  }, []);

  useEffect(() => {
    fetchHotel();
    fetchDaycare();
    fetchMeds();
    fetchFeeding();
    const ch = supabase
      .channel('dashboard-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, () => { fetchHotel(); fetchMeds(); fetchFeeding(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_medications' }, fetchMeds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_meals' }, fetchFeeding)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_entries' }, fetchDaycare)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchHotel, fetchDaycare, fetchMeds, fetchFeeding]);

  const healthAlerts = useMemo(() => getHealthAlerts(clients), [clients]);
  const overdueStays = hotelStays.filter(s => s.is_overdue);

  // Taxi list from localStorage
  const taxiCount = useMemo(() => {
    try {
      const saved = localStorage.getItem('taxi-dog-list');
      return saved ? JSON.parse(saved).length : 0;
    } catch { return 0; }
  }, []);

  // Birthday month
  const [birthdayMonth, setBirthdayMonth] = useState(getMonth(new Date()));
  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const birthdayClients = useMemo(() => {
    return clients
      .filter(c => c.birthDate && getMonth(new Date(c.birthDate)) === birthdayMonth)
      .sort((a, b) => new Date(a.birthDate!).getDate() - new Date(b.birthDate!).getDate());
  }, [clients, birthdayMonth]);

  const birthdaysToday = useMemo(() => {
    const today = new Date();
    return clients.filter(c => {
      if (!c.birthDate) return false;
      const b = new Date(c.birthDate);
      return b.getDate() === today.getDate() && b.getMonth() === today.getMonth();
    });
  }, [clients]);

  const navigateBirthdayMonth = (dir: number) => {
    setBirthdayMonth(prev => {
      let m = prev + dir;
      if (m < 0) m = 11;
      if (m > 11) m = 0;
      return m;
    });
  };

  const handleCopyBirthdays = () => {
    if (birthdayClients.length === 0) return;
    const names = birthdayClients.map(c => {
      const b = new Date(c.birthDate!);
      const age = differenceInYears(new Date(), b);
      return `${c.name} - Dia ${b.getDate()} (${age > 0 ? `${age} ano${age > 1 ? 's' : ''}` : '<1 ano'})`;
    }).join('\n');
    navigator.clipboard.writeText(`🎂 Aniversariantes de ${MONTH_NAMES[birthdayMonth]}:\n${names}`);
    toast({ title: "Copiado!", description: `${birthdayClients.length} aniversariante(s)` });
  };

  // Incomplete profiles
  const incompleteProfiles = useMemo(() => {
    return clients.filter(c => {
      const fields = [c.tutorName, c.tutorPhone, c.tutorEmail, c.tutorCpf, c.tutorAddress, c.breed, c.petSize, c.weight, c.gender, c.castrated !== undefined, c.birthDate];
      const filled = fields.filter(Boolean).length;
      return filled / fields.length < 0.5;
    }).length;
  }, [clients]);

  const getCountdown = (time: string): { text: string; isOverdue: boolean } => {
    const [h, m] = time.split(':').map(Number);
    const medMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const diff = (medMinutes - nowMinutes) * 60 - now.getSeconds();
    if (diff <= 0) {
      const over = Math.abs(diff);
      const oh = Math.floor(over / 3600);
      const om = Math.floor((over % 3600) / 60);
      return { text: oh > 0 ? `+${oh}h${om.toString().padStart(2, '0')}m` : `+${om}min`, isOverdue: Math.abs(diff) > 7200 };
    }
    const rh = Math.floor(diff / 3600);
    const rm = Math.floor((diff % 3600) / 60);
    const rs = diff % 60;
    if (rh > 0) return { text: `${rh}h${rm.toString().padStart(2, '0')}m`, isOverdue: false };
    if (rm > 0) return { text: `${rm}m${rs.toString().padStart(2, '0')}s`, isOverdue: false };
    return { text: `${rs}s`, isOverdue: false };
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users size={20} />}
          label="Pets Cadastrados"
          value={clients.length}
          color="primary"
          onClick={() => {}}
          subtitle={incompleteProfiles > 0 ? `${incompleteProfiles} perfis incompletos` : undefined}
          subtitleColor="destructive"
        />
        <StatCard
          icon={<PawPrint size={20} />}
          label="Na Creche Hoje"
          value={daycareCount}
          color="primary"
          onClick={() => onTabChange('daycare')}
          subtitle="Toque para ver"
        />
        <StatCard
          icon={<Hotel size={20} />}
          label="Hospedados"
          value={hotelStays.length}
          color="accent"
          onClick={() => onTabChange('hotel')}
          badge={overdueStays.length > 0 ? `${overdueStays.length} atrasado(s)` : undefined}
          subtitle={hotelStays.length > 0 ? `${hotelStays.reduce((a, b) => a + b.days_staying, 0)} diárias` : 'Nenhum'}
        />
        <StatCard
          icon={<HeartPulse size={20} />}
          label="Alertas Saúde"
          value={healthAlerts.length}
          color={healthAlerts.length > 0 ? 'destructive' : 'primary'}
          onClick={() => onTabChange('health')}
          subtitle={healthAlerts.filter(a => a.isExpired).length > 0 ? `${healthAlerts.filter(a => a.isExpired).length} vencido(s)` : 'Tudo em dia'}
          subtitleColor={healthAlerts.filter(a => a.isExpired).length > 0 ? 'destructive' : 'ok'}
        />
      </div>

      {/* Quick Info Row */}
      <div className="grid grid-cols-2 gap-3">
        <QuickCard
          icon={<Car size={16} />}
          label="Táxi Hoje"
          value={`${taxiCount} dog(s)`}
          onClick={() => onTabChange('taxi')}
        />
        <QuickCard
          icon={<Cake size={16} />}
          label="Aniversário Hoje"
          value={birthdaysToday.length > 0 ? `${birthdaysToday.map(c => c.name).join(', ')} 🎉` : 'Nenhum'}
          onClick={() => {}}
          highlight={birthdaysToday.length > 0}
        />
      </div>

      {/* Medication Countdown - Interactive */}
      {pendingMeds.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 shadow-soft space-y-2">
          <button onClick={() => onTabChange('hotel')} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Pill size={16} className="text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Remédios Pendentes</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {pendingMeds.length}
              </Badge>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </button>
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
            {pendingMeds.slice(0, 5).map(med => {
              const countdown = getCountdown(med.scheduled_time);
              return (
                <div
                  key={med.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-xs transition-all",
                    countdown.isOverdue
                      ? "bg-destructive/10 border border-destructive/30"
                      : "bg-muted/40 border border-border/50"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Dog size={13} className={countdown.isOverdue ? "text-destructive shrink-0" : "text-primary shrink-0"} />
                    <span className="font-medium truncate">{med.dog_name}</span>
                    <span className="text-muted-foreground truncate">— {med.medication_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={cn(
                      "flex items-center gap-0.5 font-mono text-[11px] font-bold",
                      countdown.isOverdue ? "text-destructive" : "text-primary"
                    )}>
                      <Timer size={11} />
                      {countdown.text}
                    </div>
                    <span className="text-muted-foreground font-mono text-[10px]">{med.scheduled_time.slice(0, 5)}</span>
                  </div>
                </div>
              );
            })}
            {pendingMeds.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                +{pendingMeds.length - 5} remédio(s) a mais
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hotel Guests Summary */}
      {hotelStays.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 shadow-soft space-y-2">
          <button onClick={() => onTabChange('hotel')} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Hotel size={16} className="text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Hospedagem Ativa</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="text-[10px] px-1.5 py-0 bg-accent text-accent-foreground">
                {hotelStays.length} dog(s)
              </Badge>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </button>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {hotelStays.map(stay => (
              <div
                key={stay.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer hover:bg-muted/50",
                  stay.is_overdue
                    ? "bg-destructive/5 border border-destructive/20"
                    : "bg-muted/30 border border-border/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Dog size={13} className={stay.is_overdue ? "text-destructive shrink-0" : "text-accent shrink-0"} />
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{stay.dog_name}</span>
                    <span className="text-[10px] text-muted-foreground truncate block">{stay.tutor_name}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {stay.days_staying} dia{stay.days_staying !== 1 ? 's' : ''}
                  </span>
                  {stay.is_overdue ? (
                    <Badge variant="destructive" className="text-[8px] px-1 py-0">
                      <LogOut size={8} className="mr-0.5" /> Saída pendente
                    </Badge>
                  ) : stay.expected_checkout ? (
                    <span className="text-[9px] text-muted-foreground">
                      Saída: {format(new Date(stay.expected_checkout), 'dd/MM', { locale: ptBR })}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {feedingAlerts > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300/30 text-xs">
              <Utensils size={13} className="text-amber-600 shrink-0" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                {feedingAlerts} dog(s) comendo pouco
              </span>
              <AlertTriangle size={12} className="text-amber-500 ml-auto shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* Health Alerts Summary */}
      {healthAlerts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 shadow-soft space-y-2">
          <button onClick={() => onTabChange('health')} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive/10">
                <HeartPulse size={16} className="text-destructive" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Saúde — Ação Necessária</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {healthAlerts.length}
              </Badge>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </button>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {healthAlerts.slice(0, 4).map((alert, i) => (
              <div
                key={`${alert.clientId}-${i}`}
                onClick={() => onClientClick(alert.clientId)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all hover:bg-muted/50",
                  alert.isExpired
                    ? "bg-destructive/5 border border-destructive/20"
                    : "bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning)/0.2)]"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {alert.type === 'vaccine' ? (
                    <Syringe size={13} className={alert.isExpired ? "text-destructive shrink-0" : "text-[hsl(var(--status-warning))] shrink-0"} />
                  ) : (
                    <Bug size={13} className={alert.isExpired ? "text-destructive shrink-0" : "text-[hsl(var(--status-warning))] shrink-0"} />
                  )}
                  <span className="font-medium truncate">{alert.clientName}</span>
                  <span className="text-muted-foreground truncate">— {alert.itemName}</span>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[9px] px-1.5 py-0 shrink-0",
                  alert.isExpired ? "text-destructive border-destructive/30" : "text-[hsl(var(--status-warning))] border-[hsl(var(--status-warning)/0.3)]"
                )}>
                  {alert.isExpired ? 'Vencida' : 'Vencendo'}
                </Badge>
              </div>
            ))}
            {healthAlerts.length > 4 && (
              <button onClick={() => onTabChange('health')} className="w-full text-center text-[10px] text-primary font-medium pt-1 hover:underline">
                Ver todos os {healthAlerts.length} alertas →
              </button>
            )}
          </div>
        </div>
      )}

      {/* All Good state */}
      {hotelStays.length === 0 && healthAlerts.length === 0 && pendingMeds.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-[hsl(var(--status-ok)/0.1)] flex items-center justify-center">
            <Check size={24} className="text-[hsl(var(--status-ok))]" />
          </div>
          <p className="text-sm font-medium text-foreground">Tudo em ordem! ✨</p>
          <p className="text-xs text-muted-foreground">Nenhum alerta pendente no momento.</p>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  onClick: () => void;
  badge?: string;
  subtitle?: string;
  subtitleColor?: string;
}> = ({ icon, label, value, color, onClick, badge, subtitle, subtitleColor }) => {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    destructive: 'bg-destructive/10 text-destructive',
  };
  const iconClass = colorMap[color] || colorMap.primary;

  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3 shadow-soft text-left w-full transition-all duration-200 hover:shadow-medium hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden group"
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className={cn("p-1.5 rounded-lg", iconClass)}>
          {icon}
        </div>
        {badge && (
          <Badge variant="destructive" className="text-[8px] px-1.5 py-0">
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{label}</p>
      {subtitle && (
        <p className={cn(
          "text-[9px] mt-0.5",
          subtitleColor === 'destructive' ? 'text-destructive' : subtitleColor === 'ok' ? 'text-[hsl(var(--status-ok))]' : 'text-muted-foreground'
        )}>
          {subtitle}
        </p>
      )}
      <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

// Quick Card Component
const QuickCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  highlight?: boolean;
}> = ({ icon, label, value, onClick, highlight }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2.5 p-2.5 rounded-xl border text-left w-full transition-all duration-200 hover:shadow-soft active:scale-[0.98]",
      highlight
        ? "bg-accent/5 border-accent/30"
        : "bg-card border-border"
    )}
  >
    <div className={cn(
      "p-1.5 rounded-lg shrink-0",
      highlight ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
    )}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  </button>
);

export default DashboardOverview;
