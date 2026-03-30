import React, { useState, useMemo, useEffect } from 'react';
import { useClients } from '@/context/ClientContext';
import { ClientCard } from '@/components/ClientCard';
import { AddClientDialog } from '@/components/AddClientDialog';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';
import { Client } from '@/types/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Users } from 'lucide-react';

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
      <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="text-primary" size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Clientes</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {clients.length} cadastrado{clients.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <AddClientDialog />
          </div>
        </div>

        {/* Search */}
        <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 mb-4 sm:mb-5 shadow-soft">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por pet, tutor ou raça..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')} className="h-10 w-10 shrink-0">
                <X size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredClients.map((client, index) => (
              <div key={client.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
                <ClientCard client={client} onClick={() => handleClientClick(client)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Search size={22} className="text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhum cliente encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Tente ajustar a busca' : 'Comece adicionando seu primeiro cliente'}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>Limpar busca</Button>
            )}
          </div>
        )}
      </div>

      <ClientDetailSheet client={selectedClient} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default ClientsPage;
