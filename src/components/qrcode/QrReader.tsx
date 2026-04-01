import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { logAction } from '@/hooks/useActionLog';

const QrReader: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [lastRead, setLastRead] = useState<{ tutor: string; dog: string; raca: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
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

  const playErrorBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 300;
      osc.type = 'square';
      gain.gain.value = 0.2;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
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

  const checkDuplicateToday = async (dog: string, tutor: string): Promise<boolean> => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('qr_entries')
      .select('id')
      .eq('dog', dog)
      .eq('tutor', tutor)
      .gte('data_hora', today.toISOString())
      .lt('data_hora', tomorrow.toISOString())
      .limit(1);

    if (error) return false;
    return (data && data.length > 0);
  };

  const saveEntry = async (data: { tutor: string; dog: string; raca: string }) => {
    setSaving(true);
    setDuplicateMessage(null);

    // Check if already read today
    const isDuplicate = await checkDuplicateToday(data.dog, data.tutor);
    if (isDuplicate) {
      setSaving(false);
      setDuplicateMessage(`${data.dog} já foi registrado(a) hoje!`);
      playErrorBeep();
      toast.warning(`⚠️ ${data.dog} já foi registrado(a) hoje!`);
      return;
    }

    const { error, data: newEntry } = await supabase.from('qr_entries').insert({
      tutor: data.tutor,
      dog: data.dog,
      raca: data.raca,
      data_hora: new Date().toISOString(),
    }).select('id').single();
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar entrada');
      console.error(error);
    } else {
      logAction('qr_read', 'daycare', newEntry?.id, { dog_name: data.dog, tutor_name: data.tutor, raca: data.raca });
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
            setDuplicateMessage(null);
            saveEntry(parsed);
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

      {duplicateMessage && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle size={20} className="text-yellow-600" />
              <span className="font-semibold text-yellow-700 dark:text-yellow-400">{duplicateMessage}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {lastRead && !duplicateMessage && (
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

export default QrReader;
