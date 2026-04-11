import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, getHealthAlerts } from '@/types/client';
import { LayoutDashboard, HeartPulse, PawPrint, Hotel, Camera, Car, Loader2, Sparkles } from 'lucide-react';
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
const QrReader = lazy(() => import('@/components/qrcode/QrReader'));
const EmployeeTasksBanner = lazy(() => import('@/components/dashboard/EmployeeTasksBanner'));

const SectionLoader = () => (
  <div className="flex items-center justify-center py-10">
    <Loader2 size={20} className="animate-spin text-primary" />
  </div>
);

const tabItems = [
  { value: 'overview', icon: LayoutDashboard, label: 'Geral', color: 'from-primary/20 to-primary/5' },
  { value: 'daycare', icon: PawPrint, label: 'Creche', color: 'from-accent/20 to-accent/5' },
  { value: 'taxi', icon: Car, label: 'Táxi', color: 'from-blue-500/20 to-blue-500/5' },
  { value: 'hotel', icon: Hotel, label: 'Hotel', color: 'from-emerald-500/20 to-emerald-500/5' },
  { value: 'health', icon: HeartPulse, label: 'Saúde', color: 'from-rose-500/20 to-rose-500/5' },
];

const Dashboard: React.FC = () => {
  const { clients, getClientById } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) || null : null;

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      setSelectedClientId(id);
      setSheetOpen(true);
    };
    window.addEventListener('openClientDetail', handler);
    return () => window.removeEventListener('openClientDetail', handler);
  }, []);

  const healthAlerts = useMemo(() => getHealthAlerts(clients), [clients]);

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
        {/* Header area with gradient accent */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
              <Sparkles size={16} className="text-accent" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {clients.length} pets cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10">
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
          <TabsList className="w-full flex gap-2 h-auto p-1.5 bg-muted/50 rounded-2xl border border-border/40 overflow-x-auto scrollbar-none">
            {tabItems.map(({ value, icon: Icon, label, color }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-w-fit flex-1
                  data-[state=active]:bg-gradient-to-r data-[state=active]:${color} data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/50
                  data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-background/60`}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-5">
            <Suspense fallback={<SectionLoader />}>
              <EmployeeTasksBanner />
            </Suspense>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold">Total Pets</p>
                <p className="text-3xl font-bold text-foreground mt-1">{clients.length}</p>
              </div>
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-accent/70 font-semibold">Alertas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{healthAlerts.length}</p>
              </div>
            </div>

            <Suspense fallback={<SectionLoader />}>
              <HotelMedicationAlerts />
              <HotelFeedingAlerts />
              <HotelCheckoutAlerts />
              <HealthAlerts alerts={healthAlerts} onClientClick={handleAlertClientClick} />
              <BirthdaySection clients={clients} onClientClick={handleClientClick} />
            </Suspense>
          </TabsContent>

          <TabsContent value="daycare" className="mt-5">
            <Suspense fallback={<SectionLoader />}>
              <DaycareTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="taxi" className="mt-5">
            <Suspense fallback={<SectionLoader />}>
              <TaxiTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="hotel" className="mt-5">
            <Suspense fallback={<SectionLoader />}>
              <HotelTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="health" className="mt-5">
            <Suspense fallback={<SectionLoader />}>
              <HealthControlTab />
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
