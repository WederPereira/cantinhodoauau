import React from 'react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, PawPrint, FileSpreadsheet } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <PawPrint size={20} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">PetCredits</span>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors duration-200'
            )}
            activeClassName="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <LayoutDashboard size={22} />
            <span className="hidden sm:inline">Dashboard</span>
          </NavLink>
          <NavLink
            to="/clients"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors duration-200'
            )}
            activeClassName="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Users size={22} />
            <span className="hidden sm:inline">Clientes</span>
          </NavLink>
          <NavLink
            to="/spreadsheet"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors duration-200'
            )}
            activeClassName="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <FileSpreadsheet size={22} />
            <span className="hidden sm:inline">Planilha</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
