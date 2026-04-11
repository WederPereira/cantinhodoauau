import React from 'react';
import { Moon, Sun, LayoutDashboard, Dog, FileSpreadsheet, UserCircle, Camera, BarChart3 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Dog, label: 'Pets' },
  { to: '/reels', icon: Camera, label: 'Mural' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { getBadge } = useNotificationBadges();

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary/5 via-background/95 to-accent/5 backdrop-blur-xl border-b border-border/40">
      <div className="container flex h-16 items-center justify-between px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/app-icon.png" alt="Cantinho do AuAu" className="w-9 h-9 rounded-xl shadow-md ring-2 ring-primary/20" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-background" />
          </div>
          <div>
            <span className="font-bold text-sm text-foreground tracking-tight block leading-tight">Cantinho do AuAu</span>
            <span className="text-[10px] text-muted-foreground">Creche & Hotel Pet</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-muted/50 rounded-2xl p-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            const hasBadge = getBadge(item.to);
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all duration-200 relative',
                  isActive
                    ? 'text-primary-foreground font-semibold bg-primary shadow-md shadow-primary/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                )}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
                {hasBadge && (
                  <span className={cn(
                    "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse",
                    isActive ? "bg-accent" : "bg-destructive"
                  )} />
                )}
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
          <Sun size={16} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={16} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
};
