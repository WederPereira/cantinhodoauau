import React, { useState } from 'react';
import { Client, VaccineType, VACCINE_TYPE_LABELS, VACCINE_LABELS, Vaccines, ANTIPULGAS_BRANDS, formatVaccineDate, getVaccineExpiryDate, getFleaExpiryDate, isExpired, isExpiringSoon } from '@/types/client';
import { useClients } from '@/context/ClientContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Syringe, Bug, Plus, CalendarIcon, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HealthHistorySectionProps {
  client: Client;
}

export const HealthHistorySection: React.FC<HealthHistorySectionProps> = ({ client }) => {
  const { addVaccineRecord, deleteVaccineRecord, addFleaRecord, deleteFleaRecord, updateClient } = useClients();
  const [vaccineDialogOpen, setVaccineDialogOpen] = useState(false);
  const [fleaDialogOpen, setFleaDialogOpen] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<VaccineType | null>(null);

  // Vaccine form state
  const [vaccineType, setVaccineType] = useState<VaccineType>('v10');
  const [vaccineDate, setVaccineDate] = useState<Date>(new Date());

  // Flea form state
  const [fleaDate, setFleaDate] = useState<Date>(new Date());
  const [fleaBrand, setFleaBrand] = useState(ANTIPULGAS_BRANDS[0]);
  const [customBrand, setCustomBrand] = useState('');
  const [fleaDuration, setFleaDuration] = useState<number>(1);

  const handleAddVaccine = () => {
    addVaccineRecord(client.id, vaccineType, vaccineDate.toISOString());
    toast.success(`Vacina ${VACCINE_TYPE_LABELS[vaccineType]} registrada!`);
    setVaccineDialogOpen(false);
  };

  const handleAddFlea = () => {
    const brand = fleaBrand === '__custom__' ? customBrand.trim() : fleaBrand;
    if (!brand) {
      toast.error('Selecione ou digite a marca');
      return;
    }
    addFleaRecord(client.id, fleaDate.toISOString(), brand, fleaDuration as 1 | 2 | 3 | 6);
    toast.success(`Antipulgas ${brand} registrado!`);
    setFleaDialogOpen(false);
    setCustomBrand('');
  };

  const getStatusBadge = (lastDate: string | null, type: 'vaccine' | 'flea', durationMonths?: number) => {
    if (!lastDate) return <Badge variant="outline" className="text-muted-foreground text-xs">Não registrada</Badge>;
    
    const expiry = type === 'vaccine' 
      ? getVaccineExpiryDate(lastDate)
      : getFleaExpiryDate(lastDate, durationMonths || 1);

    if (isExpired(expiry)) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs gap-1">
          <AlertTriangle size={10} />
          Vencida {formatVaccineDate(lastDate)}
        </Badge>
      );
    }
    if (isExpiringSoon(expiry, 30)) {
      return (
        <Badge className="bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning))] border-[hsl(var(--status-warning)/0.3)] text-xs gap-1">
          <AlertTriangle size={10} />
          Vence em breve - {formatVaccineDate(lastDate)}
        </Badge>
      );
    }
    return (
      <Badge className="bg-[hsl(var(--status-ok-bg))] text-[hsl(var(--status-ok))] text-xs">
        {formatVaccineDate(lastDate)}
      </Badge>
    );
  };

  const lastFlea = client.fleaHistory?.[0];

  const openVaccineFor = (type: VaccineType) => {
    setVaccineType(type);
    setVaccineDate(new Date());
    setVaccineDialogOpen(true);
  };

  const openFleaFor = () => {
    setFleaDate(new Date());
    setFleaBrand(ANTIPULGAS_BRANDS[0]);
    setCustomBrand('');
    setFleaDuration(1);
    setFleaDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Vaccines Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Syringe size={16} />
          Vacinas
        </h3>
        <div className="space-y-1">
          {(['gripe', 'v10', 'raiva', 'giardia'] as VaccineType[]).map(key => (
            <button
              key={key}
              onClick={() => openVaccineFor(key)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{VACCINE_TYPE_LABELS[key]}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(client.vaccines?.[key], 'vaccine')}
                <Pencil size={12} className="text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {/* Vaccine History */}
        {client.vaccineHistory && client.vaccineHistory.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground">Histórico de Vacinas</p>
            {client.vaccineHistory.slice(0, 10).map(record => (
              <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs group hover:bg-muted/30 transition-colors">
                <span className="font-medium">{VACCINE_TYPE_LABELS[record.type]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatVaccineDate(record.date)}</span>
                  <button
                    onClick={() => {
                      deleteVaccineRecord(client.id, record.id);
                      toast.success('Registro de vacina removido');
                    }}
                    className="text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flea Treatment Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Bug size={16} />
          Antipulgas
        </h3>

        <button
          onClick={openFleaFor}
          className="w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
        >
          {lastFlea ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{lastFlea.brand}</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(lastFlea.date, 'flea', lastFlea.durationMonths)}
                  <Pencil size={12} className="text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Duração: {lastFlea.durationMonths} {lastFlea.durationMonths === 1 ? 'mês' : 'meses'}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm">Última aplicação</span>
              <div className="flex items-center gap-2">
                {getStatusBadge(client.vaccines?.antipulgas, 'flea')}
                <Pencil size={12} className="text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors" />
              </div>
            </div>
          )}
        </button>

        {/* Flea History */}
        {client.fleaHistory && client.fleaHistory.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground">Histórico de Antipulgas</p>
            {client.fleaHistory.slice(0, 10).map(record => (
              <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs group hover:bg-muted/30 transition-colors">
                <div>
                  <span className="font-medium">{record.brand}</span>
                  <span className="text-muted-foreground ml-2">({record.durationMonths}m)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatVaccineDate(record.date)}</span>
                  <button
                    onClick={() => {
                      deleteFleaRecord(client.id, record.id);
                      toast.success('Registro de antipulgas removido');
                    }}
                    className="text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Vaccine Dialog */}
      <Dialog open={vaccineDialogOpen} onOpenChange={setVaccineDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Syringe size={18} />
              Registrar Vacina
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tipo da Vacina</Label>
              <Select value={vaccineType} onValueChange={(v) => setVaccineType(v as VaccineType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['gripe', 'v10', 'raiva', 'giardia'] as VaccineType[]).map(t => (
                    <SelectItem key={t} value={t}>{VACCINE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da Aplicação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(vaccineDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={vaccineDate} onSelect={(d) => d && setVaccineDate(d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setVaccineDialogOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleAddVaccine}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Flea Treatment Dialog */}
      <Dialog open={fleaDialogOpen} onOpenChange={setFleaDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug size={18} />
              Registrar Antipulgas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={fleaBrand} onValueChange={setFleaBrand}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANTIPULGAS_BRANDS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">Outra marca...</SelectItem>
                </SelectContent>
              </Select>
              {fleaBrand === '__custom__' && (
                <Input value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="Nome da marca" className="mt-2" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={String(fleaDuration)} onValueChange={(v) => setFleaDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="2">2 meses</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da Aplicação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(fleaDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fleaDate} onSelect={(d) => d && setFleaDate(d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setFleaDialogOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleAddFlea}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
