import React, { useEffect, useState } from 'react';
import { Moon, Sun, LayoutDashboard, Users, BarChart3, FileSpreadsheet, UserCircle, Camera, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/reels', icon: Camera, label: 'Mural' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/spreadsheet', icon: FileSpreadsheet, label: 'Planilha' },
  { to: '/account', icon: UserCircle, label: 'Conta' },
];

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { session } = useAuth();
  const [hasNewReels, setHasNewReels] = useState(false);
  const [hasNewTasks, setHasNewTasks] = useState(false);

  // Check for unread reels posts
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
    const channel = supabase.channel('header-reels')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reels_posts' }, checkNew)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Check for pending tasks assigned to user
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
    const channel = supabase.channel('header-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_tasks' }, checkTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Mark reels as seen when visiting
  useEffect(() => {
    if (location.pathname === '/reels') {
      localStorage.setItem('reels_last_seen', new Date().toISOString());
      setHasNewReels(false);
    }
  }, [location.pathname]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getBadge = (to: string) => {
    if (to === '/reels' && hasNewReels) return true;
    if (to === '/' && hasNewTasks) return true;
    return false;
  };

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
            const hasBadge = getBadge(item.to);
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors relative',
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
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
