import React, { useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { AddClientDialog } from '@/components/AddClientDialog';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';
import { HealthAlerts } from '@/components/HealthAlerts';
import { BirthdaySection } from '@/components/dashboard/BirthdaySection';
import { HealthControlTab } from '@/components/dashboard/HealthControlTab';
import DaycareTab from '@/components/dashboard/DaycareTab';
import TaxiTab from '@/components/dashboard/TaxiTab';
import HotelTab from '@/components/dashboard/HotelTab';
import HotelMedicationAlerts from '@/components/dashboard/HotelMedicationAlerts';
import HotelFeedingAlerts from '@/components/dashboard/HotelFeedingAlerts';
import HotelCheckoutAlerts from '@/components/dashboard/HotelCheckoutAlerts';
import QrReader from '@/components/qrcode/QrReader';
import { Client, getHealthAlerts } from '@/types/client';
import { Users, LayoutDashboard, HeartPulse, PawPrint, Hotel, Camera, Car } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-4 sm:space-y-5">
        {/* Header - empilhado no mobile */}
        <div className="space-y-3">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {clients.length} pets cadastrados
            </p>
          </div>

          {/* Botões centralizados */}
          <div className="flex items-center justify-center gap-2 w-full">
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-10 px-4 text-[13px] font-semibold shadow-md bg-primary hover:bg-primary/90 rounded-xl transition-all duration-200 active:scale-[0.98] flex-1 max-w-[160px] sm:flex-none sm:max-w-none sm:px-5">
                  <Camera size={16} />
                  Ler Entrada
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Leitor QR Code</DialogTitle>
                </DialogHeader>
                <QrReader />
              </DialogContent>
            </Dialog>
            <AddClientDialog />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-11 sm:h-12 rounded-xl p-1 bg-muted/60">
            <TabsTrigger value="overview" className="gap-1 text-[10px] sm:text-sm rounded-lg data-[state=active]:shadow-md transition-all duration-200 px-0.5 sm:px-3">
              <LayoutDashboard size={15} className="shrink-0" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="daycare" className="gap-1 text-[10px] sm:text-sm rounded-lg data-[state=active]:shadow-md transition-all duration-200 px-0.5 sm:px-3">
              <PawPrint size={15} className="shrink-0" />
              <span className="hidden sm:inline">Creche</span>
            </TabsTrigger>
            <TabsTrigger value="taxi" className="gap-1 text-[10px] sm:text-sm rounded-lg data-[state=active]:shadow-md transition-all duration-200 px-0.5 sm:px-3">
              <Car size={15} className="shrink-0" />
              <span className="hidden sm:inline">Táxi</span>
            </TabsTrigger>
            <TabsTrigger value="hotel" className="gap-1 text-[10px] sm:text-sm rounded-lg data-[state=active]:shadow-md transition-all duration-200 px-0.5 sm:px-3">
              <Hotel size={15} className="shrink-0" />
              <span className="hidden sm:inline">Hotel</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1 text-[10px] sm:text-sm rounded-lg data-[state=active]:shadow-md transition-all duration-200 px-0.5 sm:px-3">
              <HeartPulse size={15} className="shrink-0" />
              <span className="hidden sm:inline">Saúde</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-5 mt-4">
            {/* Stats card */}
            <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10">
                  <Users size={20} className="text-primary sm:hidden" />
                  <Users size={22} className="text-primary hidden sm:block" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Total de Clientes</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{clients.length}</p>
                </div>
              </div>
            </div>

            <HotelMedicationAlerts />
            <HotelFeedingAlerts />
            <HotelCheckoutAlerts />
            <HealthAlerts alerts={healthAlerts} onClientClick={handleAlertClientClick} />
            <BirthdaySection clients={clients} onClientClick={handleClientClick} />
          </TabsContent>

          <TabsContent value="daycare" className="mt-4">
            <DaycareTab />
          </TabsContent>
          <TabsContent value="taxi" className="mt-4">
            <TaxiTab />
          </TabsContent>

          <TabsContent value="hotel" className="mt-4">
            <HotelTab />
          </TabsContent>

          <TabsContent value="health" className="mt-4">
            <HealthControlTab />
          </TabsContent>
        </Tabs>
      </div>

      <ClientDetailSheet client={selectedClient} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default Dashboard;
