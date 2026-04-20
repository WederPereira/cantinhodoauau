import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, getHealthAlerts } from '@/types/client';
import { LayoutDashboard, HeartPulse, PawPrint, Hotel, Camera, Car, Loader2, Pill, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
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
  const [todayDaycare, setTodayDaycare] = useState(0);
  const [todayHotel, setTodayHotel] = useState(0);

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) || null : null;

  useEffect(() => {
    prefetchTabModules();
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      setSelectedClientId(id);
      setSheetOpen(true);
    };
    window.addEventListener('openClientDetail', handler);
    return () => window.removeEventListener('openClientDetail', handler);
  }, []);

  const fetchPresence = async () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    try {
      const [{ count: qrCount }, { data: hotelData }] = await Promise.all([
        supabase.from('qr_entries').select('*', { count: 'exact', head: true })
          .gte('data_hora', startOfDay.toISOString())
          .lte('data_hora', endOfDay.toISOString()),
        supabase.from('hotel_stays').select('id').eq('active', true),
      ]);
      setTodayDaycare(qrCount || 0);
      setTodayHotel((hotelData || []).length);
    } catch (err) {
      console.error('Erro ao carregar presenças', err);
    }
  };

  useEffect(() => {
    fetchPresence();
    const channel = supabase
      .channel('dashboard-presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_entries' }, fetchPresence)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, fetchPresence)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const healthAlerts = useMemo(() => getHealthAlerts(clients), [clients]);
  const totalPresent = todayDaycare + todayHotel;

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id);
    setSheetOpen(true);
  };

  const handleAlertClientClick = (clientId: string) => {
    const client = getClientById(clientId);
    if (client) handleClientClick(client);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-5 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {clients.length} pets cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs rounded-xl">
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
          <TabsList className="w-full flex gap-2 h-auto p-0 bg-transparent border-none overflow-x-auto scrollbar-none">
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
                className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border border-border/60 bg-card/60 text-muted-foreground transition-all min-w-[4.2rem] flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-md hover:bg-muted/80"
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Suspense fallback={<SectionLoader />}>
              <EmployeeTasksBanner />
            </Suspense>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Pets</p>
                <p className="text-3xl font-bold text-foreground mt-1">{clients.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Alertas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{healthAlerts.length}</p>
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
