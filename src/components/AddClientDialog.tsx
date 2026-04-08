import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PetSize, PetGender, DEFAULT_VACCINES, Vaccines, VACCINE_LABELS } from '@/types/client';
import { useClients } from '@/context/ClientContext';
import { Plus, PawPrint, CalendarIcon, User } from 'lucide-react';
import { toast } from 'sonner';
import { PhotoUpload } from './PhotoUpload';
import { BreedSelect } from './BreedSelect';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface AddClientDialogProps {
  trigger?: React.ReactNode;
}

export const AddClientDialog: React.FC<AddClientDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const [tutorName, setTutorName] = useState('');
  const [tutorPhone, setTutorPhone] = useState('');
  const [tutorEmail, setTutorEmail] = useState('');
  const [tutorAddress, setTutorAddress] = useState('');
  const [tutorNeighborhood, setTutorNeighborhood] = useState('');
  const [tutorCpf, setTutorCpf] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [petSize, setPetSize] = useState<PetSize | undefined>(undefined);
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [gender, setGender] = useState<PetGender | undefined>(undefined);
  const [castrated, setCastrated] = useState(false);
  const [vaccines, setVaccines] = useState<Vaccines>({ ...DEFAULT_VACCINES });
  const { clients, addClient } = useClients();

  // Get unique tutor names for auto-fill
  const tutorOptions = useMemo(() => {
    const tutors = new Map<string, typeof clients[0]>();
    clients.forEach(c => {
      if (c.tutorName && !tutors.has(c.tutorName.toLowerCase())) {
        tutors.set(c.tutorName.toLowerCase(), c);
      }
    });
    return Array.from(tutors.values());
  }, [clients]);

  const handleTutorSelect = (selectedTutor: typeof clients[0]) => {
    setTutorName(selectedTutor.tutorName);
    setTutorPhone(selectedTutor.tutorPhone || '');
    setTutorEmail(selectedTutor.tutorEmail || '');
    setTutorAddress(selectedTutor.tutorAddress || '');
    setTutorNeighborhood(selectedTutor.tutorNeighborhood || '');
    setTutorCpf(selectedTutor.tutorCpf || '');
    toast.success(`Dados do tutor ${selectedTutor.tutorName} preenchidos!`);
  };

  const filteredTutors = useMemo(() => {
    if (!tutorName.trim()) return [];
    return tutorOptions.filter(c =>
      c.tutorName.toLowerCase().includes(tutorName.toLowerCase()) &&
      c.tutorName.toLowerCase() !== tutorName.toLowerCase()
    ).slice(0, 5);
  }, [tutorName, tutorOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Preencha o nome do pet');
      return;
    }

    if (photoUploading) {
      toast.error('Aguarde o envio da foto terminar');
      return;
    }

    addClient({
      tutorName: tutorName.trim(),
      tutorPhone: tutorPhone.trim(),
      tutorEmail: tutorEmail.trim(),
      tutorAddress: tutorAddress.trim(),
      tutorNeighborhood: tutorNeighborhood.trim(),
      tutorCpf: tutorCpf.trim(),
      name: name.trim(),
      breed: breed.trim(),
      petSize,
      photo,
      vaccines,
      birthDate,
      gender,
      castrated,
    });
    toast.success(`${name} adicionado com sucesso!`);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setTutorName(''); setTutorPhone(''); setTutorEmail('');
    setTutorAddress(''); setTutorNeighborhood(''); setTutorCpf('');
    setName(''); setBreed(''); setPetSize(undefined); setBirthDate(undefined);
    setPhoto(undefined); setVaccines({ ...DEFAULT_VACCINES });
    setGender(undefined); setCastrated(false);
  };

  const setVaccineDate = (key: keyof Vaccines, date: Date | undefined) => {
    setVaccines(prev => ({ ...prev, [key]: date ? date.toISOString() : null }));
  };

  const clearVaccineDate = (key: keyof Vaccines) => {
    setVaccines(prev => ({ ...prev, [key]: null }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus size={18} />
            Novo Cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <PawPrint size={18} className="text-primary" />
            </div>
            Novo Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="pet" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="pet" className="gap-1 text-xs"><PawPrint size={12} /> Pet</TabsTrigger>
              <TabsTrigger value="tutor" className="gap-1 text-xs"><User size={12} /> Tutor</TabsTrigger>
              <TabsTrigger value="health" className="gap-1 text-xs">❤️ Saúde</TabsTrigger>
            </TabsList>

            <TabsContent value="pet" className="space-y-4 mt-0">
              <div className="flex justify-center">
                <PhotoUpload photo={photo} onPhotoChange={setPhoto} size="lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Dog *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Thor, Luna, Max..." className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Raça</Label>
                <BreedSelect value={breed} onChange={setBreed} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Porte</Label>
                  <Select value={petSize || ''} onValueChange={(v) => setPetSize(v as PetSize || undefined)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(['Pequeno', 'Médio', 'Grande', 'Gigante'] as PetSize[]).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select value={gender || ''} onValueChange={(v) => setGender(v as PetGender || undefined)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Macho">♂ Macho</SelectItem>
                      <SelectItem value="Fêmea">♀ Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <Label htmlFor="castrated" className="text-sm cursor-pointer">Castrado(a)?</Label>
                <Switch id="castrated" checked={castrated} onCheckedChange={setCastrated} />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !birthDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(birthDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={birthDate} onSelect={(d) => setBirthDate(d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="tutor" className="space-y-4 mt-0">
              <div className="space-y-2 relative">
                <Label>Nome do Tutor</Label>
                <Input value={tutorName} onChange={(e) => setTutorName(e.target.value)} placeholder="Nome completo" className="h-11" />
                {filteredTutors.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-lg mt-1 overflow-hidden">
                    <p className="text-[10px] text-muted-foreground px-3 py-1.5 bg-muted/50">Tutores existentes — clique para preencher</p>
                    {filteredTutors.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex items-center gap-2 transition-colors"
                        onClick={() => handleTutorSelect(t)}
                      >
                        <User size={12} className="text-muted-foreground" />
                        <span className="font-medium">{t.tutorName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">({clients.filter(c => c.tutorName === t.tutorName).length} dogs)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={tutorCpf} onChange={(e) => setTutorCpf(e.target.value)} placeholder="000.000.000-00" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={tutorPhone} onChange={(e) => setTutorPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} placeholder="email@email.com" type="email" className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={tutorAddress} onChange={(e) => setTutorAddress(e.target.value)} placeholder="Rua, número, complemento" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={tutorNeighborhood} onChange={(e) => setTutorNeighborhood(e.target.value)} placeholder="Bairro" className="h-11" />
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground">Registre as datas das últimas vacinas e antipulgas.</p>
              <div className="space-y-2">
                {(Object.keys(VACCINE_LABELS) as Array<keyof Vaccines>).map((key) => (
                  <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="text-sm w-24">{VACCINE_LABELS[key]}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left text-xs h-8", !vaccines[key] && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {vaccines[key] ? format(new Date(vaccines[key]!), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={vaccines[key] ? new Date(vaccines[key]!) : undefined} onSelect={(d) => setVaccineDate(key, d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                    {vaccines[key] && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => clearVaccineDate(key)}>✗</Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t border-border mt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); setOpen(false); }}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={photoUploading}>
              {photoUploading ? 'Enviando foto...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};