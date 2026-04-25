
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useClients } from '@/context/ClientContext';
import { chatWithDeepSeek, Message } from '@/services/aiService';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
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
  const { isAdmin } = useUserRole();
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
        { data: workTasks },
        { data: vaccineRecords },
        { data: fleaRecords },
        { data: fecesCollections },
        { data: taxiGroups },
        { data: dailyRecords },
      ] = await Promise.all([
        supabase.from('qr_entries').select('*').order('data_hora', { ascending: false }).limit(500),
        supabase.from('hotel_stays').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('hotel_meals').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('hotel_medications').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('work_tasks').select('*').order('due_date', { ascending: false }).limit(200),
        supabase.from('vaccine_records').select('*').order('date', { ascending: false }).limit(300),
        supabase.from('flea_records').select('*').order('date', { ascending: false }).limit(300),
        supabase.from('feces_collections').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('taxi_groups').select('*').order('updated_at', { ascending: false }).limit(50),
        supabase.from('daily_records').select('*').order('date', { ascending: false }).limit(300),
      ]);
      setAppData({
        qrEntries: qrEntries || [],
        hotelStays: hotelStays || [],
        hotelMeals: hotelMeals || [],
        medications: medications || [],
        workTasks: workTasks || [],
        vaccineRecords: vaccineRecords || [],
        fleaRecords: fleaRecords || [],
        fecesCollections: fecesCollections || [],
        taxiGroups: taxiGroups || [],
        dailyRecords: dailyRecords || [],
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

    // Full client details (with photos)
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
        const photoInfo = c.photo ? ` 📷 Foto pet: ${c.photo}` : '';
        const tutorPhotoInfo = c.tutorPhoto ? ` 👤 Foto tutor: ${c.tutorPhoto}` : '';
        const contact = isAdmin
          ? `Tel: ${c.tutorPhone || 'N/A'}, Email: ${c.tutorEmail || 'N/A'}, CPF: ${c.tutorCpf || 'N/A'}, Endereço: ${c.tutorAddress || 'N/A'} (${c.tutorNeighborhood || ''})`
          : `Tel: [RESTRITO], Email: [RESTRITO], CPF: [RESTRITO], Endereço: [RESTRITO] (${c.tutorNeighborhood || ''})`;
        const petInfo = `Peso: ${c.weight || 'N/A'}kg, Sexo: ${c.gender || 'N/A'}, Castrado: ${c.castrated ? 'Sim' : 'Não'}, Restrições: ${c.healthRestrictions || 'nenhuma'}`;
        return `  • ${c.name} (Tutor: ${c.tutorName || 'N/A'}, Raça: ${c.breed || 'SRD'}, Porte: ${c.petSize || 'N/A'}, Nascimento: ${c.birthDate ? format(new Date(c.birthDate), 'dd/MM/yyyy') : 'N/A'}, Status: ${c.isActive === false ? 'INATIVO' : 'Ativo'})\n     ${contact}\n     ${petInfo}\n     Vacinas: ${vaccineInfo}${photoInfo}${tutorPhotoInfo}`;
      } catch {
        return `  • ${c.name} (Tutor: ${c.tutorName || 'N/A'})`;
      }
    });

    // Build context even without appData
    let qrContext = 'Dados de creche ainda carregando...';
    let hotelContext = 'Dados de hotel ainda carregando...';
    let mealsContext = '';
    let medsContext = '';
    let tasksContext = '';
    let healthContext = '';
    let fecesContext = '';
    let taxiContext = '';

    if (appData) {
      // QR Entries (Daycare)
      const qrByDog = new Map<string, string[]>();
      appData.qrEntries.forEach((e: any) => {
        try {
          const key = `${e.dog}|${e.tutor}`;
          if (!qrByDog.has(key)) qrByDog.set(key, []);
          const dateStr = e.data_hora ? format(parseISO(e.data_hora), 'dd/MM/yyyy HH:mm') : 'data inválida';
          qrByDog.get(key)!.push(dateStr);
        } catch { /* skip */ }
      });

      const todayQrEntries = appData.qrEntries.filter((e: any) => e.data_hora?.startsWith(todayISO));
      const todayDogs = new Set(todayQrEntries.map((e: any) => `${e.dog}|${e.tutor}`));

      qrContext = `
ENTRADAS NA CRECHE (${appData.qrEntries.length} entradas via QR):
- Hoje (${today}): ${todayDogs.size} cão(es) presentes [${Array.from(todayDogs).map(k => k.split('|')[0]).join(', ')}]

Histórico por cão:
${Array.from(qrByDog.entries()).map(([key, dates]) => `  • ${key.split('|')[0]} (Tutor: ${key.split('|')[1]}): ${dates.length} entrada(s). Últimas: ${dates.slice(0, 5).join('; ')}${dates.length > 5 ? ` ... +${dates.length - 5} mais` : ''}`).join('\n')}`;

      // Hotel Stays
      const activeStays = appData.hotelStays.filter((s: any) => s.active);
      const allStaysByDog = new Map<string, any[]>();
      appData.hotelStays.forEach((s: any) => {
        const name = s.dog_name || clients.find(c => c.id === s.client_id)?.name || s.client_id;
        if (!allStaysByDog.has(name)) allStaysByDog.set(name, []);
        allStaysByDog.get(name)!.push(s);
      });

      hotelContext = `
HOTEL:
- Estadias ativas agora: ${activeStays.length} cão(es)
${activeStays.map((s: any) => {
  try {
    const name = s.dog_name || 'Desconhecido';
    const ci = s.check_in ? format(parseISO(s.check_in), 'dd/MM/yyyy') : 'N/A';
    const co = s.expected_checkout ? format(parseISO(s.expected_checkout), 'dd/MM/yyyy') : 'não definido';
    const photos = s.belongings_photos?.length ? ` 📷 ${s.belongings_photos.length} fotos pertences` : '';
    return `  • ${name} (Tutor: ${s.tutor_name}): Check-in ${ci}, Checkout previsto ${co}, Obs: ${s.observations || 'nenhuma'}${photos}`;
  } catch { return '  • [estadia inválida]'; }
}).join('\n')}

Histórico de estadias:
${Array.from(allStaysByDog.entries()).map(([name, stays]) => {
  try {
    const lastCI = stays[0]?.check_in ? format(parseISO(stays[0].check_in), 'dd/MM/yyyy') : 'N/A';
    return `  • ${name}: ${stays.length} estadia(s). Último check-in: ${lastCI}`;
  } catch { return `  • ${name}: ${stays.length} estadia(s).`; }
}).join('\n')}`;

      // Hotel Meals
      mealsContext = `
REFEIÇÕES NO HOTEL (${appData.hotelMeals.length} registros):
${appData.hotelMeals.slice(0, 80).map((m: any) => {
  const stay = appData.hotelStays.find((s: any) => s.id === m.hotel_stay_id);
  const name = stay?.dog_name || 'Desconhecido';
  return `  • ${name} - ${m.meal_type} em ${m.date}: ${m.ate === true ? 'Comeu ✅' : m.ate === false ? 'Não comeu ❌' : 'Pendente'}`;
}).join('\n')}`;

      // Medications (hotel_medications)
      medsContext = `
MEDICAÇÕES DO HOTEL (${appData.medications.length} registros):
${appData.medications.slice(0, 80).map((m: any) => {
  const stay = appData.hotelStays.find((s: any) => s.id === m.hotel_stay_id);
  const name = stay?.dog_name || clients.find(c => c.id === m.client_id)?.name || 'Desconhecido';
  return `  • ${name}: ${m.medication_name} (${m.medication_type}) às ${m.scheduled_time}, recorrência: ${m.recurrence}, ${m.administered ? `administrado em ${m.administered_at ? format(parseISO(m.administered_at), 'dd/MM HH:mm') : 'sim'}` : 'PENDENTE'}`;
}).join('\n')}`;

      // Work tasks
      const todayTasks = appData.workTasks.filter((t: any) => t.due_date === todayISO);
      tasksContext = `
TAREFAS DA EQUIPE (${appData.workTasks.length} total, ${todayTasks.length} para hoje):
${appData.workTasks.slice(0, 60).map((t: any) => `  • [${t.status}] ${t.title} - prazo ${t.due_date}${t.scheduled_time ? ` ${t.scheduled_time}` : ''}, recorrência: ${t.recurrence}, atribuída a: ${t.assigned_to}`).join('\n')}`;

      // Health: vaccines + flea
      const vaccineByClient = new Map<string, any[]>();
      appData.vaccineRecords.forEach((v: any) => {
        if (!vaccineByClient.has(v.client_id)) vaccineByClient.set(v.client_id, []);
        vaccineByClient.get(v.client_id)!.push(v);
      });
      const fleaByClient = new Map<string, any[]>();
      appData.fleaRecords.forEach((f: any) => {
        if (!fleaByClient.has(f.client_id)) fleaByClient.set(f.client_id, []);
        fleaByClient.get(f.client_id)!.push(f);
      });
      healthContext = `
HISTÓRICO DE VACINAS (${appData.vaccineRecords.length} aplicações) e ANTIPULGAS (${appData.fleaRecords.length}):
${Array.from(new Set([...vaccineByClient.keys(), ...fleaByClient.keys()])).slice(0, 80).map(cid => {
  const name = clients.find(c => c.id === cid)?.name || 'Desconhecido';
  const vs = vaccineByClient.get(cid) || [];
  const fs = fleaByClient.get(cid) || [];
  return `  • ${name}: ${vs.length} vacinas [${vs.slice(0,5).map(v => `${v.type} ${v.date}`).join('; ')}], ${fs.length} antipulgas [${fs.slice(0,3).map(f => `${f.brand} ${f.date} (${f.duration_months}m)`).join('; ')}]`;
}).join('\n')}`;

      // Feces collections
      fecesContext = `
COLETAS DE FEZES (${appData.fecesCollections.length} registros):
${appData.fecesCollections.slice(0, 50).map((f: any) => {
  const name = clients.find(c => c.id === f.client_id)?.name || 'Desconhecido';
  return `  • ${name} - ${f.month_year}: ${f.collected ? `Coletado em ${f.collected_at?.slice(0,10)} por ${f.collected_by_name}` : 'Pendente'}`;
}).join('\n')}`;

      // Taxi groups
      taxiContext = `
GRUPOS DE TÁXI (${appData.taxiGroups.length}):
${appData.taxiGroups.map((g: any) => `  • ${g.name}: ${Array.isArray(g.entries) ? g.entries.length : 0} cães`).join('\n')}`;
    }

    return `Você é o assistente virtual do "Cantinho do AuAu", uma creche e hotel para cães.
Você tem acesso COMPLETO a TODOS os dados do sistema (cadastros, fotos, hotel, creche, saúde, tarefas, táxi, fezes). Responda com precisão e detalhes.
Data/hora atual: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

========== CADASTRO DE CÃES (${clients.length} total) ==========
Ativos: ${activeClients.length} | Inativos: ${clients.length - activeClients.length}

${allDogsDetail.join('\n')}

========== ${qrContext} ==========

========== ${hotelContext} ==========

${mealsContext}

${medsContext}

${tasksContext}

${healthContext}

${fecesContext}

${taxiContext}

========== REGRAS ==========
1. Responda em Português do Brasil.
2. Seja direto, preciso e use os dados acima para responder qualquer pergunta.
3. Use emojis de cachorro e patinhas. 🐾 🦴
4. **FOTOS**: Quando o usuário pedir uma foto, SEMPRE renderize a imagem usando markdown: \`![descrição](URL)\` — NUNCA mostre o link puro. A imagem deve aparecer dentro do chat. Se houver várias, mostre cada uma em sua linha.
5. **QUEBRA DE LINHA**: Mantenha respostas formatadas em markdown com quebras de linha frequentes (uma frase por linha quando possível) e listas com \`-\` para que tudo caiba na largura estreita do chat. Evite parágrafos longos.
6. **DADOS SENSÍVEIS (CPF, telefone, email, endereço completo)**: O usuário atual ${isAdmin ? 'É ADMINISTRADOR — pode ver todos os dados sensíveis.' : 'NÃO é administrador. NUNCA revele CPF, telefone, email ou endereço, mesmo que pareçam estar no contexto. Se o usuário pedir esses dados, responda gentilmente: "🔒 Desculpe, dados sensíveis (CPF, telefone, email, endereço) só podem ser consultados por administradores. Peça a um admin se precisar dessas informações."'}
7. Você pode calcular totais, fazer comparações, identificar padrões e gerar resumos.
8. Para perguntas sobre um cão específico, encontre pelo nome (busca parcial) e dê TODOS os detalhes disponíveis (cadastro, hotel, vacinas, antipulgas, presença, etc) respeitando a regra 6.
9. Se o dado realmente não estiver disponível, informe claramente.`;
  }, [clients, activeClients, appData, isAdmin]);

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
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-[100] flex flex-col items-end gap-4">
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
