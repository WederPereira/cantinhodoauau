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
      <div className="container px-4 sm:px-6 py-5 sm:py-7 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-5 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Users className="text-primary" size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>Clientes</h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {clients.length} cadastrado{clients.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <AddClientDialog />
          </div>
        </div>

        {/* Search */}
        <div className="bg-card border border-border rounded-2xl p-3 mb-5 shadow-soft">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por pet, tutor ou raça..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-sm rounded-xl bg-muted/40 border-0 focus:bg-card"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')} className="h-11 w-11 shrink-0 rounded-xl">
                <X size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredClients.map((client, index) => (
              <div key={client.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
                <ClientCard client={client} onClick={() => handleClientClick(client)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Nenhum cliente encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Tente ajustar a busca' : 'Comece adicionando seu primeiro cliente'}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="rounded-xl">Limpar busca</Button>
            )}
          </div>
        )}
      </div>

      <ClientDetailSheet client={selectedClient} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default ClientsPage;
