import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, getHealthAlerts } from '@/types/client';
import { LayoutDashboard, HeartPulse, PawPrint, Hotel, Camera, Car, Loader2 } from 'lucide-react';
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
          <TabsList className="w-full grid grid-cols-5 h-10 rounded-xl p-0.5 bg-muted/50 border border-border/50">
            <TabsTrigger value="overview" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all px-1 sm:px-3">
              <LayoutDashboard size={14} className="shrink-0" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="daycare" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all px-1 sm:px-3">
              <PawPrint size={14} className="shrink-0" />
              <span className="hidden sm:inline">Creche</span>
            </TabsTrigger>
            <TabsTrigger value="taxi" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all px-1 sm:px-3">
              <Car size={14} className="shrink-0" />
              <span className="hidden sm:inline">Táxi</span>
            </TabsTrigger>
            <TabsTrigger value="hotel" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all px-1 sm:px-3">
              <Hotel size={14} className="shrink-0" />
              <span className="hidden sm:inline">Hotel</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all px-1 sm:px-3">
              <HeartPulse size={14} className="shrink-0" />
              <span className="hidden sm:inline">Saúde</span>
            </TabsTrigger>
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
              <HotelMedicationAlerts />
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
