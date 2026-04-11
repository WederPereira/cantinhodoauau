

## Plano de Melhorias Gerais do App Cantinho do AuAu

### 1. QR Code do perfil — usar mesmo estilo do ID Card
O QR Code no `ClientDetailSheet.tsx` usa `QRCodeCanvas` básico com logo. Será atualizado para usar o mesmo design/estilo do componente `DogIdCard`, com visual consistente (cores, tamanho, margem).

### 2. Remover pedido de notificação que está bugando
Remover o `Notification.requestPermission()` automático do `TaskNotifications.tsx` (linha 62-66) e do `Header.tsx`. Manter as notificações funcionando apenas se o usuário já tiver dado permissão previamente — sem popup automático.

### 3. Navegação mais profissional e clara
**Header (desktop):** Redesenhar com ícones mais limpos, labels sempre visíveis, indicador ativo mais destacado (barra inferior ou pill colorido), e remover "Relatórios" separado (será integrado).

**Bottom Navbar (mobile):** Manter 5 itens mas com labels mais claras: Dashboard, Pets, Mural, Planilha, Conta. Ícones com estilo consistente e indicador ativo mais visível.

**Abas do Dashboard (horizontal):** Redesenhar as 5 tabs internas (Geral, Creche, Táxi, Hotel, Saúde) com design mais clean — ícones arredondados, texto sempre legível, melhor espaçamento.

### 4. Visual mais profissional
- Cards com sombras e bordas mais sutis
- Tipografia mais hierárquica (títulos maiores, subtítulos menores)
- Espaçamento consistente entre seções
- Cores mais harmoniosas nos indicadores de status
- Loading states mais elegantes

### 5. Otimizar código / deixar mais leve
- Verificar imports desnecessários
- Consolidar lógica de badge de notificação (duplicada entre Header e BottomNavbar) em um hook compartilhado `useNotificationBadges`
- Revisar componentes pesados que podem ser simplificados

### 6. Filtro e barra de pesquisa na aba de Presença
No `DaycarePresence.tsx`, adicionar:
- Campo de busca por nome do dog ou tutor
- Filtro por status (comeu / não comeu / todos)

### 7. Antipulgas: adicionar Wellpet e duração de 45 dias
- Em `src/types/client.ts`: adicionar `45` ao tipo `durationMonths`
- Em `HealthControlTab.tsx` e `HealthHistorySection.tsx`: adicionar opção "45 dias" nos selects de duração
- A marca "Wellpet" é apenas texto digitado pelo usuário no campo brand (já funciona)

### 8. Consolidar analytics na aba Relatórios
Mover `FrequencyAnalytics` (da Creche) e `HotelAnalyticsTab` (do Hotel) para a página `ReportsPage.tsx`, organizados em seções:
- **Visão Geral**: KPIs existentes (total clientes, novos por mês)
- **Creche**: Frequência por dia da semana, calendário de entradas, ranking
- **Hotel**: Ocupação, taxa de alimentação, medicamentos

Remover as sub-abas de "Análise" de dentro das abas Creche e Hotel do Dashboard para evitar duplicação.

### 9. Resumo do app para apresentação
Gerar um documento PDF profissional em `/mnt/documents/` com:
- O que é o Cantinho do AuAu
- Funcionalidades principais (Dashboard, Creche, Hotel, Saúde, QR Code, Mural, Planilha)
- Diferenciais (tempo real, controle de saúde, notificações, PWA)

### Detalhes Técnicos

**Arquivos a criar:**
- `src/hooks/useNotificationBadges.ts` — hook compartilhado para badges
- PDF de resumo em `/mnt/documents/`

**Arquivos a editar:**
- `src/types/client.ts` — adicionar 45 ao tipo durationMonths
- `src/components/Header.tsx` — redesign nav, remover notification request
- `src/components/BottomNavbar.tsx` — redesign nav, usar hook compartilhado
- `src/components/TaskNotifications.tsx` — remover auto-request de notificação
- `src/components/dashboard/DaycarePresence.tsx` — adicionar busca e filtro
- `src/components/dashboard/DaycareTab.tsx` — remover aba Análise
- `src/components/dashboard/HotelTab.tsx` — remover aba de analytics inline
- `src/pages/ReportsPage.tsx` — integrar FrequencyAnalytics + HotelAnalyticsTab
- `src/components/dashboard/HealthControlTab.tsx` — adicionar 45 dias
- `src/components/HealthHistorySection.tsx` — adicionar 45 dias
- `src/components/ClientDetailSheet.tsx` — atualizar QR code style
- `src/context/ClientContext.tsx` — suportar durationMonths 45

**Migração de banco:** Nenhuma necessária (45 é armazenado como integer no campo `duration_months`).

