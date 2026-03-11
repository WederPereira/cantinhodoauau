import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QrCode, Camera, History, CreditCard } from 'lucide-react';
import QrGenerator from '@/components/qrcode/QrGenerator';
import QrReader from '@/components/qrcode/QrReader';
import QrHistory from '@/components/qrcode/QrHistory';
import DogIdCard from '@/components/qrcode/DogIdCard';

const QrCodePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <QrCode size={24} className="text-primary" />
            QR Code
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gere, leia e registre entradas de cães
          </p>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="generate" className="gap-1 text-xs sm:text-sm">
              <QrCode size={14} />
              <span>Gerar</span>
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-1 text-xs sm:text-sm">
              <Camera size={14} />
              <span className="hidden sm:inline">Leitor</span>
              <span className="sm:hidden">Ler</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm">
              <History size={14} />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
            <TabsTrigger value="idcard" className="gap-1 text-xs sm:text-sm">
              <CreditCard size={14} />
              <span className="hidden sm:inline">Carteirinha</span>
              <span className="sm:hidden">ID</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-4">
            <QrGenerator />
          </TabsContent>
          <TabsContent value="read" className="mt-4">
            <QrReader />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <QrHistory />
          </TabsContent>
          <TabsContent value="idcard" className="mt-4">
            <DogIdCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QrCodePage;
