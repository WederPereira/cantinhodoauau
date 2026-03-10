import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/context/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  QrCode, Camera, History, Search, Download, UserPlus, Dog, CheckCircle2, XCircle, Volume2
} from 'lucide-react';
import { BreedSelect } from '@/components/BreedSelect';
import { formatDate } from '@/types/client';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// === QR Generator Sub-component ===
const QrGenerator: React.FC = () => {
  const { clients } = useClients();
  const [mode, setMode] = useState<'client' | 'manual'>('client');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [manualTutor, setManualTutor] = useState('');
  const [manualDog, setManualDog] = useState('');
  const [manualBreed, setManualBreed] = useState('');
  const [generated, setGenerated] = useState<{ tutor: string; dog: string; breed: string } | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleGenerate = () => {
    if (mode === 'client' && selectedClient) {
      setGenerated({ tutor: selectedClient.tutorName, dog: selectedClient.name, breed: selectedClient.breed });
    } else if (mode === 'manual' && manualTutor.trim() && manualDog.trim()) {
      setGenerated({ tutor: manualTutor.trim(), dog: manualDog.trim(), breed: manualBreed.trim() });
    } else {
      toast.error('Preencha tutor e nome do cão');
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !generated) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const padding = 40;
      const textHeight = 80;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + textHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const y = img.height + padding + 20;
      ctx.fillText(`Tutor: ${generated.tutor}`, canvas.width / 2, y);
      ctx.fillText(`Dog: ${generated.dog}`, canvas.width / 2, y + 22);
      ctx.fillText(`Raça: ${generated.breed || 'N/A'}`, canvas.width / 2, y + 44);

      const link = document.createElement('a');
      link.download = `qr_${generated.dog}_${generated.tutor}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR Code baixado!');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === 'client' ? 'default' : 'outline'} size="sm" onClick={() => setMode('client')}>
          <UserPlus size={16} className="mr-1" /> Cliente cadastrado
        </Button>
        <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setMode('manual')}>
          <QrCode size={16} className="mr-1" /> Manual
        </Button>
      </div>

      {mode === 'client' ? (
        <div className="space-y-3">
          <Label>Selecionar Cliente</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger><SelectValue placeholder="Escolha um pet..." /></SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} — {c.tutorName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>Nome do Tutor</Label>
            <Input value={manualTutor} onChange={e => setManualTutor(e.target.value)} placeholder="Nome do tutor" />
          </div>
          <div>
            <Label>Nome do Cão</Label>
            <Input value={manualDog} onChange={e => setManualDog(e.target.value)} placeholder="Nome do cão" />
          </div>
          <div>
            <Label>Raça</Label>
            <BreedSelect value={manualBreed} onValueChange={setManualBreed} />
          </div>
        </div>
      )}

      <Button onClick={handleGenerate} className="w-full">
        <QrCode size={18} className="mr-2" /> Gerar QR Code
      </Button>

      {generated && (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center p-6 gap-4">
            <div ref={qrRef}>
              <QRCodeSVG
                value={`Tutor: ${generated.tutor}\nDog: ${generated.dog}\nRaça: ${generated.breed || 'N/A'}`}
                size={200}
                level="H"
              />
            </div>
            <div className="text-center text-sm space-y-0.5">
              <p><strong>Tutor:</strong> {generated.tutor}</p>
              <p><strong>Dog:</strong> {generated.dog}</p>
              <p><strong>Raça:</strong> {generated.breed || 'N/A'}</p>
            </div>
            <Button variant="outline" onClick={handleDownload}>
              <Download size={16} className="mr-2" /> Baixar QR Code
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// === QR Reader Sub-component ===
const QrReader: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [lastRead, setLastRead] = useState<{ tutor: string; dog: string; raca: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastQrRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* no audio */ }
  }, []);

  const parseQr = (text: string): { tutor: string; dog: string; raca: string } | null => {
    const lines = text.split('\n');
    const obj: any = {};
    lines.forEach(l => {
      const [key, ...rest] = l.split(':');
      if (key && rest.length) {
        const k = key.trim().toLowerCase();
        const v = rest.join(':').trim();
        if (k === 'tutor') obj.tutor = v;
        if (k === 'dog') obj.dog = v;
        if (k === 'raça' || k === 'raca') obj.raca = v;
      }
    });
    return obj.tutor && obj.dog ? { tutor: obj.tutor, dog: obj.dog, raca: obj.raca || '' } : null;
  };

  const saveEntry = async (data: { tutor: string; dog: string; raca: string }) => {
    setSaving(true);
    const { error } = await supabase.from('qr_entries' as any).insert({
      tutor: data.tutor,
      dog: data.dog,
      raca: data.raca,
      data_hora: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar entrada');
      console.error(error);
    } else {
      toast.success(`✅ Entrada registrada: ${data.dog}`);
    }
  };

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (decodedText === lastQrRef.current) return;
          lastQrRef.current = decodedText;
          const parsed = parseQr(decodedText);
          if (parsed) {
            playBeep();
            setLastRead(parsed);
            saveEntry(parsed);
            // Reset duplicate prevention after 5s
            setTimeout(() => { lastQrRef.current = ''; }, 5000);
          }
        },
        () => { /* ignore errors */ }
      );
      setScanning(true);
    } catch (err) {
      toast.error('Não foi possível acessar a câmera');
      console.error(err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanning(); };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!scanning ? (
          <Button onClick={startScanning} className="w-full">
            <Camera size={18} className="mr-2" /> Iniciar Câmera
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopScanning} className="w-full">
            <XCircle size={18} className="mr-2" /> Parar Câmera
          </Button>
        )}
      </div>

      <div
        id="qr-reader-container"
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-border bg-muted min-h-[300px]"
      />

      {lastRead && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={20} className="text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">QR Code Lido!</span>
              <Volume2 size={16} className="text-green-600" />
            </div>
            <div className="text-sm space-y-1">
              <p><strong>Tutor:</strong> {lastRead.tutor}</p>
              <p><strong>Dog:</strong> {lastRead.dog}</p>
              <p><strong>Raça:</strong> {lastRead.raca || 'N/A'}</p>
            </div>
            {saving && <p className="text-xs text-muted-foreground mt-2">Salvando entrada...</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// === History Sub-component ===
const QrHistory: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('qr_entries' as any)
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(200);
    if (error) {
      toast.error('Erro ao carregar histórico');
      console.error(error);
    } else {
      setEntries((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const filtered = entries.filter(e => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (e.tutor || '').toLowerCase().includes(s) ||
      (e.dog || '').toLowerCase().includes(s) ||
      (e.raca || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por tutor, cão ou raça..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchEntries}>
          Atualizar
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History size={14} />
        <span>{filtered.length} registros encontrados</span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma entrada registrada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card key={entry.id} className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <Dog size={14} className="text-primary" />
                      {entry.dog}
                    </p>
                    <p className="text-xs text-muted-foreground">Tutor: {entry.tutor}</p>
                    {entry.raca && (
                      <Badge variant="secondary" className="text-[10px] mt-1">{entry.raca}</Badge>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{new Date(entry.data_hora).toLocaleDateString('pt-BR')}</p>
                    <p>{new Date(entry.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// === Main Page ===
const QrCodePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <QrCode size={24} className="text-primary" />
            QR Code
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gere, leia e registre entradas de cães
          </p>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="generate" className="gap-1 text-xs sm:text-sm">
              <QrCode size={14} />
              <span className="hidden sm:inline">Gerar</span>
              <span className="sm:hidden">Gerar</span>
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-1 text-xs sm:text-sm">
              <Camera size={14} />
              <span className="hidden sm:inline">Leitor</span>
              <span className="sm:hidden">Ler</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm">
              <History size={14} />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-4">
            <QrGenerator />
          </TabsContent>
          <TabsContent value="read" className="mt-4">
            <QrReader />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <QrHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QrCodePage;
