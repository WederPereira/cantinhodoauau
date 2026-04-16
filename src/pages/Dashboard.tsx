import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, getHealthAlerts } from '@/types/client';
import { LayoutDashboard, HeartPulse, PawPrint, Hotel, Camera, Car, Loader2, Pill, Save, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

  const handleExportBackup = async () => {
    try {
      toast.loading('Preparando backup...');
      const tables = [
        'clients', 'hotel_stays', 'hotel_medications', 'hotel_meals', 
        'daily_records', 'action_logs', 'vaccine_records', 'flea_records', 'taxi_groups'
      ];
      const backupData: any = {};
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) console.error(`Error fetching ${table}:`, error);
        backupData[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-cantinho-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('Backup concluído com sucesso! 💾');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Erro ao gerar backup');
    }
  };
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
                <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs rounded-xl" title="Salvar Backup">
                  <Save size={14} className="text-muted-foreground mr-1" />
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
            <Button size="sm" variant="outline" className="gap-1.5 h-9 w-9 p-0 rounded-xl" onClick={handleExportBackup} title="Gerar Backup Completo">
              <Download size={15} />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full flex gap-2 h-auto p-0 bg-transparent border-none overflow-x-auto scrollbar-none">
            {[
              { value: 'overview', icon: LayoutDashboard, label: 'Geral' },
              { value: 'daycare', icon: PawPrint, label: 'Creche' },
              { value: 'taxi', icon: Car, label: 'Táxi' },
              { value: 'hotel', icon: Hotel, label: 'Hotel' },
              { value: 'health', icon: HeartPulse, label: 'Saúde' },
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
