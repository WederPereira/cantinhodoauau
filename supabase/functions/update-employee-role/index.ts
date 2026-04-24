import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const callerId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem alterar cargos" }), { status: 403, headers: corsHeaders });
    }

    const { user_id, new_role } = await req.json();

    if (!user_id || !new_role) {
      return new Response(JSON.stringify({ error: "user_id e new_role são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    if (!["admin", "monitor", "noturnista"].includes(new_role)) {
      return new Response(JSON.stringify({ error: "Cargo inválido" }), { status: 400, headers: corsHeaders });
    }

    // Update user_roles table
    await adminClient
      .from("user_roles")
      .update({ role: new_role })
      .eq("user_id", user_id);

    // Update profiles cargo
    await adminClient
      .from("profiles")
      .update({ cargo: new_role })
      .eq("id", user_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: getErrorMessage(err) }), { status: 500, headers: corsHeaders });
  }
});
