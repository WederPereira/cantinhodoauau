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
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
      <div className="container flex h-16 lg:h-14 items-center justify-between px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/app-icon.png" alt="Cantinho do AuAu" className="w-10 h-10 lg:w-8 lg:h-8 rounded-lg" />
          <span className="font-bold text-base lg:text-sm text-foreground tracking-tight">Cantinho do AuAu</span>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            const hasBadge = getBadge(item.to);
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all relative',
                  isActive
                    ? 'text-primary font-semibold bg-primary/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
                {hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                )}
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
