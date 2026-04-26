import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

// Hard wall-time guard so we never let the runtime kill us silently
const MAX_PHOTO_TIME_MS = 90_000; // leave time for upload + history insert
const PHOTO_CONCURRENCY = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let source = "auto";
    let triggeredBy: string | null = null;
    let triggeredByName = "Sistema (automático)";
    let includePhotos = false; // default: fast backup (data only)

    try {
      const body = await req.json();
      if (body?.source) source = body.source;
      if (body?.user_id) triggeredBy = body.user_id;
      if (body?.user_name) triggeredByName = body.user_name;
      if (typeof body?.include_photos === "boolean") includePhotos = body.include_photos;
    } catch { /* no body */ }

    const zip = new JSZip();
    const dataFolder = zip.folder("data")!;
    let totalRecords = 0;

    console.log(`[backup] start source=${source} include_photos=${includePhotos}`);

    // 1) Dump all tables (sequential, with paging to bypass 1000-row default cap)
    const dump: Record<string, any[]> = {};
    const PAGE = 1000;
    for (const table of TABLES) {
      const tStart = Date.now();
      const all: any[] = [];
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await admin.from(table).select("*").range(from, from + PAGE - 1);
        if (error) {
          console.error(`[backup] dump ${table} err:`, error.message);
          break;
        }
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
        if (all.length > 200_000) {
          console.warn(`[backup] ${table} truncated at 200k rows`);
          break;
        }
      }
      dump[table] = all;
      console.log(`[backup] ${table}: ${all.length} rows in ${Date.now() - tStart}ms`);
    }
    for (const table of TABLES) {
      dataFolder.file(`${table}.json`, JSON.stringify(dump[table] || [], null, 2));
      totalRecords += (dump[table] || []).length;
    }
    console.log(`[backup] tables done, total=${totalRecords}, elapsed=${Date.now() - startedAt}ms`);

    // 2) Optionally include photos (with hard time guard + concurrency)
    let totalPhotos = 0;
    let photosSkipped = 0;
    let photoErrors = 0;
    let photosTruncated = false;

    if (includePhotos) {
      const photosFolder = zip.folder("photos")!;

      // Collect all photo paths first
      const photoTasks: { bucket: string; path: string }[] = [];
      for (const bucket of PHOTO_BUCKETS) {
        const walk = async (prefix: string) => {
          const { data: items, error } = await admin.storage.from(bucket).list(prefix, { limit: 10000 });
          if (error || !items) return;
          for (const item of items) {
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.id === null) {
              await walk(fullPath);
            } else {
              photoTasks.push({ bucket, path: fullPath });
            }
          }
        };
        try {
          await walk("");
        } catch (e) {
          console.error(`list ${bucket}:`, getErrorMessage(e));
        }
      }

      // Download with concurrency + time guard
      let cursor = 0;
      const worker = async () => {
        while (cursor < photoTasks.length) {
          const i = cursor++;
          if (Date.now() - startedAt > MAX_PHOTO_TIME_MS) {
            photosTruncated = true;
            return;
          }
          const { bucket, path } = photoTasks[i];
          try {
            const { data: blob, error } = await admin.storage.from(bucket).download(path);
            if (error || !blob) {
              photoErrors++;
              continue;
            }
            const buf = await blob.arrayBuffer();
            photosFolder.folder(bucket)!.file(path, buf);
            totalPhotos++;
          } catch (e) {
            photoErrors++;
            console.error(`download ${bucket}/${path}`, getErrorMessage(e));
          }
        }
      };
      await Promise.all(Array.from({ length: PHOTO_CONCURRENCY }, () => worker()));
      photosSkipped = photoTasks.length - totalPhotos - photoErrors;
    }

    // 3) Manifest
    const manifest = {
      version: "1.1",
      created_at: new Date().toISOString(),
      source,
      triggered_by_name: triggeredByName,
      tables: TABLES,
      buckets: includePhotos ? PHOTO_BUCKETS : [],
      include_photos: includePhotos,
      total_records: totalRecords,
      total_photos: totalPhotos,
      total_clients: dump.clients?.length || 0,
      photos_skipped: photosSkipped,
      photo_errors: photoErrors,
      photos_truncated: photosTruncated,
      duration_ms: Date.now() - startedAt,
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // 4) Generate zip
    const zipBlob = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 4 },
    });

    // 5) Upload
    const ts = new Date();
    const yyyy = ts.getFullYear();
    const mm = String(ts.getMonth() + 1).padStart(2, "0");
    const dd = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const min = String(ts.getMinutes()).padStart(2, "0");
    const tag = includePhotos ? "full" : "data";
    const filePath = `${yyyy}/backup_${yyyy}-${mm}-${dd}_${hh}${min}_${source}_${tag}.zip`;

    const { error: upErr } = await admin.storage
      .from("backups")
      .upload(filePath, zipBlob, { contentType: "application/zip", upsert: false });
    if (upErr) throw upErr;

    // 6) History row
    await admin.from("backup_history").insert({
      file_path: filePath,
      file_size_bytes: zipBlob.byteLength,
      source,
      triggered_by: triggeredBy,
      triggered_by_name: triggeredByName,
      total_clients: manifest.total_clients,
      total_photos: totalPhotos,
      total_records: totalRecords,
      notes: photosTruncated
        ? `Backup truncado: ${photosSkipped} fotos não couberam no tempo limite`
        : (includePhotos ? "Backup completo" : "Backup rápido (sem fotos)"),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        file_path: filePath,
        size_bytes: zipBlob.byteLength,
        total_records: totalRecords,
        total_photos: totalPhotos,
        photos_truncated: photosTruncated,
        photos_skipped: photosSkipped,
        duration_ms: manifest.duration_ms,
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
