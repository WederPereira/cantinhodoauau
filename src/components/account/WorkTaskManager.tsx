import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Loader2, Clock, CheckCircle2, XCircle, ClipboardList, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WorkTask {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  scheduled_time: string;
  recurrence: string;
  status: string;
  completed_at: string | null;
  completion_note: string | null;
  due_date: string;
  created_at: string;
}

interface Employee {
  id: string;
  full_name: string;
  cargo: string;
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Diário",
  weekly: "Semanal",
  once: "Uma vez",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  done: { label: "Feito", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  late: { label: "Atrasado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  not_done: { label: "Não feito", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

const WorkTaskManager = () => {
  const { session } = useAuth();
  const { isAdmin } = useUserRole();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [recurrence, setRecurrence] = useState("daily");

  // Employee completion
  const [completionNote, setCompletionNote] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("work_tasks")
      .select("*")
      .order("due_date", { ascending: false })
      .order("scheduled_time", { ascending: true });
    if (data) setTasks(data as WorkTask[]);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, cargo");
    if (data) setEmployees(data);
  };

  useEffect(() => {
    fetchTasks();
    if (isAdmin) fetchEmployees();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assignedTo) {
      toast.error("Preencha título e funcionário");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("work_tasks").insert({
      title,
      description,
      assigned_to: assignedTo,
      assigned_by: session?.user?.id,
      scheduled_time: scheduledTime,
      recurrence,
      due_date: new Date().toISOString().split("T")[0],
    } as any);
    if (error) {
      toast.error("Erro ao criar tarefa");
    } else {
      toast.success("Tarefa atribuída!");
      setTitle("");
      setDescription("");
      setShowForm(false);
      fetchTasks();
    }
    setCreating(false);
  };

  const handleComplete = async (taskId: string, done: boolean) => {
    setCompletingId(taskId);
    const { error } = await supabase
      .from("work_tasks")
      .update({
        status: done ? "done" : "not_done",
        completed_at: new Date().toISOString(),
        completion_note: completionNote || null,
      } as any)
      .eq("id", taskId);
    if (error) {
      toast.error("Erro ao atualizar tarefa");
    } else {
      toast.success(done ? "Tarefa marcada como feita!" : "Tarefa marcada como não feita");
      setCompletionNote("");
      fetchTasks();
    }
    setCompletingId(null);
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase.from("work_tasks").delete().eq("id", taskId);
    if (error) toast.error("Erro ao excluir tarefa");
    else { toast.success("Tarefa removida"); fetchTasks(); }
  };

  const getEmployeeName = (id: string) => {
    return employees.find((e) => e.id === id)?.full_name || "—";
  };

  const myTasks = tasks.filter((t) => t.assigned_to === session?.user?.id);
  const allTasks = isAdmin ? tasks : myTasks;

  return (
    <div className="space-y-4">
      {/* Admin: Create Task */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Tarefas da Equipe
              </CardTitle>
              <Button size="sm" variant={showForm ? "secondary" : "default"} onClick={() => setShowForm(!showForm)} className="gap-1 h-7 text-xs">
                <Plus className="w-3.5 h-3.5" /> Nova
              </Button>
            </div>
          </CardHeader>
          {showForm && (
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Limpar área dos dogs" className="h-8 text-sm" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa..." className="text-sm min-h-[60px]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Funcionário</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.id !== session?.user?.id).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id} className="text-xs">{emp.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horário</Label>
                    <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Recorrência</Label>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once" className="text-xs">Uma vez</SelectItem>
                      <SelectItem value="daily" className="text-xs">Diário</SelectItem>
                      <SelectItem value="weekly" className="text-xs">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-8 text-xs" disabled={creating}>
                  {creating ? <Loader2 className="animate-spin w-4 h-4" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Atribuir Tarefa</>}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      {/* Task List */}
      {!isAdmin && myTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Minhas Tarefas
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-2">
        {allTasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isAdmin ? "Nenhuma tarefa atribuída ainda" : "Você não tem tarefas pendentes 🎉"}
          </p>
        )}
        {allTasks.map((task) => {
          const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const StatusIcon = config.icon;
          const isPending = task.status === "pending";

          return (
            <Card key={task.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold truncate">{task.title}</h4>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color} border-0`}>
                        <StatusIcon className="w-3 h-3 mr-0.5" /> {config.label}
                      </Badge>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mb-1">{task.description}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>⏰ {task.scheduled_time.slice(0, 5)}</span>
                      <span>🔄 {RECURRENCE_LABELS[task.recurrence] || task.recurrence}</span>
                      {isAdmin && <span>👤 {getEmployeeName(task.assigned_to)}</span>}
                      {task.completed_at && (
                        <span>✅ {format(new Date(task.completed_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                      )}
                    </div>
                    {task.completion_note && (
                      <p className="text-[11px] mt-1 bg-muted/50 rounded px-2 py-1 italic">"{task.completion_note}"</p>
                    )}
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* Employee actions */}
                {!isAdmin && isPending && (
                  <div className="mt-2 pt-2 border-t border-border space-y-2">
                    <Input
                      placeholder="Observação (opcional)..."
                      value={completingId === task.id ? completionNote : ""}
                      onChange={(e) => { setCompletingId(task.id); setCompletionNote(e.target.value); }}
                      className="h-7 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleComplete(task.id, true)} disabled={completingId === task.id && loading}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Feito
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs gap-1"
                        onClick={() => handleComplete(task.id, false)} disabled={completingId === task.id && loading}>
                        <XCircle className="w-3.5 h-3.5" /> Não feito
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WorkTaskManager;
