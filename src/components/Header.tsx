import React from 'react';
import { Moon, Sun, LayoutDashboard, Users, BarChart3, FileSpreadsheet, UserCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex h-14 items-center justify-between px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/app-icon.png" alt="Cantinho do AuAu" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-sm text-foreground tracking-tight">Cantinho do AuAu</span>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </RouterNavLink>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun size={16} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={16} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
};
