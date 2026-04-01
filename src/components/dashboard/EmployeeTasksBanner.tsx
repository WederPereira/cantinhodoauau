import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  description: string;
  scheduled_time: string;
  status: string;
  recurrence: string;
}

const EmployeeTasksBanner: React.FC = () => {
  const { session } = useAuth();
  const { isAdmin } = useUserRole();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin || !session?.user?.id) return;
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('work_tasks')
        .select('*')
        .eq('assigned_to', session.user.id)
        .eq('status', 'pending')
        .lte('due_date', today)
        .order('scheduled_time', { ascending: true });
      if (data) setTasks(data as Task[]);
    };
    fetch();

    const channel = supabase
      .channel('employee-tasks-banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_tasks' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, isAdmin]);

  const handleComplete = async (taskId: string, done: boolean) => {
    setCompletingId(taskId);
    await supabase.from('work_tasks').update({
      status: done ? 'done' : 'not_done',
      completed_at: new Date().toISOString(),
      completion_note: completionNote || null,
    } as any).eq('id', taskId);
    toast.success(done ? 'Tarefa feita! ✅' : 'Tarefa marcada como não feita');
    setCompletionNote('');
    setCompletingId(null);
  };

  if (isAdmin || tasks.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">Minhas Tarefas</span>
            <Badge variant="secondary" className="text-[10px]">{tasks.length} pendente(s)</Badge>
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="p-2.5 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold">{task.title}</h4>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock size={10} /> {task.scheduled_time?.slice(0, 5)}
                  </span>
                </div>
                {task.description && <p className="text-[10px] text-muted-foreground mb-2">{task.description}</p>}
                <Input
                  placeholder="Observação..."
                  value={completingId === task.id ? completionNote : ''}
                  onChange={e => { setCompletingId(task.id); setCompletionNote(e.target.value); }}
                  className="h-7 text-xs mb-1.5"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleComplete(task.id, true)}>
                    <CheckCircle2 size={12} /> Feito
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1 h-7 text-[10px] gap-1"
                    onClick={() => handleComplete(task.id, false)}>
                    <XCircle size={12} /> Não feito
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeTasksBanner;
