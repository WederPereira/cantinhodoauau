import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Client, PetSize, PetGender, formatDate, VACCINE_LABELS, Vaccines, formatVaccineDate, getVaccineExpiryDate, isExpired, isExpiringSoon, VaccineType, DEFAULT_VACCINES } from '@/types/client';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { Trash2, Pencil, Dog, Heart, User, MapPin, Phone, Mail, FileText, Home, X, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HealthHistorySection } from './HealthHistorySection';
import { PhotoUpload } from './PhotoUpload';
import { InlineEditField } from './InlineEditField';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BreedSelect } from './BreedSelect';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientDetailSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientDetailSheet: React.FC<ClientDetailSheetProps> = ({ client, open, onOpenChange }) => {
  const { clients, deleteClient, updateClient } = useClients();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [editingBreed, setEditingBreed] = useState(false);

  const healthSummary = useMemo(() => {
    if (!client) return { upToDate: 0, expiring: 0, expired: 0, total: 4 };
    const vaccineKeys: VaccineType[] = ['gripe', 'v10', 'raiva', 'giardia'];
    let upToDate = 0, expiring = 0, expired = 0;
    vaccineKeys.forEach(key => {
      const d = client.vaccines[key];
      if (!d) { expired++; return; }
      const exp = getVaccineExpiryDate(d);
      if (isExpired(exp)) expired++;
      else if (isExpiringSoon(exp, 30)) expiring++;
      else upToDate++;
    });
    return { upToDate, expiring, expired, total: vaccineKeys.length };
  }, [client?.vaccines]);

  if (!client) return null;

  const inlineUpdate = (field: string, value: any) => {
    updateClient(client.id, { [field]: value });
    toast.success('Atualizado!');
  };

  const handleDelete = () => {
    deleteClient(client.id);
    toast.success('Cliente removido');
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const openWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    const num = clean.startsWith('55') ? clean : `55${clean}`;
    window.open(`https://wa.me/${num}`, '_blank');
  };

  const siblings = clients.filter(c => c.id !== client.id && c.tutorName && c.tutorName === client.tutorName);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col overflow-hidden">
        {/* Profile Header */}
        <SheetHeader className="p-4 pb-3 border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-[68px] h-[68px] p-[6px]">
                <PhotoUpload
                  photo={client.photo}
                  onPhotoChange={(photo) => inlineUpdate('photo', photo)}
                  size="sm"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <SheetTitle className="text-lg truncate leading-tight">{client.name}</SheetTitle>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {client.breed && <span className="text-[11px] text-muted-foreground">🐕 {client.breed}</span>}
                {client.petSize && (
                  <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">{client.petSize}</span>
                )}
              </div>
              {client.tutorName && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-muted-foreground">👤 {client.tutorName}</span>
                  {client.tutorPhone && (
                    <button onClick={() => openWhatsApp(client.tutorPhone)}
                      className="text-[10px] text-[hsl(142,70%,40%)] bg-[hsl(142,70%,45%)]/10 px-1.5 py-0.5 rounded font-medium hover:bg-[hsl(142,70%,45%)]/20 transition-colors">
                      WhatsApp
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10 p-0 justify-start gap-0">
            {[
              { value: 'info', icon: User, label: 'Info' },
              { value: 'health', icon: Shield, label: 'Saúde', badge: healthSummary.expired + healthSummary.expiring },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1 text-xs h-10 relative">
                <tab.icon size={13} />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-1 right-1/4 min-w-[16px] h-4 text-[9px] font-bold rounded-full flex items-center justify-center px-1 bg-destructive text-destructive-foreground">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            {/* === INFO TAB === */}
            <TabsContent value="info" className="p-4 space-y-4 mt-0">
              {/* Pet Info */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Dog size={13} /> Pet
                </h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                  <InlineEditField icon={<Dog size={14} />} label="Nome" value={client.name} onSave={(v) => v && inlineUpdate('name', v)} placeholder="Nome do pet" />
                  {editingBreed ? (
                    <div className="p-2.5 bg-primary/5 animate-in fade-in duration-150">
                      <p className="text-[9px] text-primary uppercase tracking-wider font-medium mb-1 ml-7">Raça</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <BreedSelect value={client.breed} onChange={(v) => { inlineUpdate('breed', v); setEditingBreed(false); }} />
                        </div>
                        <button onClick={() => setEditingBreed(false)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg group cursor-pointer hover:bg-muted/30 transition-all"
                      onClick={() => setEditingBreed(true)}>
                      <span className="text-muted-foreground">🐕</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Raça</p>
                        <p className={cn("text-sm font-medium truncate", !client.breed && "text-muted-foreground/50 italic")}>
                          {client.breed || 'Toque para editar'}
                        </p>
                      </div>
                      <Pencil size={11} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                  )}
                  {/* Pet Size */}
                  <div className="flex items-center gap-3 p-2.5 group hover:bg-muted/30 transition-all">
                    <span className="text-muted-foreground">📏</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Porte</p>
                      <Select value={client.petSize || ''} onValueChange={(v) => inlineUpdate('petSize', v as PetSize)}>
                        <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0 w-auto">
                          <SelectValue placeholder="Selecionar porte" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['Pequeno', 'Médio', 'Grande', 'Gigante'] as PetSize[]).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Gender */}
                  <div className="flex items-center gap-3 p-2.5 group hover:bg-muted/30 transition-all">
                    <span className="text-muted-foreground">{client.gender === 'Fêmea' ? '♀' : '♂'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Gênero</p>
                      <Select value={client.gender || ''} onValueChange={(v) => inlineUpdate('gender', v as PetGender)}>
                        <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0 w-auto">
                          <SelectValue placeholder="Selecionar gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Macho">♂ Macho</SelectItem>
                          <SelectItem value="Fêmea">♀ Fêmea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Castrated */}
                  <div className="flex items-center gap-3 p-2.5 group hover:bg-muted/30 transition-all">
                    <span className="text-muted-foreground">✂️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Castrado(a)</p>
                      <p className="text-sm font-medium">{client.castrated ? 'Sim' : 'Não'}</p>
                    </div>
                    <Switch checked={client.castrated ?? false} onCheckedChange={(v) => inlineUpdate('castrated', v)} />
                  </div>
                  {/* Birth date */}
                  <div className="flex items-center gap-3 p-2.5 group hover:bg-muted/30 transition-all">
                    <span className="text-muted-foreground">🎂</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Nascimento</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-sm font-medium text-left hover:text-primary transition-colors">
                            {client.birthDate ? format(new Date(client.birthDate), "dd/MM/yyyy", { locale: ptBR }) : <span className="text-muted-foreground/50 italic">Selecionar data</span>}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={client.birthDate ? new Date(client.birthDate) : undefined}
                            onSelect={(d) => inlineUpdate('birthDate', d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tutor Info */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <User size={13} /> Tutor
                </h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                  <InlineEditField icon={<User size={14} />} label="Nome" value={client.tutorName} onSave={(v) => inlineUpdate('tutorName', v)} placeholder="Nome do tutor" />
                  <InlineEditField icon={<FileText size={14} />} label="CPF" value={client.tutorCpf || ''} onSave={(v) => inlineUpdate('tutorCpf', v)} placeholder="000.000.000-00" />
                  <InlineEditField
                    icon={<Phone size={14} />} label="Telefone" value={client.tutorPhone || ''} onSave={(v) => inlineUpdate('tutorPhone', v)} placeholder="(11) 99999-9999"
                    action={client.tutorPhone ? (
                      <button onClick={(e) => { e.stopPropagation(); openWhatsApp(client.tutorPhone); }}
                        className="text-[10px] font-medium text-[hsl(142,70%,40%)] bg-[hsl(142,70%,45%)]/10 px-2 py-1 rounded-md hover:bg-[hsl(142,70%,45%)]/20 transition-colors">
                        WhatsApp
                      </button>
                    ) : undefined}
                  />
                  <InlineEditField
                    icon={<Mail size={14} />} label="Email" value={client.tutorEmail || ''} onSave={(v) => inlineUpdate('tutorEmail', v)} placeholder="email@email.com" type="email"
                    action={client.tutorEmail ? (
                      <a href={`mailto:${client.tutorEmail}`} onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors">
                        Enviar
                      </a>
                    ) : undefined}
                  />
                  <InlineEditField icon={<MapPin size={14} />} label="Endereço" value={client.tutorAddress || ''} onSave={(v) => inlineUpdate('tutorAddress', v)} placeholder="Rua, número, complemento" />
                  <InlineEditField icon={<Home size={14} />} label="Bairro" value={client.tutorNeighborhood || ''} onSave={(v) => inlineUpdate('tutorNeighborhood', v)} placeholder="Bairro" />
                </div>
              </div>

              {/* Siblings */}
              {siblings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    🐾 Irmãos ({siblings.length})
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {siblings.map(s => (
                      <span key={s.id} className="text-xs bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 font-medium">
                        {s.photo ? <img src={s.photo} className="w-4 h-4 rounded-full inline mr-1.5" /> : null}
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Entry date */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  📅 Datas
                </h3>
                <div className="bg-muted/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs">📅</span>
                    <p className="text-[10px] text-muted-foreground">Entrada</p>
                  </div>
                  <p className="text-sm font-semibold">{formatDate(client.entryDate)}</p>
                </div>
              </div>

              {/* Danger zone */}
              <div className="pt-2 border-t border-border">
                <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 text-xs h-9"
                  onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 size={14} /> Remover Cliente
                </Button>
              </div>
            </TabsContent>

            {/* === HEALTH TAB === */}
            <TabsContent value="health" className="p-4 mt-0 space-y-4">
              <div className="flex gap-2">
                {[
                  { label: 'Em dia', count: healthSummary.upToDate, color: 'bg-[hsl(var(--status-ok-bg))] text-[hsl(var(--status-ok))]' },
                  { label: 'Vencendo', count: healthSummary.expiring, color: 'bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning))]' },
                  { label: 'Vencida', count: healthSummary.expired, color: 'bg-[hsl(var(--status-depleted-bg))] text-[hsl(var(--status-depleted))]' },
                ].map(s => (
                  <div key={s.label} className={cn("flex-1 rounded-lg p-2 text-center", s.color)}>
                    <p className="text-lg font-bold">{s.count}</p>
                    <p className="text-[9px] font-medium uppercase">{s.label}</p>
                  </div>
                ))}
              </div>
              <HealthHistorySection client={client} />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Delete Client Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover {client.name}?</AlertDialogTitle>
              <AlertDialogDescription>Essa ação é irreversível. Todos os dados e informações de saúde serão perdidos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};
