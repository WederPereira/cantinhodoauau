import React, { useState } from 'react';
import { BathServiceType, PetSize, BATH_SERVICE_PRICES } from '@/types/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/types/client';

const STORAGE_KEY = 'bath-custom-prices';
const SERVICE_TYPES: BathServiceType[] = ['Banho', 'Banho + Tosa', 'Tosa Higiênica', 'Hidratação', 'Banho + Hidratação', 'Banho + Tosa + Hidratação'];
const PET_SIZES: PetSize[] = ['Pequeno', 'Médio', 'Grande', 'Gigante'];

export function loadCustomPrices(): Record<BathServiceType, Record<PetSize, number>> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  return { ...BATH_SERVICE_PRICES };
}

function savePrices(prices: Record<BathServiceType, Record<PetSize, number>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
}

const BathPriceTable: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState(() => loadCustomPrices());
  const [editing, setEditing] = useState(false);

  const handleChange = (service: BathServiceType, size: PetSize, value: string) => {
    const num = parseFloat(value.replace(',', '.')) || 0;
    setPrices(prev => ({
      ...prev,
      [service]: { ...prev[service], [size]: num },
    }));
  };

  const handleSave = () => {
    savePrices(prices);
    setEditing(false);
    toast.success('Tabela de preços atualizada!');
  };

  const handleCancel = () => {
    setPrices(loadCustomPrices());
    setEditing(false);
  };

  const handleReset = () => {
    setPrices({ ...BATH_SERVICE_PRICES });
    savePrices({ ...BATH_SERVICE_PRICES });
    setEditing(false);
    toast.success('Preços restaurados para o padrão');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 size={14} />
          Tabela de Preços
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 size={18} className="text-primary" />
            Tabela de Preços por Serviço e Porte
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Serviço</TableHead>
                {PET_SIZES.map(size => (
                  <TableHead key={size} className="font-semibold text-xs text-center">{size}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SERVICE_TYPES.map(service => (
                <TableRow key={service}>
                  <TableCell className="text-sm font-medium py-2">{service}</TableCell>
                  {PET_SIZES.map(size => (
                    <TableCell key={size} className="text-center py-2">
                      {editing ? (
                        <Input
                          value={prices[service][size]}
                          onChange={e => handleChange(service, size, e.target.value)}
                          className="h-8 w-20 text-sm text-center mx-auto"
                          type="number"
                          min={0}
                          step={5}
                        />
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {formatCurrency(prices[service][size])}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-2 pt-2">
          {editing ? (
            <>
              <Button size="sm" className="gap-1.5" onClick={handleSave}>
                <Save size={14} /> Salvar
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCancel}>
                <X size={14} /> Cancelar
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto text-xs text-muted-foreground" onClick={handleReset}>
                Restaurar padrão
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
              Editar Preços
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BathPriceTable;
