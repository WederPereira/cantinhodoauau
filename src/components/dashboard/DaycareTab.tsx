import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dog, History, CreditCard } from 'lucide-react';
import DaycarePresence from '@/components/dashboard/DaycarePresence';
import QrHistory from '@/components/qrcode/QrHistory';
import DogIdCard from '@/components/qrcode/DogIdCard';

const DaycareTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="presence" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="presence" className="gap-1 text-[10px] sm:text-xs px-1 py-2 flex flex-col sm:flex-row items-center">
            <Dog size={14} />
            <span>Presença</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-[10px] sm:text-xs px-1 py-2 flex flex-col sm:flex-row items-center">
            <History size={14} />
            <span>Hist.</span>
          </TabsTrigger>
          <TabsTrigger value="idcard" className="gap-1 text-[10px] sm:text-xs px-1 py-2 flex flex-col sm:flex-row items-center">
            <CreditCard size={14} />
            <span>ID Card</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presence" className="mt-4">
          <DaycarePresence />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <QrHistory />
        </TabsContent>
        <TabsContent value="idcard" className="mt-4">
          <DogIdCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DaycareTab;
