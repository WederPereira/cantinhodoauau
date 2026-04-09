import React, { useEffect, useState } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Dog, FileSpreadsheet, UserCircle, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Dog, label: 'Dogs' },
  { to: '/reels', icon: Camera, label: 'Mural' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const BottomNavbar: React.FC = () => {
  const location = useLocation();
  const { session } = useAuth();
  const [hasNewReels, setHasNewReels] = useState(false);
  const [hasNewTasks, setHasNewTasks] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const lastSeen = localStorage.getItem('reels_last_seen');
    const checkNew = async () => {
      let query = supabase.from('reels_posts').select('id', { count: 'exact', head: true });
      if (lastSeen) query = query.gt('created_at', lastSeen);
      const { count } = await query;
      setHasNewReels((count || 0) > 0);
    };
    checkNew();
    const channel = supabase.channel('bottom-reels')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reels_posts' }, checkNew)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const checkTasks = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase.from('work_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', session.user.id)
        .eq('status', 'pending')
        .eq('due_date', today);
      setHasNewTasks((count || 0) > 0);
    };
    checkTasks();
    const channel = supabase.channel('bottom-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_tasks' }, checkTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  useEffect(() => {
    if (location.pathname === '/reels') {
      localStorage.setItem('reels_last_seen', new Date().toISOString());
      setHasNewReels(false);
    }
  }, [location.pathname]);

  const getBadge = (to: string) => {
    if (to === '/reels' && hasNewReels) return true;
    if (to === '/' && hasNewTasks) return true;
    return false;
  };

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
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                )}
              </div>
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
