import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BarChart3, FileSpreadsheet, UserCircle, Camera } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/reels', icon: Camera, label: 'Mural' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const BottomNavbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/60 safe-area-bottom lg:hidden shadow-[0_-2px_10px_-3px_hsl(var(--foreground)/0.08)]">
      <div className="flex items-center justify-around h-[58px] max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative py-1.5',
                'text-muted-foreground transition-all duration-200',
                isActive && 'text-primary'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-primary rounded-b-full" />
              )}
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon
                  size={20}
                  className={cn("transition-all duration-200")}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span className={cn(
                "text-[10px] leading-tight",
                isActive ? "font-bold" : "font-medium"
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
