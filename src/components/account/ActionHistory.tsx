import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { History, Search, Undo2, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logAction } from "@/hooks/useActionLog";

interface ActionLog {
  id: string;
  user_name: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  checkin: "Check-in Hotel",
  checkout: "Check-out Hotel",
  extend_stay: "Prolongou Estadia",
  mark_meal: "Marcou Refeição",
  administer_med: "Administrou Remédio",
  add_client: "Adicionou Cliente",
  edit_client: "Editou Cliente",
  delete_client: "Excluiu Cliente",
  update_vaccine: "Atualizou Vacina",
  update_flea: "Atualizou Antipulgas",
  daycare_entry: "Entrada Creche",
  undo: "Desfez Ação",
  delete_stay: "Excluiu Estadia",
};

const ENTITY_LABELS: Record<string, string> = {
  hotel: "Hotel",
  client: "Cliente",
  vaccine: "Vacina",
  flea: "Antipulgas",
  daycare: "Creche",
  meal: "Refeição",
  medication: "Medicamento",
};

const REVERSIBLE_ACTIONS = ["checkin", "mark_meal", "administer_med"];

const ActionHistory = () => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [undoing, setUndoing] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("action_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setLogs(data as ActionLog[]);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleUndo = async (log: ActionLog) => {
    setUndoing(log.id);
    try {
      if (log.action === "checkin" && log.entity_id) {
        await supabase.from("hotel_stays").delete().eq("id", log.entity_id);
        await supabase.from("hotel_meals").delete().eq("hotel_stay_id", log.entity_id);
        await logAction("undo", "hotel", log.entity_id, { undone_action: "checkin", original_log_id: log.id });
        toast.success("Check-in desfeito!");
      } else if (log.action === "mark_meal" && log.details?.meal_id) {
        await supabase.from("hotel_meals").update({ ate: false }).eq("id", log.details.meal_id);
        await logAction("undo", "meal", log.details.meal_id, { undone_action: "mark_meal", original_log_id: log.id });
        toast.success("Refeição desmarcada!");
      } else if (log.action === "administer_med" && log.details?.medication_id) {
        await supabase.from("hotel_medications").update({ administered: false, administered_at: null }).eq("id", log.details.medication_id);
        await logAction("undo", "medication", log.details.medication_id, { undone_action: "administer_med", original_log_id: log.id });
        toast.success("Medicamento desmarcado!");
      }
      fetchLogs();
    } catch {
      toast.error("Erro ao desfazer ação");
    }
    setUndoing(null);
  };

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.user_name.toLowerCase().includes(search.toLowerCase()) ||
      (ACTION_LABELS[l.action] || l.action).toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || l.action === filterAction;
    return matchSearch && matchAction;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> Histórico de Ações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ação encontrada</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.user_name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      {log.details?.dog_name && ` • ${log.details.dog_name}`}
                      {log.details?.tutor_name && ` (${log.details.tutor_name})`}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {REVERSIBLE_ACTIONS.includes(log.action) && log.action !== "undo" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleUndo(log)}
                      disabled={undoing === log.id}
                    >
                      {undoing === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActionHistory;
