import React, { useMemo, useState } from 'react';
import { useClients } from '@/context/ClientContext';
import { useWalkInBaths } from '@/context/WalkInBathContext';
import { formatCurrency } from '@/types/client';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Bath } from 'lucide-react';
import { Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ReportsPage: React.FC = () => {
  const { clients } = useClients();
  const { baths } = useWalkInBaths();
  const [periodMonths, setPeriodMonths] = useState('6');

  const numMonths = parseInt(periodMonths);

  // Walk-in bath revenue over time
  const bathRevenueData = useMemo(() => {
    const months: { month: string; receita: number; quantidade: number }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, 'MMM/yy', { locale: ptBR });

      let receita = 0;
      let quantidade = 0;
      baths.forEach(b => {
        const bDate = new Date(b.date);
        if (isWithinInterval(bDate, { start, end })) {
          receita += b.price;
          quantidade++;
        }
      });
      months.push({ month: label, receita, quantidade });
    }
    return months;
  }, [baths, numMonths]);

  const totalBathRevenue = useMemo(() => baths.reduce((s, b) => s + b.price, 0), [baths]);

  // New clients per month
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
        {/* Header */}
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
              <Calendar size={14} className="mr-1.5 text-muted-foreground" />
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-primary" />
              <p className="text-xs text-muted-foreground">Total Clientes</p>
            </div>
            <p className="text-xl font-bold text-foreground">{clients.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-accent" />
              <p className="text-xs text-muted-foreground">Receita Banhos</p>
            </div>
            <p className="text-xl font-bold text-accent">{formatCurrency(totalBathRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{baths.length} banhos registrados</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-2">
              <Bath size={16} className="text-primary" />
              <p className="text-xs text-muted-foreground">Média por Banho</p>
            </div>
            <p className="text-xl font-bold text-foreground">{baths.length > 0 ? formatCurrency(totalBathRevenue / baths.length) : 'R$ 0'}</p>
          </div>
        </div>

        {/* Bath Revenue Chart */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            Receita Banhos por Mês
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={bathRevenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24, 95%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(24, 95%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                contentStyle={CustomTooltipStyle}
                formatter={(value: number, name: string) => [
                  name === 'receita' ? formatCurrency(value) : value,
                  name === 'receita' ? 'Receita' : 'Quantidade'
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => value === 'receita' ? 'Receita' : 'Qtd. Banhos'} />
              <Area type="monotone" dataKey="receita" stroke="hsl(24, 95%, 60%)" strokeWidth={2} fill="url(#revenueGradient)" />
              <Line type="monotone" dataKey="quantidade" stroke="hsl(174, 72%, 40%)" strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* New Clients Chart */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Novos Clientes por Mês
          </h3>
          <ResponsiveContainer width="100%" height={200}>
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
              <Area type="monotone" dataKey="novos" stroke="hsl(174, 72%, 40%)" strokeWidth={2} fill="url(#clientsGradient)" name="Novos Clientes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
