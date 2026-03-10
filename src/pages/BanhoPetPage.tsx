import React, { useState, useMemo } from 'react';
import { useWalkInBaths } from '@/context/WalkInBathContext';
import { useClients } from '@/context/ClientContext';
import { BathStatus } from '@/types/client';
import { Bath, Plus, Search, X, Filter, CalendarDays, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import BathStatsCards from '@/components/banho/BathStatsCards';
import AddBathDialog from '@/components/banho/AddBathDialog';
import BathTable from '@/components/banho/BathTable';
import BathCalendar from '@/components/banho/BathCalendar';
import BathPriceTable from '@/components/banho/BathPriceTable';

const STATUSES: BathStatus[] = ['Agendado', 'Em andamento', 'Concluído', 'Entregue'];

const BanhoPetPage: React.FC = () => {
  const { baths, addBath, updateBathStatus, deleteBath, getTodayBaths, getTotalRevenue, getByStatus } = useWalkInBaths();
  const { clients } = useClients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<'avulso' | 'cliente'>('avulso');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const todayBaths = getTodayBaths();
  const todayRevenue = todayBaths.reduce((s, b) => s + b.price, 0);
  const inProgress = getByStatus('Em andamento').length;
  const scheduled = getByStatus('Agendado').length;

  const avulsoBaths = useMemo(() => baths.filter(b => !b.clientId), [baths]);
  const clientBaths = useMemo(() => baths.filter(b => !!b.clientId), [baths]);

  const filterBaths = (list: typeof baths) => {
    let filtered = list;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.petName.toLowerCase().includes(q) ||
        b.tutorName.toLowerCase().includes(q) ||
        b.serviceType.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    return filtered;
  };

  const handleAdd = (data: any) => {
    addBath(data);
    toast.success(`Banho de ${data.petName} registrado!`);
  };

  const handleDelete = (id: string) => {
    deleteBath(id);
    toast.success('Banho removido');
  };

  const handleStatusChange = (id: string, status: BathStatus) => {
    updateBathStatus(id, status);
    toast.success(`Status atualizado para ${status}`);
  };

  const openDialog = (tab: 'avulso' | 'cliente') => {
    setDialogTab(tab);
    setDialogOpen(true);
  };

  return (
    <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bath className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Banho & Tosa</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Sistema completo de banho pet shop</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <BathPriceTable />
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 sm:p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-xs sm:text-sm"
              onClick={() => setViewMode('list')}
            >
              <List size={14} />
              <span className="hidden xs:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-xs sm:text-sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays size={14} />
              <span className="hidden xs:inline">Agenda</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <BathStatsCards
        todayCount={todayBaths.length}
        todayRevenue={todayRevenue}
        inProgress={inProgress}
        scheduled={scheduled}
        totalBaths={baths.length}
        totalRevenue={getTotalRevenue()}
      />

      {/* Calendar View */}
      {viewMode === 'calendar' ? (
        <BathCalendar
          baths={baths}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 shadow-soft flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por tutor, pet ou serviço..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[150px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="avulso" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="avulso" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Avulsos ({avulsoBaths.length})
                </TabsTrigger>
                <TabsTrigger value="clientes" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Clientes ({clientBaths.length})
                </TabsTrigger>
                <TabsTrigger value="hoje" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Hoje ({todayBaths.length})
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9" onClick={() => openDialog('cliente')}>
                  <Plus size={14} />
                  Cliente
                </Button>
                <Button size="sm" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9" onClick={() => openDialog('avulso')}>
                  <Plus size={14} />
                  Avulso
                </Button>
              </div>
            </div>

            <TabsContent value="avulso">
              <BathTable
                baths={filterBaths(avulsoBaths)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                emptyMessage={searchQuery ? 'Nenhum banho encontrado' : 'Nenhum banho avulso registrado'}
              />
            </TabsContent>

            <TabsContent value="clientes">
              <BathTable
                baths={filterBaths(clientBaths)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                emptyMessage={searchQuery ? 'Nenhum banho encontrado' : 'Nenhum banho de cliente registrado'}
              />
            </TabsContent>

            <TabsContent value="hoje">
              <BathTable
                baths={filterBaths(todayBaths)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                emptyMessage="Nenhum banho agendado para hoje"
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Add Bath Dialog */}
      <AddBathDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
        clients={clients}
        isClientTab={dialogTab === 'cliente'}
      />
    </div>
  );
};

export default BanhoPetPage;
