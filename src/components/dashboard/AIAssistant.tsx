
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useClients } from '@/context/ClientContext';
import { chatWithDeepSeek, Message } from '@/services/aiService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Send, X, Loader2, User, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppData {
  qrEntries: any[];
  hotelStays: any[];
  hotelMeals: any[];
  medications: any[];
  workTasks: any[];
  vaccineRecords: any[];
  fleaRecords: any[];
  fecesCollections: any[];
  taxiGroups: any[];
  dailyRecords: any[];
  loadedAt: string;
}

export const AIAssistant: React.FC = () => {
  const { clients, activeClients } = useClients();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Fetch all app data from Supabase when the chat is opened
  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [
        { data: qrEntries },
        { data: hotelStays },
        { data: hotelMeals },
        { data: medications },
      ] = await Promise.all([
        supabase.from('qr_entries').select('*').order('data_hora', { ascending: false }).limit(500),
        supabase.from('hotel_stays').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('hotel_meals').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('medications').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      setAppData({
        qrEntries: qrEntries || [],
        hotelStays: hotelStays || [],
        hotelMeals: hotelMeals || [],
        medications: medications || [],
        loadedAt: new Date().toLocaleTimeString('pt-BR'),
      });
    } catch (err) {
      console.error('Error fetching app data for AI:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !appData) {
      fetchAllData();
    }
  }, [isOpen, appData, fetchAllData]);

  // Build a comprehensive context with ALL data
  const dataContext = useMemo(() => {
    const today = format(new Date(), 'dd/MM/yyyy');
    const todayISO = format(new Date(), 'yyyy-MM-dd');

    // Full client details
    const allDogsDetail = clients.map(c => {
      try {
        const vaccineInfo = c.vaccines
          ? Object.entries(c.vaccines)
              .filter(([, v]) => v && typeof v === 'string')
              .map(([k, v]) => {
                try { return `${k}: ${format(parseISO(v as string), 'dd/MM/yyyy')}`; }
                catch { return `${k}: data inválida`; }
              })
              .join(', ') || 'nenhuma'
          : 'nenhuma';
        return `  • ${c.name} (Tutor: ${c.tutorName || 'N/A'}, Raça: ${c.breed || 'SRD'}, Porte: ${c.petSize || 'N/A'}, Nascimento: ${c.birthDate ? format(new Date(c.birthDate), 'dd/MM/yyyy') : 'N/A'}, Status: ${c.isActive === false ? 'INATIVO' : 'Ativo'}, Vacinas: ${vaccineInfo})`;
      } catch {
        return `  • ${c.name} (Tutor: ${c.tutorName || 'N/A'})`;
      }
    });

    // Build context even without appData
    let qrContext = 'Dados de creche ainda carregando...';
    let hotelContext = 'Dados de hotel ainda carregando...';
    let mealsContext = '';

    if (appData) {
      // QR Entries (Daycare)
      const qrByDog = new Map<string, string[]>();
      appData.qrEntries.forEach((e: any) => {
        try {
          const key = `${e.dog}|${e.tutor}`;
          if (!qrByDog.has(key)) qrByDog.set(key, []);
          const dateStr = e.data_hora ? format(parseISO(e.data_hora), 'dd/MM/yyyy HH:mm') : 'data inválida';
          qrByDog.get(key)!.push(dateStr);
        } catch { /* skip invalid entry */ }
      });

      const todayQrEntries = appData.qrEntries.filter((e: any) => e.data_hora?.startsWith(todayISO));
      const todayDogs = new Set(todayQrEntries.map((e: any) => `${e.dog}|${e.tutor}`));

      qrContext = `
ENTRADAS NA CRECHE (últimas ${appData.qrEntries.length} entradas registradas via QR):
- Hoje (${today}): ${todayDogs.size} cão(es) presentes [${Array.from(todayDogs).map(k => k.split('|')[0]).join(', ')}]

Histórico de entradas por cão:
${Array.from(qrByDog.entries()).map(([key, dates]) => `  • ${key.split('|')[0]} (Tutor: ${key.split('|')[1]}): ${dates.length} entrada(s). Datas: ${dates.slice(0, 10).join('; ')}${dates.length > 10 ? ` ... +${dates.length - 10} mais` : ''}`).join('\n')}`;

      // Hotel Stays
      const activeStays = appData.hotelStays.filter((s: any) => s.active);
      const allStaysByDog = new Map<string, any[]>();
      appData.hotelStays.forEach((s: any) => {
        const clientName = clients.find(c => c.id === s.client_id)?.name || s.client_id;
        if (!allStaysByDog.has(clientName)) allStaysByDog.set(clientName, []);
        allStaysByDog.get(clientName)!.push(s);
      });

      hotelContext = `
HOTEL:
- Estadias ativas agora: ${activeStays.length} cão(es)
${activeStays.map((s: any) => {
  try {
    const clientName = clients.find(c => c.id === s.client_id)?.name || 'Desconhecido';
    const ci = s.check_in_date ? format(parseISO(s.check_in_date), 'dd/MM/yyyy') : 'N/A';
    const co = s.expected_checkout_date ? format(parseISO(s.expected_checkout_date), 'dd/MM/yyyy') : 'não definido';
    return `  • ${clientName}: Check-in ${ci}, Checkout previsto ${co}`;
  } catch { return '  • [estadia com data inválida]'; }
}).join('\n')}

Histórico de estadias por cão:
${Array.from(allStaysByDog.entries()).map(([name, stays]) => {
  try {
    const lastCI = stays[0]?.check_in_date ? format(parseISO(stays[0].check_in_date), 'dd/MM/yyyy') : 'N/A';
    return `  • ${name}: ${stays.length} estadia(s). Último check-in: ${lastCI}`;
  } catch { return `  • ${name}: ${stays.length} estadia(s).`; }
}).join('\n')}`;

      // Hotel Meals
      const mealsByStay = new Map<string, any[]>();
      appData.hotelMeals.forEach((m: any) => {
        if (!mealsByStay.has(m.stay_id)) mealsByStay.set(m.stay_id, []);
        mealsByStay.get(m.stay_id)!.push(m);
      });

      mealsContext = `
REFEIÇÕES NO HOTEL (últimas ${appData.hotelMeals.length} registradas):
${appData.hotelMeals.slice(0, 50).map((m: any) => {
  const clientName = clients.find(c => appData.hotelStays.find((s: any) => s.id === m.stay_id && s.client_id === c.id))?.name || 'Desconhecido';
  return `  • ${clientName} - ${m.meal_type} em ${m.meal_date}: ${m.amount || 'N/A'} (${m.brand || 'ração não especificada'})`;
}).join('\n')}`;
    }

    return `Você é o assistente virtual do "Cantinho do AuAu", uma creche e hotel para cães.
Você tem acesso COMPLETO a todos os dados do sistema. Responda com precisão e detalhes.
Data/hora atual: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

========== CADASTRO DE CÃES (${clients.length} total) ==========
Ativos: ${activeClients.length} | Inativos: ${clients.length - activeClients.length}

${allDogsDetail.join('\n')}

========== ${qrContext} ==========

========== ${hotelContext} ==========

${mealsContext}

========== REGRAS ==========
1. Responda em Português do Brasil.
2. Seja direto, preciso e use os dados acima para responder.
3. Use emojis de cachorro e patinhas. 🐾 🦴
4. Se o dado pedido não estiver nos dados acima, informe claramente.
5. Você pode calcular totais, fazer comparações e identificar padrões nos dados.
6. Para perguntas sobre um cão específico, encontre pelo nome (busca parcial) e dê todos os detalhes disponíveis.`;
  }, [clients, activeClients, appData]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const messagesWithContext: Message[] = [
        { role: 'system', content: dataContext },
        ...newMessages
      ];

      const response = await chatWithDeepSeek(messagesWithContext);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Erro: ${error?.message || 'Falha ao conectar com a IA. Verifique sua conexão.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[360px] sm:w-[420px] h-[520px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-4 duration-300 overflow-hidden bg-card/95 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b p-4 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-1.5 rounded-lg">
                <Sparkles size={18} className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">IA Cantinho</CardTitle>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", loadingData ? "bg-amber-400" : "bg-emerald-500")} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {loadingData ? 'Carregando dados...' : `Gemini • ${appData ? `Dados de ${appData.loadedAt}` : 'Sem dados'}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => { setAppData(null); fetchAllData(); }}
                title="Recarregar dados"
                disabled={loadingData}
              >
                <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-70 px-4">
                <div className="p-4 bg-primary/5 rounded-full">
                  <Bot size={44} className="text-primary/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Sou o assistente inteligente!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {loadingData
                      ? '⏳ Carregando todos os dados do app...'
                      : appData
                        ? `✅ Dados carregados! ${appData.qrEntries.length} entradas, ${appData.hotelStays.length} estadias. Pode perguntar qualquer coisa!`
                        : 'Pergunta-me sobre cães, entradas, hotel, vacinas...'}
                  </p>
                </div>
                {!loadingData && appData && (
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['Quantos dogs hoje na creche?', 'Quem está no hotel?', 'Histórico do Abel'].map(s => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-[11px] bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-full transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex w-full gap-2 animate-in fade-in slide-in-from-bottom-2", m.role === 'user' ? "justify-end" : "justify-start")}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={16} className="text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] rounded-2xl p-3 text-sm shadow-sm whitespace-pre-wrap",
                  m.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted/80 border border-border/50 rounded-tl-none text-foreground"
                )}>
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={16} className="text-accent" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start gap-2 animate-in fade-in">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary animate-bounce" />
                </div>
                <div className="bg-muted/80 border border-border/50 rounded-2xl rounded-tl-none p-3 shadow-sm">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t bg-card/50 shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input
                placeholder={loadingData ? "Carregando dados..." : "Pergunte qualquer coisa..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loadingData}
                className="flex-1 bg-background/50 border-primary/20 rounded-xl focus-visible:ring-primary h-10 text-xs"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim() || loadingData}
                className="rounded-xl shadow-lg shadow-primary/20 h-10 w-10 shrink-0"
              >
                <Send size={18} />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl shadow-xl transition-all duration-300 group border-2 border-primary/20",
          isOpen ? "bg-card text-foreground hover:bg-card/90" : "bg-primary text-primary-foreground hover:scale-105 shadow-primary/30"
        )}
      >
        {isOpen ? <X size={24} /> : (
          <div className="relative">
            <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-3 -right-3 w-3 h-3 bg-accent rounded-full animate-pulse border-2 border-background" />
          </div>
        )}
      </Button>
    </div>
  );
};
