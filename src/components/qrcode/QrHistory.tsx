import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { History, Search, Dog, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface QrEntry {
  id: string;
  tutor: string;
  dog: string;
  raca: string;
  data_hora: string;
}

const QrHistory: React.FC = () => {
  const [entries, setEntries] = useState<QrEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('qr_entries')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(200);
    if (error) {
      toast.error('Erro ao carregar histórico');
      console.error(error);
    } else {
      setEntries((data as QrEntry[]) || []);
    }
    setLoading(false);
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from('qr_entries').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao apagar entrada');
      console.error(error);
    } else {
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success('Entrada removida!');
    }
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
                  <div className="flex items-start gap-2">
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{new Date(entry.data_hora).toLocaleDateString('pt-BR')}</p>
                      <p>{new Date(entry.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Apagar entrada?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remover a entrada de <strong>{entry.dog}</strong> ({new Date(entry.data_hora).toLocaleDateString('pt-BR')})? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Apagar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

export default QrHistory;
