import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const TABLES = [
  "clients",
  "vaccine_records",
  "flea_records",
  "feces_collections",
  "hotel_stays",
  "hotel_meals",
  "hotel_medications",
  "daily_records",
  "qr_entries",
  "taxi_groups",
  "work_tasks",
  "action_logs",
  "reels_posts",
  "reels_comments",
  "profiles",
  "user_roles",
  "backup_history",
];

const PHOTO_BUCKETS = ["avatars", "hotel-belongings", "reels", "edfe"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let source = "auto";
    let triggeredBy: string | null = null;
    let triggeredByName = "Sistema (automático)";

    try {
      const body = await req.json();
      if (body?.source) source = body.source;
      if (body?.user_id) triggeredBy = body.user_id;
      if (body?.user_name) triggeredByName = body.user_name;
    } catch { /* no body */ }

    const zip = new JSZip();
    const dataFolder = zip.folder("data")!;
    const photosFolder = zip.folder("photos")!;
    let totalRecords = 0;

    // Dump all tables as JSON
    const dump: Record<string, any[]> = {};
    for (const table of TABLES) {
      const { data, error } = await admin.from(table).select("*");
      if (error) {
        console.error(`Error dumping ${table}:`, error);
        dump[table] = [];
      } else {
        dump[table] = data || [];
        totalRecords += (data || []).length;
        dataFolder.file(`${table}.json`, JSON.stringify(data || [], null, 2));
      }
    }

    // Dump all photos from each bucket
    let totalPhotos = 0;
    for (const bucket of PHOTO_BUCKETS) {
      const bucketFolder = photosFolder.folder(bucket)!;
      const { data: files, error } = await admin.storage.from(bucket).list("", {
        limit: 10000,
        sortBy: { column: "name", order: "asc" },
      });
      if (error || !files) continue;

      // Recursively list folders
      const allPaths: string[] = [];
      const walk = async (prefix: string) => {
        const { data: items } = await admin.storage.from(bucket).list(prefix, { limit: 10000 });
        if (!items) return;
        for (const item of items) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null) {
            await walk(fullPath); // folder
          } else {
            allPaths.push(fullPath);
          }
        }
      };
      await walk("");

      for (const path of allPaths) {
        try {
          const { data: blob } = await admin.storage.from(bucket).download(path);
          if (blob) {
            const buf = await blob.arrayBuffer();
            bucketFolder.file(path, buf);
            totalPhotos++;
          }
        } catch (e) {
          console.error(`Failed to download ${bucket}/${path}`, e);
        }
      }
    }

    // Manifest
    const manifest = {
      version: "1.0",
      created_at: new Date().toISOString(),
      source,
      triggered_by_name: triggeredByName,
      tables: TABLES,
      buckets: PHOTO_BUCKETS,
      total_records: totalRecords,
      total_photos: totalPhotos,
      total_clients: dump.clients?.length || 0,
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Generate zip
    const zipBlob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

    // Upload to storage
    const ts = new Date();
    const yyyy = ts.getFullYear();
    const mm = String(ts.getMonth() + 1).padStart(2, "0");
    const dd = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const min = String(ts.getMinutes()).padStart(2, "0");
    const filePath = `${yyyy}/backup_${yyyy}-${mm}-${dd}_${hh}${min}_${source}.zip`;

    const { error: upErr } = await admin.storage
      .from("backups")
      .upload(filePath, zipBlob, { contentType: "application/zip", upsert: false });
    if (upErr) throw upErr;

    // Record in history
    await admin.from("backup_history").insert({
      file_path: filePath,
      file_size_bytes: zipBlob.byteLength,
      source,
      triggered_by: triggeredBy,
      triggered_by_name: triggeredByName,
      total_clients: manifest.total_clients,
      total_photos: totalPhotos,
      total_records: totalRecords,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        file_path: filePath,
        size_bytes: zipBlob.byteLength,
        total_records: totalRecords,
        total_photos: totalPhotos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Backup failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: getErrorMessage(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
