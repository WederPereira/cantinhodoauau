import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PetSize, DEFAULT_VACCINES, Vaccines, VACCINE_LABELS } from '@/types/client';
import { useClients } from '@/context/ClientContext';
import { Plus, PawPrint, CalendarIcon, User } from 'lucide-react';
import { toast } from 'sonner';
import { PhotoUpload } from './PhotoUpload';
import { BreedSelect } from './BreedSelect';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [vaccines, setVaccines] = useState<Vaccines>({ ...DEFAULT_VACCINES });
  const { addClient } = useClients();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Preencha o nome do pet');
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
              <div className="space-y-2">
                <Label>Porte</Label>
                <Select value={petSize || ''} onValueChange={(v) => setPetSize(v as PetSize || undefined)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                  <SelectContent>
                    {(['Pequeno', 'Médio', 'Grande', 'Gigante'] as PetSize[]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label>Nome do Tutor</Label>
                <Input value={tutorName} onChange={(e) => setTutorName(e.target.value)} placeholder="Nome completo" className="h-11" />
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
            <Button type="submit" className="flex-1">Adicionar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
