import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STORAGE_BUCKET = 'avatars';
const STORAGE_PREFIX = 'clients/';

const mimeToExtension = (mimeType: string) => {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
};

const decodeDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de foto inválido');
  }

  const [, mimeType, base64Data] = match;
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { mimeType, bytes };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Credenciais do backend não disponíveis');
    }

    if (!authorization?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authorization.replace('Bearer ', '').trim();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) throw roleError;
    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Apenas admin pode migrar fotos' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.min(body.limit, 100) : 100;

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, photo')
      .like('photo', 'data:image/%')
      .limit(limit);

    if (clientsError) throw clientsError;

    let migrated = 0;
    const failures: Array<{ client_id: string; name: string; error: string }> = [];

    for (const client of clients || []) {
      try {
        if (!client.photo) continue;

        const { mimeType, bytes } = decodeDataUrl(client.photo);
        const extension = mimeToExtension(mimeType);
        const filePath = `${STORAGE_PREFIX}${client.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, bytes, {
            upsert: true,
            contentType: mimeType,
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from('clients')
          .update({ photo: publicUrlData.publicUrl })
          .eq('id', client.id);

        if (updateError) throw updateError;

        migrated += 1;
      } catch (error) {
        failures.push({
          client_id: client.id,
          name: client.name,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: clients?.length || 0,
      migrated,
      failed: failures.length,
      failures,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro interno',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
