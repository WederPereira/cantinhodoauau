import React from 'react';
import { Client, formatDate } from '@/types/client';
import { cn } from '@/lib/utils';
import { Calendar, ChevronRight } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onClick,
  className,
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'bg-card border border-border rounded-lg p-3 shadow-soft',
          'transition-all duration-200 hover:shadow-medium hover:border-primary/30',
          'cursor-pointer group flex items-center gap-3',
          className
        )}
      >
        <div className={cn(
          'w-10 h-10 rounded-full border-2 border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden'
        )}>
          {client.photo ? (
            <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{client.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{client.name}</p>
          {client.breed && <p className="text-xs text-muted-foreground truncate">{client.breed}</p>}
        </div>
        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-xl p-4 shadow-soft',
        'transition-all duration-200 hover:shadow-medium hover:border-primary/30 hover:-translate-y-0.5',
        'cursor-pointer group',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-11 h-11 rounded-full border-2 border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0'
          )}>
            {client.photo ? (
              <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{client.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{client.name}</h3>
            {client.breed && (
              <span className="text-xs text-muted-foreground">🐕 {client.breed}</span>
            )}
            {client.tutorName && (
              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">👤 {client.tutorName}</p>
            )}
          </div>
        </div>
        {client.petSize && (
          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">{client.petSize}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar size={12} />
          <span>Desde: {formatDate(client.entryDate)}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Detalhes</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
};
