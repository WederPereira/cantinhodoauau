import { supabase } from "@/integrations/supabase/client";

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const chatWithAI = async (messages: Message[]): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { messages },
  });

  if (error) {
    throw new Error(error.message || 'Falha ao conectar com a IA.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.text || '';
};

export const chatWithDeepSeek = chatWithAI;
