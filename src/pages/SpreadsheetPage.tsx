import React, { useState, useRef, useCallback } from 'react';
import { useClients } from '@/context/ClientContext';
import { Client, formatDate, Vaccines, VACCINE_LABELS, formatVaccineDate, DEFAULT_VACCINES, PetSize, PetGender } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, FileSpreadsheet, Search, X, Pencil, Trash2, Check, XCircle, Upload, CalendarIcon, QrCode, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { downloadCardForClient } from '@/components/qrcode/DogIdCard';

const VACCINE_KEYS = Object.keys(VACCINE_LABELS) as Array<keyof Vaccines>;

const SpreadsheetPage: React.FC = () => {
  const { clients, updateClient, deleteClient, importClients } = useClients();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedQrIds, setGeneratedQrIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    tutorName: string; tutorPhone: string; tutorEmail: string;
    tutorAddress: string; tutorNeighborhood: string; tutorCpf: string;
    name: string; breed: string; petSize?: PetSize; weight?: number;
    gender?: PetGender; castrated?: boolean; vaccines: Vaccines;
  }>({ tutorName: '', tutorPhone: '', tutorEmail: '', tutorAddress: '', tutorNeighborhood: '', tutorCpf: '', name: '', breed: '', petSize: undefined, weight: undefined, gender: undefined, castrated: false, vaccines: { ...DEFAULT_VACCINES } });

  const downloadQrForClient = useCallback((client: Client): Promise<void> => {
    return new Promise((resolve) => {
      const svgEl = document.querySelector(`[data-qr-id="${client.id}"] svg`);
      if (!svgEl) { resolve(); return; }
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(); return; }
      const qrSize = 200; const padding = 40; const textHeight = 80;
      canvas.width = qrSize + padding * 2;
      canvas.height = qrSize + padding * 2 + textHeight;
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding, qrSize, qrSize);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        const y = qrSize + padding + 20;
        ctx.fillText(`Tutor: ${client.tutorName}`, canvas.width / 2, y);
        ctx.fillText(`Dog: ${client.name}`, canvas.width / 2, y + 22);
        ctx.fillText(`Raça: ${client.breed || 'N/A'}`, canvas.width / 2, y + 44);
        const link = document.createElement('a');
        link.download = `qr_${client.name}_${client.tutorName}.png`.replace(/\s+/g, '_');
        link.href = canvas.toDataURL('image/png');
        link.click();
        setGeneratedQrIds(prev => new Set(prev).add(client.id));
        resolve();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  }, []);

  const generateAllQrCodes = useCallback(async () => {
    setGeneratingAll(true);
    const toGenerate = clients.filter(c => !generatedQrIds.has(c.id));
    if (toGenerate.length === 0) { toast.info('Todos os QR Codes já foram gerados!'); setGeneratingAll(false); return; }
    let count = 0;
    for (const client of toGenerate) {
      await new Promise(resolve => setTimeout(resolve, 400));
      await downloadQrForClient(client);
      count++;
    }
    toast.success(`${count} QR Code(s) baixado(s)!`);
    setGeneratingAll(false);
  }, [clients, generatedQrIds, downloadQrForClient]);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.tutorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.breed || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Tutor', 'Telefone', 'Email', 'CPF', 'Endereço', 'Bairro', 'Dog', 'Raça', 'Peso (kg)', 'Porte', 'Gênero', 'Castrado', 'Nascimento', 'Entrada', ...VACCINE_KEYS.map(k => VACCINE_LABELS[k])];
    const rows = clients.map(client => {
      const fleaInfo = client.fleaHistory?.length > 0 ? client.fleaHistory[0].brand : '';
      return [
        client.tutorName || '',
        client.tutorPhone || '',
        client.tutorEmail || '',
        client.tutorCpf || '',
        client.tutorAddress || '',
        client.tutorNeighborhood || '',
        client.name,
        client.breed || '',
        client.weight ? client.weight.toString().replace('.', ',') : '',
        client.petSize || '',
        client.gender || '',
        client.castrated ? 'Sim' : 'Não',
        client.birthDate ? format(new Date(client.birthDate), 'dd/MM/yyyy') : '',
        client.entryDate ? formatDate(client.entryDate) : '',
        ...VACCINE_KEYS.map(k => {
          if (k === 'antipulgas') {
            const val = client.vaccines?.[k];
            return val ? `${formatVaccineDate(val)}${fleaInfo ? ' (' + fleaInfo + ')' : ''}` : 'Não';
          }
          return client.vaccines?.[k] ? formatVaccineDate(client.vaccines[k]) : 'Não';
        }),
      ].join(';');
    });
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo exportado com sucesso!');
  };

  const parseDate = (str: string): Date | undefined => {
    if (!str) return undefined;
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) { toast.error('Arquivo CSV vazio ou inválido'); return; }
        const header = lines[0].toLowerCase();
        const separator = header.includes(';') ? ';' : ',';
        const headers = header.split(separator).map(h => h.trim());

        const findCol = (...terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));
        const nameIndex = findCol('dog', 'nome do dog', 'nome');
        const tutorIndex = findCol('tutor');
        const breedIndex = findCol('raça', 'raca');
        const petSizeIndex = findCol('porte');
        const phoneIndex = findCol('telefone', 'fone', 'celular');
        const emailIndex = findCol('email');
        const cpfIndex = findCol('cpf');
        const addressIndex = findCol('endereço', 'endereco');
        const neighborhoodIndex = findCol('bairro');
        const genderIndex = findCol('gênero', 'genero', 'sexo');
        const castratedIndex = findCol('castrad');
        const birthIndex = findCol('nascimento', 'aniversário', 'aniversario');
        const weightIndex = findCol('peso');

        if (nameIndex === -1) { toast.error('Coluna "Nome/Dog" não encontrada no CSV'); return; }

        let imported = 0, skipped = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
          const name = values[nameIndex];
          if (!name) continue;
          const tutorName = tutorIndex !== -1 ? values[tutorIndex] : '';
          const isDuplicate = clients.some(c =>
            c.name.toLowerCase() === name.toLowerCase() &&
            (!tutorName || !c.tutorName || c.tutorName.toLowerCase() === tutorName.toLowerCase())
          );
          if (isDuplicate) { skipped++; continue; }

          const phone = phoneIndex !== -1 ? values[phoneIndex] : '';
          const email = emailIndex !== -1 ? values[emailIndex] : '';
          const cpf = cpfIndex !== -1 ? values[cpfIndex] : '';
          const address = addressIndex !== -1 ? values[addressIndex] : '';
          const neighborhood = neighborhoodIndex !== -1 ? values[neighborhoodIndex] : '';
          const gender = genderIndex !== -1 ? values[genderIndex] : '';
          const castrated = castratedIndex !== -1 ? values[castratedIndex]?.toLowerCase() === 'sim' : false;
          const birthStr = birthIndex !== -1 ? values[birthIndex] : '';
          const breed = breedIndex !== -1 ? values[breedIndex] : '';
          const petSize = petSizeIndex !== -1 ? values[petSizeIndex] as PetSize : undefined;
          const weightStr = weightIndex !== -1 ? values[weightIndex] : '';
          const weight = weightStr ? parseFloat(weightStr.replace(',', '.')) : undefined;

          // Find existing tutor to copy info
          const existingTutor = tutorName ? clients.find(c => c.tutorName.toLowerCase() === tutorName.toLowerCase()) : null;

          const newClient: any = {
            name,
            tutorName: tutorName || '',
            tutorPhone: phone || existingTutor?.tutorPhone || '',
            tutorEmail: email || existingTutor?.tutorEmail || '',
            tutorCpf: cpf || existingTutor?.tutorCpf || '',
            tutorAddress: address || existingTutor?.tutorAddress || '',
            tutorNeighborhood: neighborhood || existingTutor?.tutorNeighborhood || '',
            breed: breed || '',
            petSize,
            weight,
            gender: (gender === 'Macho' || gender === 'Fêmea') ? gender as PetGender : undefined,
            castrated,
            birthDate: parseDate(birthStr),
          };

          // Parse vaccine dates from CSV
          const vaccines: any = { ...DEFAULT_VACCINES };
          VACCINE_KEYS.forEach(k => {
            const idx = headers.findIndex(h => h.includes(VACCINE_LABELS[k].toLowerCase()));
            if (idx !== -1 && values[idx] && values[idx] !== 'Não') {
              const cleanVal = values[idx].replace(/\s*\(.*\)/, '');
              const d = parseDate(cleanVal);
              if (d) vaccines[k] = d.toISOString();
            }
          });
          newClient.vaccines = vaccines;

          // Use addClient-like approach via importClients
          importClients([newClient]);
          imported++;
        }

        if (imported === 0) {
          toast.error(skipped > 0 ? `${skipped} duplicado(s) ignorado(s). Nenhum novo.` : 'Nenhum cliente válido encontrado.');
        } else {
          toast.success(skipped > 0 ? `${imported} importado(s), ${skipped} duplicado(s) ignorado(s).` : `${imported} cliente(s) importado(s)!`);
        }
      } catch { toast.error('Erro ao processar arquivo CSV'); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setEditForm({
      tutorName: client.tutorName || '', tutorPhone: client.tutorPhone || '',
      tutorEmail: client.tutorEmail || '', tutorAddress: client.tutorAddress || '',
      tutorNeighborhood: client.tutorNeighborhood || '', tutorCpf: client.tutorCpf || '',
      name: client.name, breed: client.breed || '', petSize: client.petSize,
      weight: client.weight, gender: client.gender, castrated: client.castrated,
      vaccines: client.vaccines || { ...DEFAULT_VACCINES },
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (client: Client) => {
    updateClient(client.id, {
      tutorName: editForm.tutorName.trim(), tutorPhone: editForm.tutorPhone.trim(),
      tutorEmail: editForm.tutorEmail.trim(), tutorAddress: editForm.tutorAddress.trim(),
      tutorNeighborhood: editForm.tutorNeighborhood.trim(), tutorCpf: editForm.tutorCpf.trim(),
      name: editForm.name.trim() || client.name, breed: editForm.breed.trim(),
      petSize: editForm.petSize, weight: editForm.weight, gender: editForm.gender,
      castrated: editForm.castrated, vaccines: editForm.vaccines,
    });
    setEditingId(null);
    toast.success('Cliente atualizado!');
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === filteredClients.length ? new Set() : new Set(filteredClients.map(c => c.id)));
  };
  const deleteSelected = () => {
    selectedIds.forEach(id => deleteClient(id));
    toast.success(`${selectedIds.size} cliente(s) removido(s)`);
    setSelectedIds(new Set());
  };

  const setEditVaccineDate = (key: keyof Vaccines, date: Date | undefined) => {
    setEditForm(prev => ({ ...prev, vaccines: { ...prev.vaccines, [key]: date ? date.toISOString() : null } }));
  };

  const VaccineDateCell = ({ vaccineKey }: { vaccineKey: keyof Vaccines }) => {
    const val = editForm.vaccines[vaccineKey];
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-7 text-xs w-24", !val && "text-muted-foreground")}>
            <CalendarIcon className="mr-1 h-3 w-3" />
            {val ? format(new Date(val), "dd/MM/yy", { locale: ptBR }) : '—'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={val ? new Date(val) : undefined} onSelect={(d) => setEditVaccineDate(vaccineKey, d)} initialFocus className="pointer-events-auto" locale={ptBR} />
          {val && (
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={() => setEditVaccineDate(vaccineKey, undefined)}>Limpar</Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const VaccineIndicator = ({ value }: { value: string | null }) => (
    <div className="flex justify-center">
      {value ? (
        <span className="text-xs text-[hsl(var(--status-ok))] font-medium">{format(new Date(value), "dd/MM/yy")}</span>
      ) : (
        <span className="text-xs text-destructive font-bold">✗</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6 max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-primary" size={28} />
            <h1 className="text-2xl font-bold text-foreground">Planilha</h1>
            <span className="text-sm text-muted-foreground">({clients.length} clientes)</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" className="gap-2" onClick={deleteSelected}>
                <Trash2 size={16} /> Excluir ({selectedIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={generateAllQrCodes} disabled={generatingAll}>
              <QrCode size={16} />
              {generatingAll ? 'Gerando...' : `Gerar Todos QR (${clients.filter(c => !generatedQrIds.has(c.id)).length})`}
            </Button>
            <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Importar CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportToCSV}>
              <Download size={16} /> Exportar CSV
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-3 mb-4 shadow-soft">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por tutor, dog ou raça..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </Button>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead className="w-10 p-2">
                    <input type="checkbox" checked={selectedIds.size === filteredClients.length && filteredClients.length > 0} onChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="font-semibold text-xs p-2">QR</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Tutor</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Telefone</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Email</TableHead>
                  <TableHead className="font-semibold text-xs p-2">CPF</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Endereço</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Bairro</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Dog</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Raça</TableHead>
                  <TableHead className="font-semibold text-xs p-2 text-right">Peso</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Porte</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Gênero</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Castrado</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Nascimento</TableHead>
                  <TableHead className="font-semibold text-xs p-2">Entrada</TableHead>
                  {VACCINE_KEYS.map(k => (
                    <TableHead key={k} className="font-semibold text-xs p-2 text-center">{VACCINE_LABELS[k]}</TableHead>
                  ))}
                  <TableHead className="font-semibold text-xs p-2 text-center w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => {
                    const isEditing = editingId === client.id;
                    const qrValue = `Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`;
                    const isQrGenerated = generatedQrIds.has(client.id);
                    return (
                      <TableRow key={client.id} className="hover:bg-muted/30">
                        <TableCell className="p-2">
                          <input type="checkbox" checked={selectedIds.has(client.id)} onChange={() => toggleSelect(client.id)} />
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex flex-col items-center gap-1">
                            <div data-qr-id={client.id} className="w-10 h-10">
                              <QRCodeSVG value={qrValue} size={40} level="L" />
                            </div>
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon"
                                className={cn("h-6 w-6", isQrGenerated ? "text-[hsl(var(--status-ok))]" : "text-primary")}
                                onClick={() => downloadQrForClient(client)}
                                title={isQrGenerated ? "QR já baixado" : "Baixar QR Code"}>
                                {isQrGenerated ? <Check size={12} /> : <Download size={12} />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-primary"
                                onClick={() => { downloadCardForClient(client); toast.success(`Carteirinha de ${client.name} baixada!`); }}
                                title="Baixar Carteirinha">
                                <CreditCard size={12} />
                              </Button>
                            </div>
                            <div data-card-qr={client.id} className="hidden">
                              <QRCodeSVG value={qrValue} size={200} level="M" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? <Input value={editForm.tutorName} onChange={(e) => setEditForm({ ...editForm, tutorName: e.target.value })} className="h-7 text-sm w-24" /> : <span className="text-sm text-muted-foreground">{client.tutorName || '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? <Input value={editForm.tutorPhone} onChange={(e) => setEditForm({ ...editForm, tutorPhone: e.target.value })} className="h-7 text-sm w-28" /> : <span className="text-sm text-muted-foreground">{client.tutorPhone || '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? <Input value={editForm.tutorEmail} onChange={(e) => setEditForm({ ...editForm, tutorEmail: e.target.value })} className="h-7 text-sm w-32" /> : <span className="text-sm text-muted-foreground">{client.tutorEmail || '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? <Input value={editForm.tutorCpf} onChange={(e) => setEditForm({ ...editForm, tutorCpf: e.target.value })} className="h-7 text-sm w-28" /> : <span className="text-sm text-muted-foreground">{client.tutorCpf || '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2 max-w-[150px]">
                          {isEditing ? <Input value={editForm.tutorAddress} onChange={(e) => setEditForm({ ...editForm, tutorAddress: e.target.value })} className="h-7 text-sm w-36" /> : <span className="text-sm text-muted-foreground break-words line-clamp-2">{client.tutorAddress || '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? <Input value={editForm.tutorNeighborhood} onChange={(e) => setEditForm({ ...editForm, tutorNeighborhood: e.target.value })} className="h-7 text-sm w-24" /> : <span className="text-sm text-muted-foreground">{client.tutorNeighborhood || '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-7 text-sm w-24" /> : <span className="font-medium text-sm">{client.name}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? <Input value={editForm.breed} onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })} className="h-7 text-sm w-24" /> : <span className="text-sm text-muted-foreground">{client.breed || '—'}</span>}
                        </TableCell>
                        <TableCell className="text-right p-2">
                          {isEditing ? <Input type="number" step="0.1" value={editForm.weight ?? ''} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value ? parseFloat(e.target.value) : undefined })} className="h-7 text-sm w-16" /> : <span className="text-sm text-muted-foreground">{client.weight ? client.weight.toFixed(1).replace('.', ',') : '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? (
                            <Select value={editForm.petSize || ''} onValueChange={(v) => setEditForm({ ...editForm, petSize: (v || undefined) as PetSize })}>
                              <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                {(['Pequeno', 'Médio', 'Grande', 'Gigante'] as PetSize[]).map(s => (
                                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : <span className="text-sm text-muted-foreground">{client.petSize || '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2">
                          {isEditing ? (
                            <Select value={editForm.gender || ''} onValueChange={(v) => setEditForm({ ...editForm, gender: (v || undefined) as PetGender })}>
                              <SelectTrigger className="h-7 text-xs w-20"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Macho" className="text-xs">♂ Macho</SelectItem>
                                <SelectItem value="Fêmea" className="text-xs">♀ Fêmea</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : <span className="text-sm text-muted-foreground">{client.gender ? (client.gender === 'Macho' ? '♂' : '♀') : '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2 text-center">
                          {isEditing ? (
                            <input type="checkbox" checked={editForm.castrated ?? false} onChange={(e) => setEditForm({ ...editForm, castrated: e.target.checked })} />
                          ) : <span className="text-sm">{client.castrated ? '✓' : '—'}</span>}
                        </TableCell>
                        <TableCell className="p-2 text-sm text-muted-foreground">
                          {client.birthDate ? format(new Date(client.birthDate), 'dd/MM/yy') : '—'}
                        </TableCell>
                        <TableCell className="text-right p-2 text-muted-foreground text-sm">
                          {client.entryDate ? formatDate(client.entryDate) : '—'}
                        </TableCell>
                        {isEditing ? (
                          VACCINE_KEYS.map(key => (
                            <TableCell key={key} className="p-2"><VaccineDateCell vaccineKey={key} /></TableCell>
                          ))
                        ) : (
                          VACCINE_KEYS.map(key => (
                            <TableCell key={key} className="p-2"><VaccineIndicator value={client.vaccines?.[key] || null} /></TableCell>
                          ))
                        )}
                        <TableCell className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(var(--status-ok))] hover:bg-[hsl(var(--status-ok))]/10" onClick={() => saveEdit(client)}>
                                  <Check size={14} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={cancelEdit}>
                                  <XCircle size={14} />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => startEdit(client)}>
                                  <Pencil size={14} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => { deleteClient(client.id); toast.success('Cliente removido'); }}>
                                  <Trash2 size={14} />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={17 + VACCINE_KEYS.length} className="text-center py-8 text-muted-foreground text-sm">
                      {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetPage;