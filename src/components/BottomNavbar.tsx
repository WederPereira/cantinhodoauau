import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Dog, FileSpreadsheet, UserCircle, Camera } from 'lucide-react';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Dog, label: 'Pets' },
  { to: '/reels', icon: Camera, label: 'Mural' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const BottomNavbar: React.FC = () => {
  const location = useLocation();
  const { getBadge } = useNotificationBadges();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-t border-border/30 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          const hasBadge = getBadge(item.to);

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200",
                isActive ? "bg-primary/12 scale-105" : ""
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.5} />
                {hasBadge && (
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse ring-2 ring-background" />
                )}
              </div>
              <span className={cn(
                "text-[10px] leading-none transition-all",
                isActive ? "font-bold text-primary" : "font-medium"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0 w-6 h-1 bg-primary rounded-full" />
              )}
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
};
