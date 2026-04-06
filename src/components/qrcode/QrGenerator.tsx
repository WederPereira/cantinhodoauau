import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import logoSrc from '@/assets/logo-cantinho.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { QrCode, Download, UserPlus } from 'lucide-react';
import { BreedSelect } from '@/components/BreedSelect';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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
            <BreedSelect value={manualBreed} onChange={setManualBreed} />
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
              <div className="relative">
                <QRCodeCanvas
                  value={`Tutor: ${generated.tutor}\nDog: ${generated.dog}\nRaça: ${generated.breed || 'N/A'}`}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-full p-1">
                    <img src={logoSrc} alt="Logo" className="w-10 h-10 rounded-full" />
                  </div>
                </div>
              </div>
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

export default QrGenerator;
