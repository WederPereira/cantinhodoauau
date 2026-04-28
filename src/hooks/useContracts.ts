import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contract, ContractPlan, PlanType } from '@/types/contract';
import { toast } from 'sonner';

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [plans, setPlans] = useState<ContractPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('contracts' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('contract_plans' as any).select('*').order('plan_type').order('frequency_per_week'),
    ]);
    setContracts((c as any) || []);
    setPlans((p as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createContract = async (input: Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'cancelled_at' | 'cancellation_fee' | 'pdf_url' | 'docx_url'>) => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('contracts' as any).insert({
      ...input,
      created_by: u.user?.id,
      created_by_name: u.user?.user_metadata?.full_name || u.user?.email || '',
    } as any).select().single();
    if (error) { toast.error('Erro ao criar contrato: ' + error.message); return null; }
    toast.success('Contrato criado!');
    await fetchAll();
    return data as unknown as Contract;
  };

  const updateContract = async (id: string, updates: Partial<Contract>) => {
    const { error } = await supabase.from('contracts' as any).update(updates as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar: ' + error.message); return false; }
    toast.success('Contrato atualizado');
    await fetchAll();
    return true;
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from('contracts' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return false; }
    toast.success('Contrato excluído');
    await fetchAll();
    return true;
  };

  const updatePlan = async (id: string, value: number) => {
    const { error } = await supabase.from('contract_plans' as any).update({ base_monthly_value: value } as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar plano'); return false; }
    await fetchAll();
    return true;
  };

  const findPlan = (planType: PlanType, freq: number) =>
    plans.find(p => p.plan_type === planType && p.frequency_per_week === freq);

  return { contracts, plans, loading, createContract, updateContract, deleteContract, updatePlan, findPlan, refresh: fetchAll };
};
