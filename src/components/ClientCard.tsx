import React from 'react';
import { Client, formatDate, getProfileCompleteness } from '@/types/client';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

const levelDot = {
  complete: 'bg-[hsl(var(--status-ok))]',
  partial: 'bg-[hsl(var(--status-warning))]',
  incomplete: 'bg-destructive',
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
          'bg-card border border-border rounded-xl p-2.5',
          'transition-all duration-200 hover:border-primary/40',
          'cursor-pointer group flex items-center gap-3',
          className
        )}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
          {client.photo ? (
            <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-sm font-semibold text-muted-foreground">{client.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{client.name}</p>
          {client.breed && <p className="text-xs text-muted-foreground truncate">{client.breed}</p>}
        </div>
        <div className={cn('w-2 h-2 rounded-full shrink-0', levelDot[level])} />
        <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-2xl overflow-hidden',
        'transition-all duration-200 hover:border-primary/30',
        'cursor-pointer group',
        className
      )}
    >
      {/* Photo area */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {client.photo ? (
          <img src={client.photo} alt={client.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground/30">{client.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        {/* Completeness dot */}
        <div className="absolute top-3 right-3">
          <div className={cn('w-2.5 h-2.5 rounded-full ring-2 ring-card', levelDot[level])} />
        </div>
        {client.petSize && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-medium bg-card/90 backdrop-blur-sm text-foreground px-2 py-0.5 rounded-full">
              {client.petSize}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-[15px] truncate">{client.name}</h3>
          <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
        </div>
        {client.breed && (
          <p className="text-xs text-muted-foreground truncate">{client.breed}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60">
          Desde {formatDate(client.entryDate)}
        </p>
      </div>
    </div>
  );
};
