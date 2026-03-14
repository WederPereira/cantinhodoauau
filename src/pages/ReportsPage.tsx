import React, { useMemo, useState } from 'react';
import { useClients } from '@/context/ClientContext';
import { BarChart3, TrendingUp, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Tooltip, Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ReportsPage: React.FC = () => {
  const { clients } = useClients();
  const [periodMonths, setPeriodMonths] = useState('6');
  const numMonths = parseInt(periodMonths);

  const newClientsData = useMemo(() => {
    const months: { month: string; novos: number }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, 'MMM/yy', { locale: ptBR });
      const novos = clients.filter(c => {
        const created = new Date(c.createdAt);
        return isWithinInterval(created, { start, end });
      }).length;
      months.push({ month: label, novos });
    }
    return months;
  }, [clients, numMonths]);

  const CustomTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="text-primary" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
              <p className="text-sm text-muted-foreground">Análise e métricas do negócio</p>
            </div>
          </div>
          <Select value={periodMonths} onValueChange={setPeriodMonths}>
            <SelectTrigger className="w-[140px] h-9">
              <CalendarIcon size={14} className="mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-primary" />
              <p className="text-xs text-muted-foreground">Total Clientes</p>
            </div>
            <p className="text-xl font-bold text-foreground">{clients.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-accent" />
              <p className="text-xs text-muted-foreground">Novos (último mês)</p>
            </div>
            <p className="text-xl font-bold text-foreground">{newClientsData.length > 0 ? newClientsData[newClientsData.length - 1].novos : 0}</p>
          </div>
        </div>

        {/* New Clients Chart */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Novos Clientes por Mês
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={newClientsData}>
              <defs>
                <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={CustomTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="novos" stroke="hsl(174, 72%, 40%)" strokeWidth={2} fill="url(#clientsGradient)" name="Novos Clientes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
