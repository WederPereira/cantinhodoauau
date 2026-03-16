import React from 'react';
import { formatCurrency } from '@/types/client';
import { Bath, Clock, CheckCircle, Truck } from 'lucide-react';

interface BathStatsCardsProps {
  todayCount: number;
  todayRevenue: number;
  inProgress: number;
  scheduled: number;
  totalBaths: number;
  totalRevenue: number;
}

const BathStatsCards: React.FC<BathStatsCardsProps> = ({
  todayCount, todayRevenue, inProgress, scheduled, totalBaths, totalRevenue
}) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
      <div className="bg-card border border-border rounded-xl p-2 sm:p-3">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          <Bath size={12} className="text-primary sm:w-3.5 sm:h-3.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Hoje</p>
        </div>
        <p className="text-lg sm:text-xl font-bold text-foreground">{todayCount}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-2 sm:p-3">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-xs">💰</span>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Receita Hoje</p>
        </div>
        <p className="text-base sm:text-xl font-bold text-primary truncate">{formatCurrency(todayRevenue)}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-2 sm:p-3">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          <Clock size={12} className="text-yellow-500 sm:w-3.5 sm:h-3.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Andamento</p>
        </div>
        <p className="text-lg sm:text-xl font-bold text-foreground">{inProgress}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-2 sm:p-3">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          <Clock size={12} className="text-blue-500 sm:w-3.5 sm:h-3.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Agendados</p>
        </div>
        <p className="text-lg sm:text-xl font-bold text-foreground">{scheduled}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-2 sm:p-3">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          <CheckCircle size={12} className="text-green-500 sm:w-3.5 sm:h-3.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
        </div>
        <p className="text-lg sm:text-xl font-bold text-foreground">{totalBaths}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-2 sm:p-3">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          <Truck size={12} className="text-primary sm:w-3.5 sm:h-3.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Receita Total</p>
        </div>
        <p className="text-base sm:text-xl font-bold text-primary truncate">{formatCurrency(totalRevenue)}</p>
      </div>
    </div>
  );
};

export default BathStatsCards;
