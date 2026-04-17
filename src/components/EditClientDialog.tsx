import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Client, PetSize, PetGender, Vaccines, VACCINE_LABELS, DEFAULT_VACCINES } from '@/types/client';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { CalendarIcon, Pencil, PawPrint, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PhotoUpload } from './PhotoUpload';
import { BreedSelect } from './BreedSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface EditClientDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditClientDialog: React.FC<EditClientDialogProps> = ({ client, open, onOpenChange }) => {
  const { updateClient } = useClients();

  const [tutorName, setTutorName] = useState(client.tutorName);
  const [tutorPhone, setTutorPhone] = useState(client.tutorPhone || '');
  const [tutorEmail, setTutorEmail] = useState(client.tutorEmail || '');
  const [tutorAddress, setTutorAddress] = useState(client.tutorAddress || '');
  const [tutorNeighborhood, setTutorNeighborhood] = useState(client.tutorNeighborhood || '');
  const [tutorCpf, setTutorCpf] = useState(client.tutorCpf || '');
  const [tutorPhoto, setTutorPhoto] = useState<string | undefined>(client.tutorPhoto);
  const [tutorBirthDate, setTutorBirthDate] = useState<Date | undefined>(client.tutorBirthDate ? new Date(client.tutorBirthDate) : undefined);
  const [name, setName] = useState(client.name);
  const [breed, setBreed] = useState(client.breed);
  const [petSize, setPetSize] = useState<PetSize | undefined>(client.petSize);
  const [photo, setPhoto] = useState<string | undefined>(client.photo);
  const [entryDate, setEntryDate] = useState<Date>(new Date(client.entryDate));
  const [birthDate, setBirthDate] = useState<Date | undefined>(client.birthDate ? new Date(client.birthDate) : undefined);
  const [vaccines, setVaccines] = useState<Vaccines>(client.vaccines || { ...DEFAULT_VACCINES });
  const [gender, setGender] = useState<PetGender | undefined>(client.gender);
  const [castrated, setCastrated] = useState(client.castrated ?? false);

  useEffect(() => {
    setTutorName(client.tutorName || '');
    setTutorPhone(client.tutorPhone || '');
    setTutorEmail(client.tutorEmail || '');
    setTutorAddress(client.tutorAddress || '');
    setTutorNeighborhood(client.tutorNeighborhood || '');
    setTutorCpf(client.tutorCpf || '');
    setTutorPhoto(client.tutorPhoto);
    setTutorBirthDate(client.tutorBirthDate ? new Date(client.tutorBirthDate) : undefined);
    setName(client.name);
    setBreed(client.breed || '');
    setPetSize(client.petSize);
    setPhoto(client.photo);
    setEntryDate(new Date(client.entryDate || new Date()));
    setBirthDate(client.birthDate ? new Date(client.birthDate) : undefined);
    setVaccines(client.vaccines || { ...DEFAULT_VACCINES });
    setGender(client.gender);
    setCastrated(client.castrated ?? false);
  }, [client]);

  const setVaccineDate = (key: keyof Vaccines, date: Date | undefined) => {
    setVaccines(prev => ({ ...prev, [key]: date ? date.toISOString() : null }));
  };

  const clearVaccineDate = (key: keyof Vaccines) => {
    setVaccines(prev => ({ ...prev, [key]: null }));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Nome não pode estar vazio');
      return;
    }
    updateClient(client.id, {
      tutorName: tutorName.trim(),
      tutorPhone: tutorPhone.trim(),
      tutorEmail: tutorEmail.trim(),
      tutorAddress: tutorAddress.trim(),
      tutorNeighborhood: tutorNeighborhood.trim(),
      tutorCpf: tutorCpf.trim(),
      tutorPhoto: tutorPhoto || undefined,
      tutorBirthDate,
      name: name.trim(),
      breed: breed.trim(),
      petSize,
      photo,
      entryDate,
      birthDate,
      vaccines,
      gender,
      castrated,
    });
    toast.success('Cliente atualizado com sucesso!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={18} />
            Editar Cliente
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pet" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="pet" className="gap-1 text-xs"><PawPrint size={12} /> Pet</TabsTrigger>
            <TabsTrigger value="tutor" className="gap-1 text-xs"><User size={12} /> Tutor</TabsTrigger>
          </TabsList>

          <TabsContent value="pet" className="space-y-4 mt-0">
            <div className="flex justify-center">
              <PhotoUpload photo={photo} onPhotoChange={setPhoto} size="lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Dog</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do pet" />
            </div>
            <div className="space-y-2">
              <Label>Raça</Label>
              <BreedSelect value={breed} onChange={setBreed} />
            </div>
            <div className="space-y-2">
              <Label>Porte</Label>
              <Select value={petSize || ''} onValueChange={(v) => setPetSize(v as PetSize || undefined)}>
                <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                <SelectContent>
                  {(['Pequeno', 'Médio', 'Grande', 'Gigante'] as PetSize[]).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select value={gender || ''} onValueChange={(v) => setGender(v as PetGender || undefined)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Macho">♂ Macho</SelectItem>
                    <SelectItem value="Fêmea">♀ Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Castrado(a)</Label>
                <div className="flex items-center h-10 gap-2">
                  <Switch checked={castrated} onCheckedChange={setCastrated} />
                  <span className="text-sm text-muted-foreground">{castrated ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !birthDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? format(birthDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={birthDate} onSelect={(d) => setBirthDate(d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data de Entrada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(entryDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={entryDate} onSelect={(d) => d && setEntryDate(d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            {/* Vacinas */}
            <div className="space-y-2">
              <Label>Vacinas e Antipulgas</Label>
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
            </div>
          </TabsContent>

          <TabsContent value="tutor" className="space-y-4 mt-0">
            <div className="flex justify-center">
              <PhotoUpload photo={tutorPhoto} onPhotoChange={setTutorPhoto} size="lg" />
            </div>
            <div className="space-y-2">
              <Label>Nome do Tutor</Label>
              <Input value={tutorName} onChange={(e) => setTutorName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={tutorCpf} onChange={(e) => setTutorCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={tutorPhone} onChange={(e) => setTutorPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} placeholder="email@email.com" type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={tutorAddress} onChange={(e) => setTutorAddress(e.target.value)} placeholder="Rua, número, complemento" />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={tutorNeighborhood} onChange={(e) => setTutorNeighborhood(e.target.value)} placeholder="Bairro" />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento do Tutor</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !tutorBirthDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tutorBirthDate ? format(tutorBirthDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={tutorBirthDate} onSelect={(d) => setTutorBirthDate(d)} initialFocus className="pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
