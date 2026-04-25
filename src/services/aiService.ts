import { supabase } from "@/integrations/supabase/client";

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const chatWithAI = async (messages: Message[]): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { messages },
  });

  // A edge function pode retornar erro com payload JSON (ex: 402, 429).
  // O supabase-js coloca o body em `data` mesmo quando há erro HTTP.
  if (data?.error) {
    throw new Error(data.error);
  }

  if (error) {
    // Tenta extrair mensagem mais clara do contexto
    const ctx: any = (error as any).context;
    if (ctx?.error) throw new Error(ctx.error);
    throw new Error(error.message || 'Falha ao conectar com a IA.');
  }

  return data?.text || '';
};

export const chatWithDeepSeek = chatWithAI;
