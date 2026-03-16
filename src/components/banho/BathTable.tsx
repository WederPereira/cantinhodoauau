import React from 'react';
import { WalkInBath, BathStatus, BATH_STATUS_COLORS, formatCurrency, formatDate } from '@/types/client';
import { Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_NEXT: Record<BathStatus, BathStatus | null> = {
  'Agendado': 'Em andamento',
  'Em andamento': 'Concluído',
  'Concluído': 'Entregue',
  'Entregue': null,
};

interface BathTableProps {
  baths: WalkInBath[];
  onStatusChange: (id: string, status: BathStatus) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

const BathTable: React.FC<BathTableProps> = ({ baths, onStatusChange, onDelete, emptyMessage }) => {
  if (baths.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-soft p-8 sm:p-12 text-center text-muted-foreground text-sm">
        {emptyMessage || 'Nenhum banho registrado'}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Data</th>
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Hora</th>
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Tutor</th>
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Pet</th>
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Raça</th>
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Porte</th>
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Serviço</th>
                <th className="font-semibold text-xs p-2 text-right text-muted-foreground">Valor</th>
                <th className="font-semibold text-xs p-2 text-left text-muted-foreground">Status</th>
                <th className="font-semibold text-xs p-2 w-20 text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {baths.map(bath => {
                const nextStatus = STATUS_NEXT[bath.status];
                return (
                  <tr key={bath.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-2 text-sm">{formatDate(bath.date)}</td>
                    <td className="p-2 text-sm text-muted-foreground">{bath.scheduledTime || '—'}</td>
                    <td className="p-2 text-sm">{bath.tutorName || '—'}</td>
                    <td className="p-2 text-sm font-medium">{bath.petName}</td>
                    <td className="p-2 text-sm text-muted-foreground">{bath.breed || '—'}</td>
                    <td className="p-2 text-xs">{bath.petSize}</td>
                    <td className="p-2 text-xs">{bath.serviceType}</td>
                    <td className="p-2 text-sm text-right font-medium text-primary">{formatCurrency(bath.price)}</td>
                    <td className="p-2">
                      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5", BATH_STATUS_COLORS[bath.status])}>
                        {bath.status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {nextStatus && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary"
                            title={`Avançar para ${nextStatus}`}
                            onClick={() => onStatusChange(bath.id, nextStatus)}
                          >
                            <ChevronRight size={14} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(bath.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-2">
        {baths.map(bath => {
          const nextStatus = STATUS_NEXT[bath.status];
          return (
            <div key={bath.id} className="bg-card border border-border rounded-lg p-3 shadow-soft">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{bath.petName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {bath.tutorName || 'Sem tutor'} {bath.breed && `· ${bath.breed}`}
                  </p>
                </div>
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5 shrink-0", BATH_STATUS_COLORS[bath.status])}>
                  {bath.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span>{formatDate(bath.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora:</span>
                  <span>{bath.scheduledTime || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="truncate ml-1">{bath.serviceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Porte:</span>
                  <span>{bath.petSize}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-bold text-primary">{formatCurrency(bath.price)}</span>
                <div className="flex items-center gap-1">
                  {nextStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-primary border-primary/30"
                      onClick={() => onStatusChange(bath.id, nextStatus)}
                    >
                      {nextStatus}
                      <ChevronRight size={12} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(bath.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default BathTable;
