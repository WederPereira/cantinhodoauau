import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find stays checked out > 24h ago with photos still present
    const { data: stays, error } = await supabase
      .from('hotel_stays')
      .select('id, belongings_photos')
      .eq('active', false)
      .lt('check_out', oneDayAgo)
      .not('belongings_photos', 'eq', '{}');

    if (error) throw error;

    let cleaned = 0;
    for (const stay of (stays || [])) {
      const photos = stay.belongings_photos || [];
      if (photos.length === 0) continue;

      // Extract storage paths from URLs
      const paths: string[] = [];
      for (const url of photos) {
        const match = url.match(/hotel-belongings\/(.+)$/);
        if (match) paths.push(match[1]);
      }

      if (paths.length > 0) {
        await supabase.storage.from('hotel-belongings').remove(paths);
      }

      await supabase
        .from('hotel_stays')
        .update({ belongings_photos: [], belonging_labels: {} })
        .eq('id', stay.id);

      cleaned++;
    }

    return new Response(
      JSON.stringify({ success: true, cleaned }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
