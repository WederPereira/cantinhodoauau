import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/context/ClientContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Download, Upload, Loader2, Trash2, HardDrive, Clock, FolderOpen, RefreshCw, Save
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BackupEntry {
  name: string;
  created_at: string;
  metadata: { size: number } | null;
}

const BACKUP_BUCKET = 'edfe';
const BACKUP_PREFIX = 'backups/';

const BackupManager: React.FC = () => {
  const { clients } = useClients();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list(BACKUP_PREFIX.slice(0, -1), { sortBy: { column: 'created_at', order: 'desc' } });
    if (data) {
      setBackups(data.filter(f => f.name.endsWith('.json')).map(f => ({
        name: f.name,
        created_at: f.created_at || '',
        metadata: f.metadata as any,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const collectAllData = async () => {
    // Clients from localStorage
    const clientsData = JSON.parse(localStorage.getItem('pet-grooming-clients') || '[]');

    // Hotel stays
    const { data: hotelStays } = await supabase.from('hotel_stays').select('*');
    const { data: hotelMeals } = await supabase.from('hotel_meals').select('*');
    const { data: hotelMeds } = await supabase.from('hotel_medications').select('*');

    // Daycare
    const { data: qrEntries } = await supabase.from('qr_entries').select('*');
    const { data: dailyRecords } = await supabase.from('daily_records').select('*');

    // Taxi
    const taxiList = JSON.parse(localStorage.getItem('taxi-dog-list') || '[]');

    return {
      version: '1.0',
      created_at: new Date().toISOString(),
      clients: clientsData,
      hotel_stays: hotelStays || [],
      hotel_meals: hotelMeals || [],
      hotel_medications: hotelMeds || [],
      qr_entries: qrEntries || [],
      daily_records: dailyRecords || [],
      taxi_list: taxiList,
    };
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const data = await collectAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const fileName = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;

      const { error } = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(`${BACKUP_PREFIX}${fileName}`, blob, { upsert: true });

      if (error) throw error;
      toast.success('Backup criado com sucesso!');
      fetchBackups();
    } catch (e: any) {
      toast.error('Erro ao criar backup: ' + e.message);
    }
    setCreating(false);
  };

  const restoreBackup = async (name: string) => {
    setRestoring(name);
    try {
      const { data, error } = await supabase.storage
        .from(BACKUP_BUCKET)
        .download(`${BACKUP_PREFIX}${name}`);
      if (error) throw error;

      const text = await data.text();
      const backup = JSON.parse(text);

      // Restore clients to localStorage
      if (backup.clients) {
        localStorage.setItem('pet-grooming-clients', JSON.stringify(backup.clients));
      }

      // Restore taxi
      if (backup.taxi_list) {
        localStorage.setItem('taxi-dog-list', JSON.stringify(backup.taxi_list));
      }

      toast.success('Backup restaurado! Recarregando a página...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error('Erro ao restaurar: ' + e.message);
    }
    setRestoring(null);
  };

  const deleteBackup = async (name: string) => {
    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .remove([`${BACKUP_PREFIX}${name}`]);
    if (error) {
      toast.error('Erro ao apagar backup');
    } else {
      toast.success('Backup apagado');
      fetchBackups();
    }
  };

  const downloadBackup = async (name: string) => {
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(`${BACKUP_PREFIX}${name}`);
    if (error) { toast.error('Erro ao baixar'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.clients && !parsed.version) {
        toast.error('Arquivo de backup inválido');
        return;
      }
      // Upload to storage
      const { error } = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(`${BACKUP_PREFIX}${file.name}`, file, { upsert: true });
      if (error) throw error;
      toast.success('Backup carregado!');
      fetchBackups();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    e.target.value = '';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Auto-backup: check if last backup was > 24h ago
  useEffect(() => {
    const lastAutoBackup = localStorage.getItem('last-auto-backup');
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (!lastAutoBackup || now - parseInt(lastAutoBackup) > oneDayMs) {
      // Auto backup
      (async () => {
        try {
          const data = await collectAllData();
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const fileName = `auto_${format(new Date(), 'yyyy-MM-dd')}.json`;
          await supabase.storage
            .from(BACKUP_BUCKET)
            .upload(`${BACKUP_PREFIX}${fileName}`, blob, { upsert: true });
          localStorage.setItem('last-auto-backup', now.toString());
        } catch {}
      })();
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" /> Backups
          </CardTitle>
          <CardDescription className="text-xs">
            Backup automático diário · {backups.length} backup(s) salvos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={createBackup} disabled={creating} className="flex-1" size="sm">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Criar Backup
            </Button>
            <Button variant="outline" size="sm" className="relative" asChild>
              <label className="cursor-pointer flex items-center gap-1">
                <Upload className="w-4 h-4" />
                Carregar
                <input type="file" accept=".json" onChange={handleUploadBackup} className="sr-only" />
              </label>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchBackups}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Backup List */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-6">
              <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum backup encontrado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {backups.map(backup => {
                const isAuto = backup.name.startsWith('auto_');
                return (
                  <div
                    key={backup.name}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground truncate">{backup.name}</p>
                        {isAuto && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">Auto</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {backup.created_at ? format(new Date(backup.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : '—'}
                        </span>
                        <span>{formatSize(backup.metadata?.size || 0)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => downloadBackup(backup.name)}
                        title="Baixar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => restoreBackup(backup.name)}
                        disabled={restoring === backup.name}
                        title="Restaurar"
                      >
                        {restoring === backup.name ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteBackup(backup.name)}
                        title="Apagar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManager;
