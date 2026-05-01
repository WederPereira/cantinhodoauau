import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Dog, FileSpreadsheet, UserCircle, Camera, BarChart3 } from 'lucide-react';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Dog, label: 'Pets' },
  { to: '/reels', icon: Camera, label: 'Mural' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const BottomNavbar: React.FC = () => {
  const location = useLocation();
  const { getBadge } = useNotificationBadges();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          const hasBadge = getBadge(item.to);

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative',
                'transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.6} />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                )}
              </div>
              <span className={cn(
                "text-[9px]",
                isActive ? "font-semibold" : "font-normal"
              )}>
                {item.label}
              </span>
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
};
