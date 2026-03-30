import React from 'react';
import { Moon, Sun, LayoutDashboard, Users, BarChart3, FileSpreadsheet, UserCircle } from 'lucide-react';
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
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-card/90 backdrop-blur-xl border-b border-border/40">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/app-icon.png" alt="Cantinho do AuAu" className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl shadow-md ring-2 ring-primary/20" />
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-[15px] text-foreground leading-tight tracking-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Cantinho do AuAu
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight font-medium">
              {getGreeting()} 👋
            </span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5 bg-muted/50 rounded-2xl p-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;

            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
                )}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </RouterNavLink>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl hover:bg-muted"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun size={17} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={17} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </div>
    </header>
  );
};
