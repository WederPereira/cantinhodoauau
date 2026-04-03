import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, FileSpreadsheet, UserCircle, Camera } from 'lucide-react';

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className={cn(
                "text-[10px]",
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
