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
import { Users, PawPrint, Hotel, Camera, Car, HeartPulse, Scan } from 'lucide-react';
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
      <div className="container px-4 sm:px-6 py-5 sm:py-7 max-w-7xl mx-auto space-y-5 sm:space-y-6">
        {/* Hero section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-primary p-5 sm:p-7 text-primary-foreground">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Dashboard
                </h1>
                <p className="text-sm sm:text-base opacity-90 font-medium mt-0.5">
                  {clients.length} pets cadastrados 🐾
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3">
                <Users size={20} />
                <span className="text-2xl font-extrabold">{clients.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 h-10 px-5 text-[13px] font-bold bg-white/20 hover:bg-white/30 text-primary-foreground rounded-2xl backdrop-blur-sm border border-white/20 transition-all duration-200 active:scale-[0.97]">
                    <Scan size={16} />
                    Ler Entrada
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Leitor QR Code</DialogTitle>
                  </DialogHeader>
                  <QrReader />
                </DialogContent>
              </Dialog>
              <AddClientDialog />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-12 sm:h-13 rounded-2xl p-1 bg-card border border-border shadow-soft">
            <TabsTrigger value="overview" className="gap-1.5 text-[10px] sm:text-[13px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-semibold px-1 sm:px-3">
              <PawPrint size={15} className="shrink-0" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="daycare" className="gap-1.5 text-[10px] sm:text-[13px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-semibold px-1 sm:px-3">
              <PawPrint size={15} className="shrink-0" />
              <span className="hidden sm:inline">Creche</span>
            </TabsTrigger>
            <TabsTrigger value="taxi" className="gap-1.5 text-[10px] sm:text-[13px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-semibold px-1 sm:px-3">
              <Car size={15} className="shrink-0" />
              <span className="hidden sm:inline">Táxi</span>
            </TabsTrigger>
            <TabsTrigger value="hotel" className="gap-1.5 text-[10px] sm:text-[13px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-semibold px-1 sm:px-3">
              <Hotel size={15} className="shrink-0" />
              <span className="hidden sm:inline">Hotel</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5 text-[10px] sm:text-[13px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-semibold px-1 sm:px-3">
              <HeartPulse size={15} className="shrink-0" />
              <span className="hidden sm:inline">Saúde</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-5 mt-5">
            <HotelMedicationAlerts />
            <HotelFeedingAlerts />
            <HotelCheckoutAlerts />
            <HealthAlerts alerts={healthAlerts} onClientClick={handleAlertClientClick} />
            <BirthdaySection clients={clients} onClientClick={handleClientClick} />
          </TabsContent>

          <TabsContent value="daycare" className="mt-5">
            <DaycareTab />
          </TabsContent>
          <TabsContent value="taxi" className="mt-5">
            <TaxiTab />
          </TabsContent>
          <TabsContent value="hotel" className="mt-5">
            <HotelTab />
          </TabsContent>
          <TabsContent value="health" className="mt-5">
            <HealthControlTab />
          </TabsContent>
        </Tabs>
      </div>

      <ClientDetailSheet client={selectedClient} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default Dashboard;
