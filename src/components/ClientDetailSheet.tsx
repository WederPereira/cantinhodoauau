import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSensitiveData } from '@/hooks/useSensitiveData';
import { Button } from '@/components/ui/button';
import { Client, PetSize, PetGender, formatDate, VACCINE_LABELS, Vaccines, formatVaccineDate, getVaccineExpiryDate, isExpired, isExpiringSoon, VaccineType, DEFAULT_VACCINES, getProfileCompleteness } from '@/types/client';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { Trash2, Pencil, Dog, Heart, User, MapPin, Phone, Mail, FileText, Home, X, Shield, AlertCircle } from 'lucide-react';
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

interface MissingField {
  label: string;
  field: string;
  type: 'text' | 'select' | 'date' | 'toggle' | 'breed' | 'number';
}

export const ClientDetailSheet: React.FC<ClientDetailSheetProps> = ({ client, open, onOpenChange }) => {
  const { clients, deleteClient, updateClient } = useClients();
  const { maskCpf, maskPhone, maskEmail, maskAddress, canSeeSensitive } = useSensitiveData();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [editingBreed, setEditingBreed] = useState(false);
  const [fillingField, setFillingField] = useState<string | null>(null);

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

  const missingFields = useMemo((): MissingField[] => {
    if (!client) return [];
    const missing: MissingField[] = [];
    if (!client.tutorName) missing.push({ label: 'Tutor', field: 'tutorName', type: 'text' });
    if (!client.breed) missing.push({ label: 'Raça', field: 'breed', type: 'breed' });
    if (!client.petSize) missing.push({ label: 'Porte', field: 'petSize', type: 'select' });
    if (!client.gender) missing.push({ label: 'Gênero', field: 'gender', type: 'select' });
    if (client.castrated === undefined || client.castrated === null) missing.push({ label: 'Castrado', field: 'castrated', type: 'toggle' });
    if (!client.birthDate) missing.push({ label: 'Nascimento', field: 'birthDate', type: 'date' });
    if (!client.weight) missing.push({ label: 'Peso', field: 'weight', type: 'number' });
    if (!client.tutorPhone) missing.push({ label: 'Telefone', field: 'tutorPhone', type: 'text' });
    if (!client.tutorEmail) missing.push({ label: 'Email', field: 'tutorEmail', type: 'text' });
    if (!client.tutorCpf) missing.push({ label: 'CPF', field: 'tutorCpf', type: 'text' });
    if (!client.tutorAddress) missing.push({ label: 'Endereço', field: 'tutorAddress', type: 'text' });
    return missing;
  }, [client]);

  const completeness = useMemo(() => client ? getProfileCompleteness(client) : null, [client]);

  if (!client) return null;

  const inlineUpdate = async (field: string, value: any) => {
    await updateClient(client.id, { [field]: value });
    toast.success('Atualizado!');
    setFillingField(null);
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

  const handleFillField = (field: MissingField) => {
    if (field.type === 'breed') {
      setEditingBreed(true);
      setActiveTab('info');
    } else if (field.type === 'toggle') {
      inlineUpdate(field.field, false);
    } else {
      setFillingField(field.field);
      setActiveTab('info');
    }
  };

  const completenessColor = completeness?.level === 'complete'
    ? 'text-[hsl(142,70%,40%)]'
    : completeness?.level === 'partial'
      ? 'text-[hsl(45,93%,37%)]'
      : 'text-destructive';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col overflow-hidden">
        {/* Profile Header */}
        <SheetHeader className="p-4 pb-3 border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0 overflow-visible">
              <div className="w-[72px] h-[72px] p-[4px]">
                <PhotoUpload
                  photo={client.photo}
                  onPhotoChange={(photo) => inlineUpdate('photo', photo)}
                  size="sm"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg truncate leading-tight">{client.name}</SheetTitle>
                {completeness && (
                  <span className={cn("text-[10px] font-bold", completenessColor)}>
                    {completeness.percent}%
                  </span>
                )}
              </div>
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

        {/* Missing Fields Alert */}
        {missingFields.length > 0 && (
          <div className="px-4 pt-3">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {missingFields.length} dado(s) faltando
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingFields.map(field => (
                  <button
                    key={field.field}
                    onClick={() => handleFillField(field)}
                    className="text-[10px] font-medium bg-amber-200/50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-md hover:bg-amber-300/50 dark:hover:bg-amber-800/50 transition-colors border border-amber-300/50 dark:border-amber-700/50"
                  >
                    + {field.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
              {/* Quick fill dialogs */}
              {fillingField === 'tutorName' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">👤 Nome do Tutor</p>
                  <InlineEditField icon={<User size={14} />} label="" value="" onSave={(v) => { inlineUpdate('tutorName', v); }} placeholder="Nome completo" />
                </div>
              )}
              {fillingField === 'tutorPhone' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">📞 Telefone do Tutor</p>
                  <InlineEditField icon={<Phone size={14} />} label="" value="" onSave={(v) => { inlineUpdate('tutorPhone', v); }} placeholder="(11) 99999-9999" />
                </div>
              )}
              {fillingField === 'tutorEmail' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">📧 Email do Tutor</p>
                  <InlineEditField icon={<Mail size={14} />} label="" value="" onSave={(v) => { inlineUpdate('tutorEmail', v); }} placeholder="email@email.com" type="email" />
                </div>
              )}
              {fillingField === 'tutorCpf' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">📄 CPF do Tutor</p>
                  <InlineEditField icon={<FileText size={14} />} label="" value="" onSave={(v) => { inlineUpdate('tutorCpf', v); }} placeholder="000.000.000-00" />
                </div>
              )}
              {fillingField === 'tutorAddress' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">📍 Endereço do Tutor</p>
                  <InlineEditField icon={<MapPin size={14} />} label="" value="" onSave={(v) => { inlineUpdate('tutorAddress', v); }} placeholder="Rua, número, complemento" />
                </div>
              )}
              {fillingField === 'weight' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">⚖️ Peso do Pet</p>
                  <InlineEditField icon={<Dog size={14} />} label="" value="" onSave={(v) => { inlineUpdate('weight', parseFloat(v) || undefined); }} placeholder="Ex: 12.5" />
                </div>
              )}
              {fillingField === 'petSize' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">📏 Porte do Pet</p>
                  <div className="flex gap-2">
                    {(['Pequeno', 'Médio', 'Grande', 'Gigante'] as PetSize[]).map(s => (
                      <button key={s} onClick={() => inlineUpdate('petSize', s)} className="flex-1 py-2 px-1 rounded-lg border border-border text-xs font-medium hover:bg-primary/10 hover:border-primary transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {fillingField === 'gender' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">Gênero do Pet</p>
                  <div className="flex gap-2">
                    <button onClick={() => inlineUpdate('gender', 'Macho')} className="flex-1 py-2 px-3 rounded-lg border border-border text-sm font-medium hover:bg-primary/10 hover:border-primary transition-colors">♂ Macho</button>
                    <button onClick={() => inlineUpdate('gender', 'Fêmea')} className="flex-1 py-2 px-3 rounded-lg border border-border text-sm font-medium hover:bg-primary/10 hover:border-primary transition-colors">♀ Fêmea</button>
                  </div>
                </div>
              )}
              {fillingField === 'birthDate' && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in">
                  <p className="text-[10px] text-primary font-medium mb-1">🎂 Data de Nascimento</p>
                  <Calendar mode="single" selected={undefined} onSelect={(d) => { if (d) inlineUpdate('birthDate', d); }} className="pointer-events-auto mx-auto" locale={ptBR} />
                </div>
              )}

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
                  <InlineEditField icon={<span className="text-muted-foreground">⚖️</span>} label="Peso (kg)" value={client.weight?.toString() || ''} onSave={(v) => inlineUpdate('weight', parseFloat(v) || undefined)} placeholder="Ex: 12.5" />
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
                  <div className="flex items-center gap-3 p-2.5 group hover:bg-muted/30 transition-all">
                    <span className="text-muted-foreground">✂️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Castrado(a)</p>
                      <p className="text-sm font-medium">{client.castrated ? 'Sim' : 'Não'}</p>
                    </div>
                    <Switch checked={client.castrated ?? false} onCheckedChange={(v) => inlineUpdate('castrated', v)} />
                  </div>
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
                  <InlineEditField icon={<User size={14} />} label="Nome" value={client.tutorName} onSave={canSeeSensitive ? (v) => inlineUpdate('tutorName', v) : undefined} placeholder="Nome do tutor" />
                  {canSeeSensitive ? (
                    <InlineEditField icon={<FileText size={14} />} label="CPF" value={client.tutorCpf || ''} onSave={(v) => inlineUpdate('tutorCpf', v)} placeholder="000.000.000-00" />
                  ) : (
                    <div className="flex items-center gap-3 p-2.5">
                      <FileText size={14} className="text-muted-foreground" />
                      <div className="flex-1"><p className="text-[9px] text-muted-foreground uppercase tracking-wider">CPF</p><p className="text-sm font-medium text-muted-foreground">{maskCpf(client.tutorCpf)}</p></div>
                    </div>
                  )}
                  {canSeeSensitive ? (
                    <InlineEditField
                      icon={<Phone size={14} />} label="Telefone" value={client.tutorPhone || ''} onSave={(v) => inlineUpdate('tutorPhone', v)} placeholder="(11) 99999-9999"
                      action={client.tutorPhone ? (
                        <button onClick={(e) => { e.stopPropagation(); openWhatsApp(client.tutorPhone); }}
                          className="text-[10px] font-medium text-[hsl(142,70%,40%)] bg-[hsl(142,70%,45%)]/10 px-2 py-1 rounded-md hover:bg-[hsl(142,70%,45%)]/20 transition-colors">
                          WhatsApp
                        </button>
                      ) : undefined}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-2.5">
                      <Phone size={14} className="text-muted-foreground" />
                      <div className="flex-1"><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Telefone</p><p className="text-sm font-medium text-muted-foreground">{maskPhone(client.tutorPhone)}</p></div>
                    </div>
                  )}
                  {canSeeSensitive ? (
                    <InlineEditField
                      icon={<Mail size={14} />} label="Email" value={client.tutorEmail || ''} onSave={(v) => inlineUpdate('tutorEmail', v)} placeholder="email@email.com" type="email"
                      action={client.tutorEmail ? (
                        <a href={`mailto:${client.tutorEmail}`} onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors">
                          Enviar
                        </a>
                      ) : undefined}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-2.5">
                      <Mail size={14} className="text-muted-foreground" />
                      <div className="flex-1"><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Email</p><p className="text-sm font-medium text-muted-foreground">{maskEmail(client.tutorEmail)}</p></div>
                    </div>
                  )}
                  {canSeeSensitive ? (
                    <InlineEditField icon={<MapPin size={14} />} label="Endereço" value={client.tutorAddress || ''} onSave={(v) => inlineUpdate('tutorAddress', v)} placeholder="Rua, número, complemento" />
                  ) : (
                    <div className="flex items-center gap-3 p-2.5">
                      <MapPin size={14} className="text-muted-foreground" />
                      <div className="flex-1"><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Endereço</p><p className="text-sm font-medium text-muted-foreground">{maskAddress(client.tutorAddress)}</p></div>
                    </div>
                  )}
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-sm font-semibold text-left hover:text-primary transition-colors">
                        {formatDate(client.entryDate)}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={new Date(client.entryDate)}
                        onSelect={(d) => { if (d) inlineUpdate('entryDate', d); }} initialFocus className="pointer-events-auto" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover {client.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados deste cliente serão removidos.
              </AlertDialogDescription>
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
