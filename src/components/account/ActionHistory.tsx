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
  mark_meal: "Marcou Refeição Hotel",
  administer_med: "Administrou Remédio",
  add_client: "Adicionou Cliente",
  edit_client: "Editou Cliente",
  delete_client: "Excluiu Cliente",
  add_vaccine: "Adicionou Vacina",
  delete_vaccine: "Excluiu Vacina",
  add_flea: "Adicionou Antipulgas",
  delete_flea: "Excluiu Antipulgas",
  update_vaccine: "Atualizou Vacina",
  update_flea: "Atualizou Antipulgas",
  daycare_entry: "Entrada Creche",
  daycare_meal: "Refeição Creche",
  qr_read: "Leitura QR Code",
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

// All actions that can be undone
const REVERSIBLE_ACTIONS = [
  "checkin", "checkout", "mark_meal", "administer_med",
  "qr_read", "daycare_meal", "delete_stay",
  "edit_client", "delete_client",
  "add_vaccine", "delete_vaccine",
  "add_flea", "delete_flea",
];

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
      switch (log.action) {
        case "checkin":
          if (log.entity_id) {
            await supabase.from("hotel_meals").delete().eq("hotel_stay_id", log.entity_id);
            await supabase.from("hotel_medications").delete().eq("hotel_stay_id", log.entity_id);
            await supabase.from("hotel_stays").delete().eq("id", log.entity_id);
            await logAction("undo", "hotel", log.entity_id, { undone_action: "checkin", original_log_id: log.id });
            toast.success("Check-in desfeito!");
          }
          break;

        case "checkout":
          if (log.entity_id) {
            await supabase.from("hotel_stays").update({ active: true, check_out: null }).eq("id", log.entity_id);
            await logAction("undo", "hotel", log.entity_id, { undone_action: "checkout", original_log_id: log.id });
            toast.success("Checkout desfeito!");
          }
          break;

        case "mark_meal":
          if (log.details?.meal_id) {
            await supabase.from("hotel_meals").update({ ate: false }).eq("id", log.details.meal_id);
            await logAction("undo", "meal", log.details.meal_id, { undone_action: "mark_meal", original_log_id: log.id });
            toast.success("Refeição desmarcada!");
          }
          break;

        case "administer_med":
          if (log.details?.medication_id) {
            await supabase.from("hotel_medications").update({ administered: false, administered_at: null }).eq("id", log.details.medication_id);
            await logAction("undo", "medication", log.details.medication_id, { undone_action: "administer_med", original_log_id: log.id });
            toast.success("Medicamento desmarcado!");
          }
          break;

        case "qr_read":
          if (log.entity_id) {
            await supabase.from("daily_records").delete().eq("qr_entry_id", log.entity_id);
            await supabase.from("qr_entries").delete().eq("id", log.entity_id);
            await logAction("undo", "daycare", log.entity_id, { undone_action: "qr_read", original_log_id: log.id });
            toast.success("Leitura QR desfeita!");
          }
          break;

        case "daycare_meal":
          if (log.entity_id) {
            const newAte = !(log.details?.ate);
            await supabase.from("daily_records").update({ ate: newAte }).eq("id", log.entity_id);
            await logAction("undo", "daycare", log.entity_id, { undone_action: "daycare_meal", original_log_id: log.id });
            toast.success("Refeição creche revertida!");
          }
          break;

        case "delete_stay":
          // Cannot restore a deleted stay without full data, just log
          toast.info("Estadia excluída não pode ser restaurada automaticamente.");
          break;

        case "edit_client":
          if (log.entity_id && log.details?.updated_fields) {
            const revertUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
            const fields = log.details.updated_fields as string[];
            const fieldMap: Record<string, string> = {
              name: 'name', breed: 'breed', tutorName: 'tutor_name', tutorPhone: 'tutor_phone',
              tutorEmail: 'tutor_email', tutorAddress: 'tutor_address', tutorNeighborhood: 'tutor_neighborhood',
              tutorCpf: 'tutor_cpf', petSize: 'pet_size', weight: 'weight', birthDate: 'birth_date',
              photo: 'photo', gender: 'gender', castrated: 'castrated', vaccines: 'vaccines',
              healthRestrictions: 'health_restrictions',
            };
            for (const field of fields) {
              const dbField = fieldMap[field];
              const prevKey = `prev_${dbField}`;
              if (dbField && log.details[prevKey] !== undefined) {
                revertUpdates[dbField] = log.details[prevKey];
              }
            }
            if (Object.keys(revertUpdates).length > 1) {
              await supabase.from("clients").update(revertUpdates).eq("id", log.entity_id);
              await logAction("undo", "client", log.entity_id, { undone_action: "edit_client", original_log_id: log.id });
              toast.success("Edição de cliente desfeita!");
            }
          }
          break;

        case "delete_client":
          if (log.details?.full_client) {
            const fc = log.details.full_client;
            const { error } = await supabase.from("clients").insert({
              name: fc.name, breed: fc.breed || '',
              tutor_name: fc.tutor_name || '', tutor_phone: fc.tutor_phone || '',
              tutor_email: fc.tutor_email || '', tutor_address: fc.tutor_address || '',
              tutor_neighborhood: fc.tutor_neighborhood || '', tutor_cpf: fc.tutor_cpf || '',
              pet_size: fc.pet_size || null, weight: fc.weight || null,
              birth_date: fc.birth_date || null, photo: fc.photo || null,
              gender: fc.gender || null, castrated: fc.castrated ?? false,
              vaccines: fc.vaccines || {}, health_restrictions: fc.health_restrictions || '',
              entry_date: fc.entry_date || new Date().toISOString(),
            });
            if (error) throw error;
            await logAction("undo", "client", log.entity_id, { undone_action: "delete_client", original_log_id: log.id });
            toast.success("Cliente restaurado!");
          } else {
            toast.error("Dados insuficientes para restaurar o cliente.");
          }
          break;

        case "add_vaccine":
          // Undo adding a vaccine = delete the most recent vaccine of that type for that client
          if (log.entity_id && log.details?.vaccine_type) {
            const { data: records } = await supabase.from("vaccine_records")
              .select("id").eq("client_id", log.entity_id).eq("type", log.details.vaccine_type)
              .eq("date", log.details.date).limit(1);
            if (records && records.length > 0) {
              await supabase.from("vaccine_records").delete().eq("id", records[0].id);
              await logAction("undo", "vaccine", records[0].id, { undone_action: "add_vaccine", original_log_id: log.id });
              toast.success("Vacina removida!");
            }
          }
          break;

        case "delete_vaccine":
          if (log.details?.client_id && log.details?.vaccine_type && log.details?.date) {
            await supabase.from("vaccine_records").insert({
              client_id: log.details.client_id,
              type: log.details.vaccine_type,
              date: log.details.date,
              notes: log.details.notes || null,
            });
            await logAction("undo", "vaccine", log.entity_id, { undone_action: "delete_vaccine", original_log_id: log.id });
            toast.success("Vacina restaurada!");
          } else {
            toast.error("Dados insuficientes para restaurar vacina.");
          }
          break;

        case "add_flea":
          if (log.entity_id && log.details?.date && log.details?.brand) {
            const { data: records } = await supabase.from("flea_records")
              .select("id").eq("client_id", log.entity_id).eq("date", log.details.date)
              .eq("brand", log.details.brand).limit(1);
            if (records && records.length > 0) {
              await supabase.from("flea_records").delete().eq("id", records[0].id);
              await logAction("undo", "flea", records[0].id, { undone_action: "add_flea", original_log_id: log.id });
              toast.success("Antipulgas removido!");
            }
          }
          break;

        case "delete_flea":
          if (log.details?.client_id && log.details?.date && log.details?.brand) {
            await supabase.from("flea_records").insert({
              client_id: log.details.client_id,
              date: log.details.date,
              brand: log.details.brand,
              duration_months: log.details.duration_months || 1,
              notes: log.details.notes || null,
            });
            await logAction("undo", "flea", log.entity_id, { undone_action: "delete_flea", original_log_id: log.id });
            toast.success("Antipulgas restaurado!");
          } else {
            toast.error("Dados insuficientes para restaurar antipulgas.");
          }
          break;

        default:
          toast.info("Essa ação não pode ser desfeita.");
      }
      fetchLogs();
    } catch {
      toast.error("Erro ao desfazer ação");
    }
    setUndoing(null);
  };

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.user_name.toLowerCase().includes(search.toLowerCase()) ||
      (ACTION_LABELS[l.action] || l.action).toLowerCase().includes(search.toLowerCase()) ||
      (l.details?.dog_name || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || l.action === filterAction;
    return matchSearch && matchAction;
  });

  const getUndoLabel = (action: string) => {
    const labels: Record<string, string> = {
      checkin: "Desfazer check-in",
      checkout: "Desfazer checkout",
      mark_meal: "Desmarcar refeição",
      administer_med: "Desmarcar remédio",
      qr_read: "Desfazer leitura",
      daycare_meal: "Reverter refeição",
      edit_client: "Reverter edição",
      delete_client: "Restaurar cliente",
      add_vaccine: "Remover vacina",
      delete_vaccine: "Restaurar vacina",
      add_flea: "Remover antipulgas",
      delete_flea: "Restaurar antipulgas",
    };
    return labels[action] || "Desfazer";
  };

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
                    {log.details?.updated_fields && (
                      <p className="text-[10px] text-muted-foreground/70">
                        Campos: {(log.details.updated_fields as string[]).join(', ')}
                      </p>
                    )}
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
                      title={getUndoLabel(log.action)}
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
