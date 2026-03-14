import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BarChart3, FileSpreadsheet } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
];

export const BottomNavbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-[56px] sm:h-[60px] max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative',
                'text-muted-foreground transition-all duration-200',
                isActive && 'text-primary'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <Icon
                size={20}
                className={cn("transition-all duration-200", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={cn(
                "text-[9px] leading-tight",
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
