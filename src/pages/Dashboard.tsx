import React, { lazy, Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, getHealthAlerts } from '@/types/client';
import { LayoutDashboard, HeartPulse, PawPrint, Hotel, Camera, Car, Loader2, Pill, Users, Bell, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const AddClientDialog = lazy(() => import('@/components/AddClientDialog').then((module) => ({ default: module.AddClientDialog })));
const ClientDetailSheet = lazy(() => import('@/components/ClientDetailSheet').then((module) => ({ default: module.ClientDetailSheet })));
const HealthAlerts = lazy(() => import('@/components/HealthAlerts').then((module) => ({ default: module.HealthAlerts })));
const BirthdaySection = lazy(() => import('@/components/dashboard/BirthdaySection').then((module) => ({ default: module.BirthdaySection })));
const HealthControlTab = lazy(() => import('@/components/dashboard/HealthControlTab').then((module) => ({ default: module.HealthControlTab })));
const DaycareTab = lazy(() => import('@/components/dashboard/DaycareTab'));
const TaxiTab = lazy(() => import('@/components/dashboard/TaxiTab'));
const HotelTab = lazy(() => import('@/components/dashboard/HotelTab'));
const HotelMedicationAlerts = lazy(() => import('@/components/dashboard/HotelMedicationAlerts'));
const HotelFeedingAlerts = lazy(() => import('@/components/dashboard/HotelFeedingAlerts'));
const HotelCheckoutAlerts = lazy(() => import('@/components/dashboard/HotelCheckoutAlerts'));
const MedicationTab = lazy(() => import('@/components/dashboard/MedicationTab'));
const QrReader = lazy(() => import('@/components/qrcode/QrReader'));
const EmployeeTasksBanner = lazy(() => import('@/components/dashboard/EmployeeTasksBanner'));

const SectionLoader = () => (
  <div className="flex items-center justify-center py-10">
    <Loader2 size={20} className="animate-spin text-primary" />
  </div>
);

// Prefetch heavy tab modules during idle time so switching tabs is instant
const prefetchTabModules = () => {
  const idle = (cb: () => void) =>
    typeof (window as any).requestIdleCallback === 'function'
      ? (window as any).requestIdleCallback(cb, { timeout: 2000 })
      : setTimeout(cb, 800);
  idle(() => {
    import('@/components/dashboard/DaycareTab');
    import('@/components/dashboard/TaxiTab');
    import('@/components/dashboard/HotelTab');
    import('@/components/dashboard/MedicationTab');
    import('@/components/dashboard/HealthControlTab');
  });
};

const Dashboard: React.FC = () => {
  const { clients, getClientById } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [presence, setPresence] = useState({ daycare: 0, hotel: 0 });

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) || null : null;

  const fetchPresence = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [{ data: qrToday }, { data: stays }] = await Promise.all([
        supabase.from('qr_entries').select('dog,tutor').gte('data_hora', `${today}T00:00:00`).lte('data_hora', `${today}T23:59:59`),
        supabase.from('hotel_stays').select('id').eq('active', true),
      ]);
      const uniqueDaycare = new Set((qrToday || []).map((q: any) => `${q.dog}|${q.tutor}`));
      setPresence({ daycare: uniqueDaycare.size, hotel: (stays || []).length });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    prefetchTabModules();
    fetchPresence();
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      setSelectedClientId(id);
      setSheetOpen(true);
    };
    window.addEventListener('openClientDetail', handler);

    const channel = supabase
      .channel('dashboard-presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_entries' }, fetchPresence)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchPresence)
      .subscribe();

    return () => {
      window.removeEventListener('openClientDetail', handler);
      supabase.removeChannel(channel);
    };
  }, [fetchPresence]);

  const healthAlerts = useMemo(() => getHealthAlerts(clients), [clients]);

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id);
    setSheetOpen(true);
  };

  const handleAlertClientClick = (clientId: string) => {
    const client = getClientById(clientId);
    if (client) handleClientClick(client);
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const todayLabel = useMemo(
    () => format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }),
    []
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-40 -left-32 w-[360px] h-[360px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container px-4 py-6 max-w-6xl mx-auto space-y-6 relative">
        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-primary/80 uppercase tracking-[0.18em] flex items-center gap-1.5">
              <Sparkles size={12} className="shrink-0" />
              {greeting}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-0.5 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {todayLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs rounded-xl backdrop-blur-sm bg-card/70 hover:bg-card">
                  <Camera size={14} />
                  QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Leitor QR Code</DialogTitle>
                </DialogHeader>
                <Suspense fallback={<SectionLoader />}>
                  <QrReader />
                </Suspense>
              </DialogContent>
            </Dialog>
            <Suspense fallback={<Button size="sm" variant="outline" className="h-9 text-xs rounded-xl" disabled><Loader2 size={14} className="animate-spin" /></Button>}>
              <AddClientDialog />
            </Suspense>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full flex gap-2 h-auto p-1.5 bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl overflow-x-auto scrollbar-none shadow-sm">
            {[
              { value: 'overview', icon: LayoutDashboard, label: 'Geral' },
              { value: 'daycare', icon: PawPrint, label: 'Creche' },
              { value: 'hotel', icon: Hotel, label: 'Hotel' },
              { value: 'health', icon: HeartPulse, label: 'Saúde' },
              { value: 'taxi', icon: Car, label: 'Táxi' },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-muted-foreground transition-all min-w-[4rem] flex-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/25 hover:text-foreground"
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-5 mt-5">
            <Suspense fallback={<SectionLoader />}>
              <EmployeeTasksBanner />
            </Suspense>

            {/* HERO: Presentes Hoje */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-lg shadow-primary/5">
              <div aria-hidden className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
              <div aria-hidden className="absolute -bottom-20 -left-10 w-44 h-44 rounded-full bg-accent/15 blur-3xl" />

              <div className="relative flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5 text-primary mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-[10px] uppercase tracking-[0.18em] font-bold">Presentes Agora</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Creche + Hotel em tempo real</p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-5xl font-bold leading-none bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                    {presence.daycare + presence.hotel}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">pets total</p>
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-3">
                <div className="bg-background/70 backdrop-blur-sm border border-border/60 rounded-xl p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 rounded-md bg-primary/15">
                      <PawPrint size={12} className="text-primary" strokeWidth={2.2} />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Creche</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">{presence.daycare}</p>
                </div>
                <div className="bg-background/70 backdrop-blur-sm border border-border/60 rounded-xl p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 rounded-md bg-primary/15">
                      <Hotel size={12} className="text-primary" strokeWidth={2.2} />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hotel</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground leading-none">{presence.hotel}</p>
                </div>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="group bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl p-4 transition-all hover:border-primary/30 hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Total Pets</p>
                  <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Users size={13} className="text-primary" strokeWidth={2.2} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{clients.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">cadastrados</p>
              </div>
              <div className="group bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl p-4 transition-all hover:border-destructive/40 hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Alertas</p>
                  <div className={`p-1.5 rounded-lg transition-colors ${healthAlerts.length > 0 ? 'bg-destructive/15 group-hover:bg-destructive/25' : 'bg-muted/60'}`}>
                    <Bell size={13} className={healthAlerts.length > 0 ? 'text-destructive' : 'text-muted-foreground'} strokeWidth={2.2} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${healthAlerts.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{healthAlerts.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{healthAlerts.length === 1 ? 'pendente' : 'pendentes'}</p>
              </div>
            </div>

            <Suspense fallback={<SectionLoader />}>
              <HotelFeedingAlerts />
              <HotelCheckoutAlerts />
              <HealthAlerts alerts={healthAlerts} onClientClick={handleAlertClientClick} />
              <BirthdaySection clients={clients} onClientClick={handleClientClick} />
            </Suspense>
          </TabsContent>

          <TabsContent value="daycare" className="mt-4">
            <Suspense fallback={<SectionLoader />}>
              <DaycareTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="taxi" className="mt-4">
            <Suspense fallback={<SectionLoader />}>
              <TaxiTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="hotel" className="mt-4">
            <Suspense fallback={<SectionLoader />}>
              <HotelTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="health" className="mt-4">
            <Suspense fallback={<SectionLoader />}>
              <Tabs defaultValue="medication" className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-10 mb-4">
                  <TabsTrigger value="medication" className="gap-1.5 text-xs font-medium">
                    <Pill size={14} /> Medicação
                  </TabsTrigger>
                  <TabsTrigger value="health-control" className="gap-1.5 text-xs font-medium">
                    <HeartPulse size={14} /> Controle
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="medication">
                  <Suspense fallback={<SectionLoader />}>
                    <MedicationTab />
                  </Suspense>
                </TabsContent>
                <TabsContent value="health-control">
                  <Suspense fallback={<SectionLoader />}>
                    <HealthControlTab />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <Suspense fallback={null}>
        <ClientDetailSheet client={selectedClient} open={sheetOpen} onOpenChange={setSheetOpen} />
      </Suspense>
    </div>
  );
};

export default Dashboard;
