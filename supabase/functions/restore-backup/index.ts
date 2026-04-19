import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables that we restore. Order matters for FKs (parents first).
const RESTORE_ORDER = [
  "profiles",
  "user_roles",
  "clients",
  "vaccine_records",
  "flea_records",
  "feces_collections",
  "hotel_stays",
  "hotel_meals",
  "hotel_medications",
  "qr_entries",
  "daily_records",
  "taxi_groups",
  "work_tasks",
  "reels_posts",
  "reels_comments",
  "action_logs",
];

const PHOTO_BUCKETS = ["avatars", "hotel-belongings", "reels", "edfe"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ ok: false, error: "Apenas admins podem restaurar" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read body: { file_path: string, mode: 'merge' | 'replace' }
    const { file_path, mode = "merge" } = await req.json();
    if (!file_path) throw new Error("file_path required");

    // Download zip from backups bucket
    const { data: blob, error: dlErr } = await admin.storage.from("backups").download(file_path);
    if (dlErr || !blob) throw new Error("Não foi possível baixar o backup");

    const buf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    let restoredRows = 0;
    let restoredPhotos = 0;
    const errors: string[] = [];

    // Restore tables
    for (const table of RESTORE_ORDER) {
      const file = zip.file(`data/${table}.json`);
      if (!file) continue;
      try {
        const json = JSON.parse(await file.async("string"));
        if (!Array.isArray(json) || json.length === 0) continue;

        if (mode === "replace") {
          await admin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        }

        // Upsert in chunks of 500
        for (let i = 0; i < json.length; i += 500) {
          const chunk = json.slice(i, i + 500);
          const { error } = await admin.from(table).upsert(chunk, { onConflict: "id" });
          if (error) {
            errors.push(`${table}: ${error.message}`);
          } else {
            restoredRows += chunk.length;
          }
        }
      } catch (e: any) {
        errors.push(`${table}: ${e.message}`);
      }
    }

    // Restore photos
    for (const bucket of PHOTO_BUCKETS) {
      const folder = zip.folder(`photos/${bucket}`);
      if (!folder) continue;
      const filePromises: Promise<void>[] = [];
      folder.forEach((relPath, fileObj) => {
        if (fileObj.dir) return;
        filePromises.push(
          (async () => {
            try {
              const data = await fileObj.async("uint8array");
              const { error } = await admin.storage
                .from(bucket)
                .upload(relPath, data, { upsert: true, contentType: "application/octet-stream" });
              if (!error) restoredPhotos++;
            } catch (e: any) {
              errors.push(`${bucket}/${relPath}: ${e.message}`);
            }
          })(),
        );
      });
      await Promise.all(filePromises);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        restored_rows: restoredRows,
        restored_photos: restoredPhotos,
        errors: errors.slice(0, 20),
        total_errors: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("Restore failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
