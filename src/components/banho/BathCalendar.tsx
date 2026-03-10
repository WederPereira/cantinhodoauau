import React, { useMemo } from 'react';
import { WalkInBath, BathStatus, BATH_STATUS_COLORS, formatCurrency } from '@/types/client';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, PawPrint } from 'lucide-react';

interface BathCalendarProps {
  baths: WalkInBath[];
  onStatusChange: (id: string, status: BathStatus) => void;
  onDelete: (id: string) => void;
}

const BathCalendar: React.FC<BathCalendarProps> = ({ baths, onStatusChange, onDelete }) => {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  const bathDates = useMemo(() => {
    const map = new Map<string, number>();
    baths.forEach(b => {
      const key = format(new Date(b.date), 'yyyy-MM-dd');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [baths]);

  const selectedBaths = useMemo(() => {
    if (!selectedDate) return [];
    return baths
      .filter(b => isSameDay(new Date(b.date), selectedDate))
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  }, [baths, selectedDate]);

  const modifiers = useMemo(() => {
    const dates = Array.from(bathDates.keys()).map(k => new Date(k + 'T12:00:00'));
    return { hasBaths: dates };
  }, [bathDates]);

  const modifiersStyles = {
    hasBaths: {
      position: 'relative' as const,
    },
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[auto_1fr] gap-3 sm:gap-4">
      {/* Calendar */}
      <div className="bg-card border border-border rounded-lg shadow-soft p-1 sm:p-2 mx-auto lg:mx-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          locale={ptBR}
          className="p-1 sm:p-2 pointer-events-auto"
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          components={{
            DayContent: ({ date: dayDate }) => {
              const key = format(dayDate, 'yyyy-MM-dd');
              const count = bathDates.get(key);
              return (
                <div className="relative flex flex-col items-center">
                  <span>{dayDate.getDate()}</span>
                  {count && count > 0 && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              );
            },
          }}
        />
      </div>

      {/* Day detail */}
      <div className="bg-card border border-border rounded-lg shadow-soft p-3 sm:p-4 min-h-[200px] sm:min-h-[300px]">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2 flex-wrap">
          <PawPrint size={14} className="text-primary sm:w-4 sm:h-4" />
          <span className="capitalize">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
          <Badge variant="secondary" className="ml-auto text-[10px] sm:text-xs">
            {selectedBaths.length} banho{selectedBaths.length !== 1 ? 's' : ''}
          </Badge>
        </h3>

        {selectedBaths.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
            <PawPrint size={28} className="mb-2 opacity-30" />
            <p className="text-xs sm:text-sm">Nenhum banho agendado para este dia</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
            {selectedBaths.map(bath => (
              <div
                key={bath.id}
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-1 min-w-[40px] sm:min-w-[50px] text-muted-foreground">
                  <Clock size={10} className="sm:w-3 sm:h-3" />
                  <span className="text-[10px] sm:text-xs font-medium">{bath.scheduledTime || '--:--'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{bath.petName}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {bath.tutorName && `${bath.tutorName} · `}{bath.serviceType}
                  </p>
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-primary hidden xs:block">{formatCurrency(bath.price)}</span>
                <Badge
                  variant="secondary"
                  className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 shrink-0", BATH_STATUS_COLORS[bath.status])}
                >
                  {bath.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BathCalendar;
