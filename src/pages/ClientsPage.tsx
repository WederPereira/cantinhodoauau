import React, { useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { ClientCard } from '@/components/ClientCard';
import { AddClientDialog } from '@/components/AddClientDialog';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';
import { Client } from '@/types/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

const ClientsPage: React.FC = () => {
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!client.name.toLowerCase().includes(q) && !(client.tutorName || '').toLowerCase().includes(q) && !(client.breed || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [clients, searchQuery]);

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Clientes</h1>
            <p className="text-xs text-muted-foreground">
              {clients.length} cadastrado{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <AddClientDialog />
        </div>

        {/* Search */}
        <div className="relative mb-5">
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
              {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="mt-2 text-xs">
                Limpar busca
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
