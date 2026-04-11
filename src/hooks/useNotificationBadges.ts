import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

export const useNotificationBadges = () => {
  const { session } = useAuth();
  const location = useLocation();
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
    const channel = supabase.channel('badges-reels')
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
    const channel = supabase.channel('badges-tasks')
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

  return { hasNewReels, hasNewTasks, getBadge };
};
