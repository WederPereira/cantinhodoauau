import React, { useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { AddClientDialog } from '@/components/AddClientDialog';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';
import { HealthAlerts } from '@/components/HealthAlerts';
import { BirthdaySection } from '@/components/dashboard/BirthdaySection';
import { HealthControlTab } from '@/components/dashboard/HealthControlTab';
import DaycareTab from '@/components/dashboard/DaycareTab';
import HotelTab from '@/components/dashboard/HotelTab';
import HotelMedicationAlerts from '@/components/dashboard/HotelMedicationAlerts';
import HotelFeedingAlerts from '@/components/dashboard/HotelFeedingAlerts';
import HotelCheckoutAlerts from '@/components/dashboard/HotelCheckoutAlerts';
import QrReader from '@/components/qrcode/QrReader';
import { Client, getHealthAlerts } from '@/types/client';
import { Users, LayoutDashboard, HeartPulse, PawPrint, Hotel, Camera } from 'lucide-react';
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
      <div className="container px-4 py-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {clients.length} pets cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Camera size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Leitor QR Code</DialogTitle>
                </DialogHeader>
                <QrReader />
              </DialogContent>
            </Dialog>
            <AddClientDialog />
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
              <LayoutDashboard size={14} />
              <span>Geral</span>
            </TabsTrigger>
            <TabsTrigger value="daycare" className="gap-1 text-xs sm:text-sm">
              <PawPrint size={14} />
              Creche
            </TabsTrigger>
            <TabsTrigger value="hotel" className="gap-1 text-xs sm:text-sm">
              <Hotel size={14} />
              Hotel
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1 text-xs sm:text-sm">
              <HeartPulse size={14} />
              Saúde
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5 mt-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Users size={22} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total de Clientes</p>
                  <p className="text-3xl font-bold text-foreground">{clients.length}</p>
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
