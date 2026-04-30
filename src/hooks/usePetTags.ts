import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PetTag, NEW_PET_DAYS, isTagActive } from '@/types/petTag';
import { toast } from 'sonner';

/**
 * Hook centralizado para etiquetas de pets.
 * - Carrega todas as etiquetas e mantém realtime sync
 * - Provê CRUD
 * - Inclui sinalizador automático "Novo" para pets cadastrados há ≤ 2 meses
 */
export const usePetTags = (entryDateByClientId?: Record<string, Date | undefined>) => {
  const [tags, setTags] = useState<PetTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase
      .from('pet_tags' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar etiquetas:', error);
      setLoading(false);
      return;
    }
    setTags((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  useEffect(() => {
    const channel = supabase
      .channel('pet-tags-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_tags' }, fetchTags)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTags]);

  const addTag = useCallback(async (
    clientId: string,
    label: string,
    color: string,
    durationDays: number,
  ) => {
    const expires_at = durationDays > 0
      ? new Date(Date.now() + durationDays * 86400000).toISOString()
      : null;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('pet_tags' as any).insert({
      client_id: clientId,
      label,
      color,
      expires_at,
      created_by: u.user?.id,
      created_by_name: u.user?.user_metadata?.full_name || u.user?.email || '',
    } as any);
    if (error) { toast.error('Erro ao criar etiqueta'); return false; }
    toast.success('Etiqueta criada');
    await fetchTags();
    return true;
  }, [fetchTags]);

  const deleteTag = useCallback(async (tagId: string) => {
    const { error } = await supabase.from('pet_tags' as any).delete().eq('id', tagId);
    if (error) { toast.error('Erro ao excluir etiqueta'); return false; }
    await fetchTags();
    return true;
  }, [fetchTags]);

  /** Returns active manual tags + auto "Novo" if applicable */
  const getEffectiveTags = useCallback((clientId: string): PetTag[] => {
    const manual = tags.filter(t => t.client_id === clientId && isTagActive(t));

    // Auto "Novo" tag (não persistida)
    const entry = entryDateByClientId?.[clientId];
    const auto: PetTag[] = [];
    if (entry) {
      const ageDays = (Date.now() - new Date(entry).getTime()) / 86400000;
      if (ageDays >= 0 && ageDays <= NEW_PET_DAYS) {
        const expiresMs = new Date(entry).getTime() + NEW_PET_DAYS * 86400000;
        auto.push({
          id: `auto-new-${clientId}`,
          client_id: clientId,
          label: 'Novo',
          color: '#22c55e',
          auto_kind: 'new_pet',
          expires_at: new Date(expiresMs).toISOString(),
          created_by_name: 'Sistema',
          created_at: new Date(entry).toISOString(),
          updated_at: new Date(entry).toISOString(),
        });
      }
    }
    return [...auto, ...manual];
  }, [tags, entryDateByClientId]);

  return useMemo(() => ({
    tags, loading, addTag, deleteTag, getEffectiveTags, refresh: fetchTags,
  }), [tags, loading, addTag, deleteTag, getEffectiveTags, fetchTags]);
};
