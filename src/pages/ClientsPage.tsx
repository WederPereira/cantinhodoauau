import React, { useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { ClientCard } from '@/components/ClientCard';
import { AddClientDialog } from '@/components/AddClientDialog';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';
import { Client } from '@/types/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Dog, Filter } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { normalizeBreedName } from '@/utils/breedNormalizer';

const ClientsPage: React.FC = () => {
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [breedFilter, setBreedFilter] = useState('all');

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) || null : null;

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      setSelectedClientId(id);
      setSheetOpen(true);
    };
    window.addEventListener('openClientDetail', handler);
    return () => window.removeEventListener('openClientDetail', handler);
  }, []);

  // Get unique breeds with counts
  const breedStats = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach(c => {
      const breed = normalizeBreedName(c.breed) || 'Sem raça';
      map.set(breed, (map.get(breed) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!client.name.toLowerCase().includes(q) && !(client.tutorName || '').toLowerCase().includes(q) && !(client.breed || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (breedFilter !== 'all') {
        const clientBreed = normalizeBreedName(client.breed) || 'Sem raça';
        if (clientBreed !== breedFilter) return false;
      }
      return true;
    });
  }, [clients, searchQuery, breedFilter]);

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Dog size={22} className="text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Dogs</h1>
              <p className="text-xs text-muted-foreground">
                {filteredClients.length} de {clients.length} dog{clients.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <AddClientDialog />
        </div>

        {/* Search + Filter */}
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar pet, tutor ou raça..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm bg-card border-border rounded-xl"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                <X size={14} />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <Select value={breedFilter} onValueChange={setBreedFilter}>
              <SelectTrigger className="h-9 text-xs bg-card border-border rounded-xl flex-1">
                <SelectValue placeholder="Filtrar por raça" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todas as raças ({clients.length})</SelectItem>
                {breedStats.map(([breed, count]) => (
                  <SelectItem key={breed} value={breed} className="text-xs">
                    {breed} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {breedFilter !== 'all' && (
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setBreedFilter('all')}>
                <X size={14} />
              </Button>
            )}
          </div>

          {breedFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {breedFilter}: {filteredClients.length} dog{filteredClients.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Grid */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredClients.map((client, index) => (
              <div key={client.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}>
                <ClientCard client={client} onClick={() => handleClientClick(client)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">
              {searchQuery || breedFilter !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhum dog cadastrado'}
            </p>
            {(searchQuery || breedFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setBreedFilter('all'); }} className="mt-2 text-xs">
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      <ClientDetailSheet client={selectedClient} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default ClientsPage;
