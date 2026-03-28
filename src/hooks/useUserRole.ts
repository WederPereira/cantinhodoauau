import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setRole(data?.role || null);
      setLoading(false);
    };
    fetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetch();
    });
    return () => subscription.unsubscribe();
  }, []);

  return { role, isAdmin: role === "admin", loading };
}
