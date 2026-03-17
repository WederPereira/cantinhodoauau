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
import * as XLSX from 'xlsx';

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
    tutorAddress: string; tutorCpf: string;
    name: string; breed: string; petSize?: PetSize; weight?: number;
    gender?: PetGender; castrated?: boolean; vaccines: Vaccines;
    birthDate?: Date; entryDate?: Date;
  }>({ tutorName: '', tutorPhone: '', tutorEmail: '', tutorAddress: '', tutorCpf: '', name: '', breed: '', petSize: undefined, weight: undefined, gender: undefined, castrated: false, vaccines: { ...DEFAULT_VACCINES }, birthDate: undefined, entryDate: undefined });

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
    const headers = ['Tutor', 'Telefone', 'Email', 'CPF', 'Endereço', 'Dog', 'Raça', 'Peso (kg)', 'Porte', 'Gênero', 'Castrado', 'Nascimento', 'Entrada', ...VACCINE_KEYS.map(k => VACCINE_LABELS[k])];
    const rows = clients.map(client => {
      const fleaInfo = client.fleaHistory?.length > 0 ? client.fleaHistory[0].brand : '';
      return [
        client.tutorName || '', client.tutorPhone || '', client.tutorEmail || '',
        client.tutorCpf || '', client.tutorAddress || '',
        client.name, client.breed || '',
        client.weight ? client.weight.toString().replace('.', ',') : '',
        client.petSize || '', client.gender || '',
        client.castrated ? 'Sim' : 'Não',
        client.birthDate ? format(new Date(client.birthDate), 'dd/MM/yyyy') : '',
        client.entryDate ? format(new Date(client.entryDate), 'dd/MM/yyyy') : '',
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
    const clean = str.replace(/[()]/g, '').trim();
    if (!clean) return undefined;
    const parts = clean.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const processImportRows = (rows: Record<string, string>[]) => {
    if (rows.length === 0) { toast.error('Nenhum dado encontrado no arquivo'); return; }

    const findCol = (row: Record<string, string>, ...terms: string[]): string => {
      const keys = Object.keys(row);
      for (const term of terms) {
        const found = keys.find(k => k.toLowerCase().includes(term.toLowerCase()));
        if (found) return row[found] || '';
      }
      return '';
    };

    let imported = 0, skipped = 0;
    for (const row of rows) {
      const name = findCol(row, 'dog', 'nome do dog', 'nome do pet', 'nome');
      if (!name) continue;
      const tutorName = findCol(row, 'tutor');
      const isDuplicate = clients.some(c =>
        c.name.toLowerCase() === name.toLowerCase() &&
        (!tutorName || !c.tutorName || c.tutorName.toLowerCase() === tutorName.toLowerCase())
      );
      if (isDuplicate) { skipped++; continue; }

      const phone = findCol(row, 'telefone', 'fone', 'celular');
      const email = findCol(row, 'email');
      const cpf = findCol(row, 'cpf');
      const address = findCol(row, 'endereço', 'endereco');
      const gender = findCol(row, 'gênero', 'genero', 'sexo');
      const castratedVal = findCol(row, 'castrad');
      const castrated = castratedVal.toLowerCase() === 'sim';
      const birthStr = findCol(row, 'nascimento', 'aniversário', 'aniversario');
      const entryStr = findCol(row, 'entrada');
      const breed = findCol(row, 'raça', 'raca');
      const petSizeStr = findCol(row, 'porte');
      const petSize = (['Pequeno', 'Médio', 'Grande', 'Gigante'].includes(petSizeStr) ? petSizeStr : undefined) as PetSize | undefined;
      const weightStr = findCol(row, 'peso');
      const weight = weightStr ? parseFloat(weightStr.replace(',', '.')) : undefined;

      const existingTutor = tutorName ? clients.find(c => c.tutorName.toLowerCase() === tutorName.toLowerCase()) : null;

      const newClient: any = {
        name,
        tutorName: tutorName || '',
        tutorPhone: phone || existingTutor?.tutorPhone || '',
        tutorEmail: email || existingTutor?.tutorEmail || '',
        tutorCpf: cpf || existingTutor?.tutorCpf || '',
        tutorAddress: address || existingTutor?.tutorAddress || '',
        breed: breed || '',
        petSize,
        weight,
        gender: (gender === 'Macho' || gender === 'Fêmea') ? gender as PetGender : undefined,
        castrated,
        birthDate: parseDate(birthStr),
        entryDate: parseDate(entryStr),
      };

      const vaccines: any = { ...DEFAULT_VACCINES };
      VACCINE_KEYS.forEach(k => {
        const val = findCol(row, VACCINE_LABELS[k].toLowerCase());
        if (val && val !== 'Não') {
          const cleanVal = val.replace(/\s*\(.*\)/, '');
          const d = parseDate(cleanVal);
          if (d) vaccines[k] = d.toISOString();
        }
      });
      newClient.vaccines = vaccines;

      importClients([newClient]);
      imported++;
    }

    if (imported === 0) {
      toast.error(skipped > 0 ? `${skipped} duplicado(s) ignorado(s). Nenhum novo.` : 'Nenhum cliente válido encontrado.');
    } else {
      toast.success(skipped > 0 ? `${imported} importado(s), ${skipped} duplicado(s) ignorado(s).` : `${imported} cliente(s) importado(s)!`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv' || ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) { toast.error('Arquivo vazio ou inválido'); return; }
          const separator = lines[0].includes(';') ? ';' : ',';
          const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
          const rows = lines.slice(1).map(line => {
            const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h] = values[i] || ''; });
            return row;
          });
          processImportRows(rows);
        } catch { toast.error('Erro ao processar arquivo'); }
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
          processImportRows(rows);
        } catch (err) {
          console.error(err);
          toast.error('Erro ao processar planilha');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Formato não suportado. Use CSV, XLSX, XLS ou ODS.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setEditForm({
      tutorName: client.tutorName || '', tutorPhone: client.tutorPhone || '',
      tutorEmail: client.tutorEmail || '', tutorAddress: client.tutorAddress || '',
      tutorCpf: client.tutorCpf || '',
      name: client.name, breed: client.breed || '', petSize: client.petSize,
      weight: client.weight, gender: client.gender, castrated: client.castrated,
      vaccines: client.vaccines || { ...DEFAULT_VACCINES },
      birthDate: client.birthDate ? new Date(client.birthDate) : undefined,
      entryDate: client.entryDate ? new Date(client.entryDate) : undefined,
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (client: Client) => {
    updateClient(client.id, {
      tutorName: editForm.tutorName.trim(), tutorPhone: editForm.tutorPhone.trim(),
      tutorEmail: editForm.tutorEmail.trim(), tutorAddress: editForm.tutorAddress.trim(),
      tutorCpf: editForm.tutorCpf.trim(),
      name: editForm.name.trim() || client.name, breed: editForm.breed.trim(),
      petSize: editForm.petSize, weight: editForm.weight, gender: editForm.gender,
      castrated: editForm.castrated, vaccines: editForm.vaccines,
      birthDate: editForm.birthDate, entryDate: editForm.entryDate || client.entryDate,
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

  const DateEditCell = ({ value, onChange }: { value?: Date; onChange: (d: Date | undefined) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-7 text-xs w-24", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-1 h-3 w-3" />
          {value ? format(value, "dd/MM/yy", { locale: ptBR }) : '—'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={(d) => onChange(d || undefined)} initialFocus className="pointer-events-auto" locale={ptBR} />
        {value && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs text-destructive" onClick={() => onChange(undefined)}>Limpar</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-full">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-primary" size={24} />
            <h1 className="text-xl font-bold text-foreground">Planilha</h1>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{clients.length}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" className="gap-1.5 h-8 text-xs" onClick={deleteSelected}>
                <Trash2 size={14} /> Excluir ({selectedIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={generateAllQrCodes} disabled={generatingAll}>
              <QrCode size={14} />
              {generatingAll ? 'Gerando...' : `QR (${clients.filter(c => !generatedQrIds.has(c.id)).length})`}
            </Button>
            <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls,.ods,.txt" onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Importar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={exportToCSV}>
              <Download size={14} /> CSV
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-2 max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar tutor, dog ou raça..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* Table with proper scroll */}
      <div className="flex-1 overflow-auto relative">
        <Table className="text-xs">
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-muted border-b-2 border-border">
              <TableHead className="w-8 p-1.5 sticky left-0 z-30 bg-muted">
                <input type="checkbox" checked={selectedIds.size === filteredClients.length && filteredClients.length > 0} onChange={toggleSelectAll} className="rounded" />
              </TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted">QR</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted min-w-[120px]">Tutor</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted min-w-[110px]">Telefone</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted min-w-[140px]">Email</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted min-w-[110px]">CPF</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted min-w-[160px]">Endereço</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted min-w-[100px]">Dog</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted min-w-[100px]">Raça</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted text-right w-16">Peso</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted w-20">Porte</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted w-16">Gênero</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted w-16 text-center">Cast.</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted w-20">Nasc.</TableHead>
              <TableHead className="p-1.5 text-[11px] font-bold bg-muted w-20">Entrada</TableHead>
              {VACCINE_KEYS.map(k => (
                <TableHead key={k} className="p-1.5 text-[11px] font-bold bg-muted text-center w-20">{VACCINE_LABELS[k]}</TableHead>
              ))}
              <TableHead className="p-1.5 text-[11px] font-bold text-center w-16 sticky right-0 z-30 bg-muted shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const isEditing = editingId === client.id;
                const qrValue = `Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`;
                const isQrGenerated = generatedQrIds.has(client.id);
                return (
                  <TableRow key={client.id} className={cn("hover:bg-muted/40 transition-colors", isEditing && "bg-primary/5")}>
                    <TableCell className="p-1.5 sticky left-0 z-10 bg-card">
                      <input type="checkbox" checked={selectedIds.has(client.id)} onChange={() => toggleSelect(client.id)} className="rounded" />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <div className="flex items-center gap-0.5">
                        <div data-qr-id={client.id} className="w-8 h-8">
                          <QRCodeSVG value={qrValue} size={32} level="L" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <Button variant="ghost" size="icon"
                            className={cn("h-5 w-5", isQrGenerated ? "text-[hsl(var(--status-ok))]" : "text-primary")}
                            onClick={() => downloadQrForClient(client)}>
                            {isQrGenerated ? <Check size={10} /> : <Download size={10} />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-primary"
                            onClick={() => { downloadCardForClient(client); toast.success(`Carteirinha baixada!`); }}>
                            <CreditCard size={10} />
                          </Button>
                        </div>
                        <div data-card-qr={client.id} className="hidden">
                          <QRCodeSVG value={qrValue} size={200} level="M" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? <Input value={editForm.tutorName} onChange={(e) => setEditForm({ ...editForm, tutorName: e.target.value })} className="h-6 text-xs w-28" /> : <span className="text-muted-foreground truncate block max-w-[140px]">{client.tutorName || '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? <Input value={editForm.tutorPhone} onChange={(e) => setEditForm({ ...editForm, tutorPhone: e.target.value })} className="h-6 text-xs w-28" /> : <span className="text-muted-foreground">{client.tutorPhone || '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? <Input value={editForm.tutorEmail} onChange={(e) => setEditForm({ ...editForm, tutorEmail: e.target.value })} className="h-6 text-xs w-32" /> : <span className="text-muted-foreground truncate block max-w-[160px]">{client.tutorEmail || '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? <Input value={editForm.tutorCpf} onChange={(e) => setEditForm({ ...editForm, tutorCpf: e.target.value })} className="h-6 text-xs w-28" /> : <span className="text-muted-foreground">{client.tutorCpf || '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? <Input value={editForm.tutorAddress} onChange={(e) => setEditForm({ ...editForm, tutorAddress: e.target.value })} className="h-6 text-xs w-36" /> : <span className="text-muted-foreground truncate block max-w-[180px]" title={client.tutorAddress}>{client.tutorAddress || '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-6 text-xs w-24" /> : <span className="font-semibold text-foreground">{client.name}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? <Input value={editForm.breed} onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })} className="h-6 text-xs w-24" /> : <span className="text-muted-foreground">{client.breed || '—'}</span>}
                    </TableCell>
                    <TableCell className="text-right p-1.5">
                      {isEditing ? <Input type="number" step="0.1" value={editForm.weight ?? ''} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value ? parseFloat(e.target.value) : undefined })} className="h-6 text-xs w-14" /> : <span className="text-muted-foreground">{client.weight ? client.weight.toFixed(1).replace('.', ',') : '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? (
                        <Select value={editForm.petSize || ''} onValueChange={(v) => setEditForm({ ...editForm, petSize: (v || undefined) as PetSize })}>
                          <SelectTrigger className="h-6 text-xs w-20"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {(['Pequeno', 'Médio', 'Grande', 'Gigante'] as PetSize[]).map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : <span className="text-muted-foreground">{client.petSize || '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? (
                        <Select value={editForm.gender || ''} onValueChange={(v) => setEditForm({ ...editForm, gender: (v || undefined) as PetGender })}>
                          <SelectTrigger className="h-6 text-xs w-16"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Macho" className="text-xs">♂</SelectItem>
                            <SelectItem value="Fêmea" className="text-xs">♀</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <span className="text-muted-foreground">{client.gender ? (client.gender === 'Macho' ? '♂' : '♀') : '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5 text-center">
                      {isEditing ? (
                        <input type="checkbox" checked={editForm.castrated ?? false} onChange={(e) => setEditForm({ ...editForm, castrated: e.target.checked })} className="rounded" />
                      ) : <span>{client.castrated ? '✓' : '—'}</span>}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? (
                        <DateEditCell value={editForm.birthDate} onChange={(d) => setEditForm(prev => ({ ...prev, birthDate: d }))} />
                      ) : (
                        <span className="text-muted-foreground">{client.birthDate ? format(new Date(client.birthDate), 'dd/MM/yy') : '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="p-1.5">
                      {isEditing ? (
                        <DateEditCell value={editForm.entryDate} onChange={(d) => setEditForm(prev => ({ ...prev, entryDate: d }))} />
                      ) : (
                        <span className="text-muted-foreground">{client.entryDate ? format(new Date(client.entryDate), 'dd/MM/yy') : '—'}</span>
                      )}
                    </TableCell>
                    {isEditing ? (
                      VACCINE_KEYS.map(key => (
                        <TableCell key={key} className="p-1.5"><VaccineDateCell vaccineKey={key} /></TableCell>
                      ))
                    ) : (
                      VACCINE_KEYS.map(key => (
                        <TableCell key={key} className="p-1.5"><VaccineIndicator value={client.vaccines?.[key] || null} /></TableCell>
                      ))
                    )}
                    <TableCell className="p-1.5 sticky right-0 z-10 bg-card shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-center gap-0.5">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(var(--status-ok))] hover:bg-[hsl(var(--status-ok))]/10" onClick={() => saveEdit(client)}>
                              <Check size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={cancelEdit}>
                              <XCircle size={12} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={() => startEdit(client)}>
                              <Pencil size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => { deleteClient(client.id); toast.success('Removido'); }}>
                              <Trash2 size={12} />
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
                <TableCell colSpan={16 + VACCINE_KEYS.length} className="text-center py-12 text-muted-foreground">
                  {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SpreadsheetPage;
