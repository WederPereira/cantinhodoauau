import React from 'react';
import { HealthAlert, formatDate } from '@/types/client';
import { AlertTriangle, Syringe, Bug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HealthAlertsProps {
  alerts: HealthAlert[];
  onClientClick?: (clientId: string) => void;
}

export const HealthAlerts: React.FC<HealthAlertsProps> = ({ alerts, onClientClick }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <AlertTriangle size={20} className="text-destructive" />
        Alertas de Saúde
        <span className="text-sm font-normal text-muted-foreground">
          ({alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'})
        </span>
      </h2>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {alerts.map((alert, i) => (
          <div
            key={`${alert.clientId}-${alert.itemName}-${i}`}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
              alert.isExpired
                ? 'bg-destructive/5 border-destructive/20'
                : 'bg-[hsl(var(--status-warning-bg))] border-[hsl(var(--status-warning)/0.2)]'
            }`}
            onClick={() => onClientClick?.(alert.clientId)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                alert.isExpired ? 'bg-destructive/10' : 'bg-[hsl(var(--status-warning)/0.15)]'
              }`}>
                {alert.type === 'vaccine' ? (
                  <Syringe size={14} className={alert.isExpired ? 'text-destructive' : 'text-[hsl(var(--status-warning))]'} />
                ) : (
                  <Bug size={14} className={alert.isExpired ? 'text-destructive' : 'text-[hsl(var(--status-warning))]'} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{alert.clientName}</p>
                <p className="text-xs text-muted-foreground">{alert.itemName}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs ${
              alert.isExpired ? 'text-destructive border-destructive/30' : 'text-[hsl(var(--status-warning))] border-[hsl(var(--status-warning)/0.3)]'
            }`}>
              {alert.isExpired ? 'Vencida' : 'Vencendo'} {formatDate(alert.expiryDate)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
