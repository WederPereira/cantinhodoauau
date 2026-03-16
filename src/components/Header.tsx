import React from 'react';
import { PawPrint, Moon, Sun, LayoutDashboard, Users, BarChart3, FileSpreadsheet } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
];

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="container flex h-14 items-center justify-between px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
            <PawPrint size={18} className="text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-foreground leading-tight">Cantinho do AuAu</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{getGreeting()} 👋</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 mx-4 flex-1 justify-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;

            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </RouterNavLink>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun size={18} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={18} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </div>
    </header>
  );
};
