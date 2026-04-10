import React, { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { ClipboardList, AlertTriangle } from 'lucide-react';

const TaskNotifications: React.FC = () => {
  const { session } = useAuth();
  const { isAdmin } = useUserRole();
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const notifiedLateRef = useRef<Set<string>>(new Set());

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 660;
      osc.type = 'sine';
      gain.gain.value = 0.25;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 880;
        osc2.type = 'sine';
        gain2.gain.value = 0.25;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 200);
    } catch { /* no audio */ }
  }, []);

  const playAlertSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'square';
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* no audio */ }
  }, []);

  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/app-icon.png' });
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Employee: check for new tasks assigned to me
  useEffect(() => {
    if (!session?.user?.id || isAdmin) return;

    const channel = supabase
      .channel('task-notifications-employee')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'work_tasks',
        filter: `assigned_to=eq.${session.user.id}`,
      }, (payload) => {
        const task = payload.new as any;
        if (notifiedTasksRef.current.has(task.id)) return;
        notifiedTasksRef.current.add(task.id);
        playNotificationSound();
        sendBrowserNotification('📋 Nova tarefa!', `${task.title} • ⏰ ${task.scheduled_time?.slice(0, 5)}`);
        toast('📋 Nova tarefa atribuída!', {
          description: `${task.title} • ⏰ ${task.scheduled_time?.slice(0, 5)}`,
          duration: 10000,
          icon: <ClipboardList size={18} className="text-primary" />,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, isAdmin, playNotificationSound, sendBrowserNotification]);

  // Admin: check for late tasks (2h past scheduled time and still pending)
  useEffect(() => {
    if (!session?.user?.id || !isAdmin) return;

    const checkLateTasks = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: pendingTasks } = await supabase
        .from('work_tasks')
        .select('*, profiles:assigned_to(full_name)')
        .eq('status', 'pending')
        .eq('due_date', today);

      if (!pendingTasks) return;

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      pendingTasks.forEach((task: any) => {
        if (!task.scheduled_time) return;
        const [h, m] = task.scheduled_time.split(':').map(Number);
        const taskMinutes = h * 60 + m;
        const diff = nowMinutes - taskMinutes;

        if (diff >= 120 && !notifiedLateRef.current.has(task.id)) {
          notifiedLateRef.current.add(task.id);
          playAlertSound();
          const employeeName = task.profiles?.full_name || 'Funcionário';
          sendBrowserNotification('⚠️ Tarefa atrasada!', `"${task.title}" de ${employeeName} — ${Math.floor(diff / 60)}h atrasada`);
          toast.error(`⚠️ Tarefa atrasada!`, {
            description: `"${task.title}" de ${employeeName} não foi concluída (${Math.floor(diff / 60)}h atrasada)`,
            duration: 15000,
            icon: <AlertTriangle size={18} />,
          });
        }
      });
    };

    checkLateTasks();
    const interval = setInterval(checkLateTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.user?.id, isAdmin, playAlertSound, sendBrowserNotification]);

  return null;
};

export default TaskNotifications;
