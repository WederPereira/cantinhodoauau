import React from 'react';
import { Client, formatDate, getProfileCompleteness } from '@/types/client';
import { cn } from '@/lib/utils';
import { Calendar, ChevronRight } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

const completenessStyles = {
  complete: 'ring-2 ring-[hsl(var(--status-ok))]/30',
  partial: 'ring-2 ring-[hsl(var(--status-warning))]/30',
  incomplete: 'ring-2 ring-destructive/30',
};

const completenessLabelStyles = {
  complete: 'bg-[hsl(var(--status-ok-bg))] text-[hsl(var(--status-ok))]',
  partial: 'bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning))]',
  incomplete: 'bg-destructive/10 text-destructive',
};

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onClick,
  className,
  compact = false,
}) => {
  const { percent, level } = getProfileCompleteness(client);

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'bg-card border border-border rounded-2xl p-3 shadow-soft',
          'transition-all duration-200 hover:shadow-medium hover:border-primary/30',
          'cursor-pointer group flex items-center gap-3',
          completenessStyles[level],
          className
        )}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
          {client.photo ? (
            <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{client.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate text-sm">{client.name}</p>
          {client.breed && <p className="text-xs text-muted-foreground truncate">{client.breed}</p>}
        </div>
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", completenessLabelStyles[level])}>
          {percent}%
        </span>
        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-2xl p-4 sm:p-5',
        'transition-all duration-250 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1',
        'cursor-pointer group shadow-soft',
        completenessStyles[level],
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-muted shadow-sm">
            {client.photo ? (
              <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-lg font-extrabold text-primary">{client.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-[15px] truncate" style={{ fontFamily: 'Nunito, sans-serif' }}>{client.name}</h3>
            {client.breed && (
              <span className="text-xs text-muted-foreground font-medium">🐕 {client.breed}</span>
            )}
            {client.tutorName && (
              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">👤 {client.tutorName}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {client.petSize && (
            <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{client.petSize}</span>
          )}
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", completenessLabelStyles[level])}>
            {percent}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <Calendar size={12} />
          <span>Desde: {formatDate(client.entryDate)}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Ver mais</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
};
