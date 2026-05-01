import React, { useMemo, useState } from 'react';
import { Client } from '@/types/client';
import { Cake, ChevronLeft, ChevronRight, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PetPhotoFrame } from '@/components/PetPhotoFrame';
import { Badge } from '@/components/ui/badge';
import { getMonth, differenceInYears } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface BirthdaySectionProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const BirthdaySection: React.FC<BirthdaySectionProps> = ({ clients, onClientClick }) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonth(today));
  const [showMissing, setShowMissing] = useState(false);
  const { toast } = useToast();

  const birthdayClients = useMemo(() => {
    return clients
      .filter(c => c.birthDate && getMonth(new Date(c.birthDate)) === selectedMonth)
      .sort((a, b) => new Date(a.birthDate!).getDate() - new Date(b.birthDate!).getDate());
  }, [clients, selectedMonth]);

  const totalWithBirthday = useMemo(() => clients.filter(c => c.birthDate).length, [clients]);
  const missingBirthday = useMemo(() => clients.filter(c => !c.birthDate), [clients]);

  const navigateMonth = (dir: number) => {
    setSelectedMonth(prev => {
      let m = prev + dir;
      if (m < 0) m = 11;
      if (m > 11) m = 0;
      return m;
    });
  };

  const isCurrentMonth = selectedMonth === getMonth(today);

  const handleCopyNames = () => {
    if (birthdayClients.length === 0) return;
    const names = birthdayClients.map(c => c.name).join(', ');
    navigator.clipboard.writeText(names);
    toast({ title: "Copiado!", description: `${birthdayClients.length} nome(s) copiado(s).` });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Cake size={18} className="text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Aniversariantes 🎂</h3>
              {birthdayClients.length > 0 && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyNames} title="Copiar nomes">
                  <Copy size={14} className="text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{totalWithBirthday} com data · {missingBirthday.length} sem data</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs font-medium text-foreground min-w-[80px] text-center">
            {MONTH_NAMES[selectedMonth]}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {birthdayClients.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">
            {totalWithBirthday === 0
              ? 'Cadastre a data de nascimento dos pets para ver aniversariantes'
              : `Nenhum pet faz aniversário em ${MONTH_NAMES[selectedMonth]}`}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {birthdayClients.map(client => {
            const birth = new Date(client.birthDate!);
            const age = differenceInYears(today, birth);
            const isBirthdayToday = isCurrentMonth && birth.getDate() === today.getDate();
            return (
              <div key={client.id} onClick={() => onClientClick(client)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={client.photo} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{client.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Dia {birth.getDate()} • {age > 0 ? `${age} ano${age > 1 ? 's' : ''}` : 'Menos de 1 ano'}
                  </p>
                </div>
                {isBirthdayToday && (
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Hoje! 🎉</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dogs without birth date */}
      {missingBirthday.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={() => setShowMissing(!showMissing)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <AlertCircle size={12} />
            <span>{missingBirthday.length} pet(s) sem data de nascimento</span>
            <Badge variant="outline" className="text-[8px] ml-auto">{showMissing ? 'Ocultar' : 'Mostrar'}</Badge>
          </button>
          {showMissing && (
            <div className="space-y-1 mt-2 max-h-[200px] overflow-y-auto pr-1">
              {missingBirthday.map(client => (
                <div key={client.id} onClick={() => onClientClick(client)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={client.photo} />
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{client.tutorName}</p>
                  </div>
                  <span className="text-[9px] text-destructive">Sem data</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {birthdayClients.length} aniversariante{birthdayClients.length !== 1 ? 's' : ''} em {MONTH_NAMES[selectedMonth]}
        </p>
      </div>
    </div>
  );
};
