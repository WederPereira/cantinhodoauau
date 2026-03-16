import React, { useState, useEffect } from 'react';
import { BathServiceType, PetSize, BathStatus, Client } from '@/types/client';
import { loadCustomPrices } from '@/components/banho/BathPriceTable';
import { Bath, Calendar as CalendarIcon2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SERVICE_TYPES: BathServiceType[] = ['Banho', 'Banho + Tosa', 'Tosa Higiênica', 'Hidratação', 'Banho + Hidratação', 'Banho + Tosa + Hidratação'];
const PET_SIZES: PetSize[] = ['Pequeno', 'Médio', 'Grande', 'Gigante'];
const STATUSES: BathStatus[] = ['Agendado', 'Em andamento', 'Concluído', 'Entregue'];

interface AddBathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    tutorName: string;
    petName: string;
    breed: string;
    phone?: string;
    date: Date;
    scheduledTime?: string;
    price: number;
    serviceType: BathServiceType;
    petSize: PetSize;
    status: BathStatus;
    notes?: string;
    clientId?: string;
  }) => void;
  clients?: Client[];
  isClientTab?: boolean;
}

const AddBathDialog: React.FC<AddBathDialogProps> = ({ open, onOpenChange, onAdd, clients, isClientTab }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [tutorName, setTutorName] = useState('');
  const [petName, setPetName] = useState('');
  const [breed, setBreed] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState<BathServiceType>('Banho');
  const [petSize, setPetSize] = useState<PetSize>('Médio');
  const [status, setStatus] = useState<BathStatus>('Agendado');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [useCustomPrice, setUseCustomPrice] = useState(false);

  // Auto-fill price from table
  useEffect(() => {
    if (!useCustomPrice) {
      const prices = loadCustomPrices();
      const suggested = prices[serviceType]?.[petSize] || 0;
      setPrice(suggested.toString());
    }
  }, [serviceType, petSize, useCustomPrice]);

  // Auto-fill from selected client
  useEffect(() => {
    if (selectedClientId && clients) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setTutorName(client.tutorName);
        setPetName(client.name);
        setBreed(client.breed);
        setPhone(client.tutorPhone);
        if (client.petSize) setPetSize(client.petSize);
      }
    }
  }, [selectedClientId, clients]);

  const resetForm = () => {
    setSelectedClientId('');
    setClientSearchOpen(false);
    setTutorName('');
    setPetName('');
    setBreed('');
    setPhone('');
    setServiceType('Banho');
    setPetSize('Médio');
    setStatus('Agendado');
    setPrice('');
    setDate(new Date());
    setScheduledTime('');
    setNotes('');
    setUseCustomPrice(false);
  };

  const handleAdd = () => {
    if (isClientTab && !selectedClientId) return;
    if (!isClientTab && !petName.trim()) return;
    const priceNum = parseFloat(price.replace(',', '.')) || 0;
    if (priceNum <= 0) return;
    onAdd({
      tutorName: tutorName.trim(),
      petName: petName.trim(),
      breed: breed.trim(),
      phone: phone.trim() || undefined,
      date,
      scheduledTime: scheduledTime || undefined,
      price: priceNum,
      serviceType,
      petSize,
      status,
      notes: notes.trim() || undefined,
      clientId: selectedClientId || undefined,
    });
    resetForm();
    onOpenChange(false);
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bath size={18} className="text-primary" />
            {isClientTab ? 'Novo Banho (Cliente)' : 'Novo Banho Avulso'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {isClientTab ? (
            <>
              {/* Client selection with search */}
              {clients && clients.length > 0 && (
                <div className="space-y-2">
                  <Label>Selecionar Cliente *</Label>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientSearchOpen}
                        className="w-full justify-between h-11 text-left"
                      >
                        {selectedClientId ? 
                          (() => {
                            const client = clients.find(c => c.id === selectedClientId);
                            return client ? `${client.name} — ${client.tutorName}` : "Escolha um cliente...";
                          })() 
                          : "Escolha um cliente cadastrado..."
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente por nome do pet ou tutor..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.tutorName} ${client.breed || ''}`}
                                onSelect={() => {
                                  setSelectedClientId(client.id);
                                  setClientSearchOpen(false);
                                }}
                              >
                                <div className="flex flex-col w-full">
                                  <div className="flex items-center">
                                    <span className="font-medium">{client.name}</span>
                                    <span className="text-muted-foreground ml-2">— {client.tutorName}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.breed && `${client.breed} • `}{client.tutorPhone}
                                  </div>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {/* Show selected client info as read-only summary */}
              {selectedClient && (
                <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Informações do cliente</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                    <span className="text-muted-foreground text-xs">Pet:</span>
                    <span className="font-medium text-xs">{selectedClient.name}</span>
                    <span className="text-muted-foreground text-xs">Tutor:</span>
                    <span className="font-medium text-xs">{selectedClient.tutorName}</span>
                    <span className="text-muted-foreground text-xs">Raça:</span>
                    <span className="font-medium text-xs">{selectedClient.breed}</span>
                    <span className="text-muted-foreground text-xs">Telefone:</span>
                    <span className="font-medium text-xs">{selectedClient.tutorPhone}</span>
                    <span className="text-muted-foreground text-xs">Porte:</span>
                    <span className="font-medium text-xs">{selectedClient.petSize || '—'}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Walk-in: full form fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tutor</Label>
                  <Input value={tutorName} onChange={e => setTutorName(e.target.value)} placeholder="Nome do tutor" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pet *</Label>
                  <Input value={petName} onChange={e => setPetName(e.target.value)} placeholder="Nome do pet" className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Raça</Label>
                  <Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Raça" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-9 text-sm" />
                </div>
              </div>
            </>
          )}

          {/* Service Type & Pet Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Serviço *</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as BathServiceType)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Porte *</Label>
              <Select value={petSize} onValueChange={(v) => setPetSize(v as PetSize)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PET_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BathStatus)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-2">
                Valor (R$) *
                <button type="button" className="text-[10px] text-primary underline" onClick={() => setUseCustomPrice(!useCustomPrice)}>
                  {useCustomPrice ? 'Usar tabela' : 'Personalizar'}
                </button>
              </Label>
              <Input
                value={price}
                onChange={e => { setUseCustomPrice(true); setPrice(e.target.value); }}
                placeholder="80,00"
                type="text"
                inputMode="decimal"
                className="h-9 text-sm"
                readOnly={!useCustomPrice}
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                    <CalendarIcon2 className="mr-2 h-3.5 w-3.5" />
                    {format(date, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário</Label>
              <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais" className="h-9 text-sm" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={isClientTab ? !selectedClientId : !petName.trim()}>Registrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddBathDialog;
