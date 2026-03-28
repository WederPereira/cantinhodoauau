import { supabase } from "@/integrations/supabase/client";

export async function logAction(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from("action_logs").insert({
      user_id: session.user.id,
      user_name: session.user.user_metadata?.full_name || session.user.email || "Desconhecido",
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
    });
  } catch (err) {
    console.error("Erro ao registrar ação:", err);
  }
}
