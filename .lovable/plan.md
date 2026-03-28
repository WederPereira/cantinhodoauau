

## Plano: Sistema de Controle de Acesso Admin/Funcionário com Histórico de Ações

### Contexto Atual
- Já existe tabela `user_roles` com enum `app_role` (admin, moderator, user) e função `has_role()`.
- Já existe tabela `action_logs` com RLS que só admin pode ver todos os logs.
- Já existe tabela `profiles` com campo `cargo`.
- O signup está aberto para qualquer pessoa criar conta — precisa restringir.
- Nenhum log de ações está sendo gravado no app atualmente.

### O que será feito

**1. Restringir criação de contas (somente Admin cria funcionários)**
- Remover o botão "Criar Conta" da tela de login pública.
- Na página de Conta (admin), adicionar seção "Gerenciar Funcionários" com: criar conta de funcionário (email + senha + nome + cargo), listar contas existentes, e desativar contas.
- Usar uma Edge Function para criar usuários via `supabase.auth.admin.createUser()` (necessário service role key, já disponível como secret).
- Ao criar, inserir automaticamente na `user_roles` o papel correspondente (monitor/noturnista).

**2. Registrar ações no `action_logs`**
- Criar um hook/utilitário `logAction(action, entityType, entityId, details)` que insere na tabela `action_logs` com o `user_id` e `user_name` do usuário logado.
- Instrumentar as operações principais: check-in/checkout hotel, prolongar estadia, marcar refeição, administrar remédio, adicionar/editar/excluir cliente, registrar entrada creche, atualizar vacina/antipulgas.

**3. Painel de Histórico de Ações (somente Admin)**
- Na página de Conta do admin, adicionar aba/seção "Histórico de Ações" que lista os logs com filtros por funcionário, tipo de ação e data.
- Cada log mostra: quem fez, o quê fez, quando, e detalhes.
- Botão "Desfazer" em ações reversíveis (ex: desfazer check-in, desfazer marcação de refeição) que executa a operação inversa e registra um novo log de reversão.

**4. Proteger dados sensíveis**
- Adicionar RLS nas tabelas `clients` (via context local, sem tabela DB — não se aplica).
- Como os dados de clientes estão no localStorage/context e não no Supabase, a proteção principal é via controle de acesso ao app (login) e logs de auditoria.
- Restringir funcionalidades destrutivas (excluir cliente, apagar estadia) apenas para admin via verificação de role no frontend e RLS no backend.

### Detalhes Técnicos

**Migração DB**: Nenhuma nova tabela necessária — `action_logs` já existe. Pode ser necessário ajustar a enum `app_role` para incluir 'monitor' e 'noturnista' se ainda não existir.

**Edge Function `create-employee`**:
- Recebe: email, password, full_name, role
- Valida que o chamador é admin (via JWT)
- Cria usuário via admin API
- Insere em `user_roles` e `profiles`

**Arquivos modificados**:
- `src/hooks/useActionLog.ts` — novo hook para registrar ações
- `src/hooks/useUserRole.ts` — novo hook para verificar role do usuário logado
- `src/pages/AccountPage.tsx` — seção admin para gerenciar funcionários + histórico
- `src/components/account/EmployeeManager.tsx` — novo componente
- `src/components/account/ActionHistory.tsx` — novo componente
- `supabase/functions/create-employee/index.ts` — nova edge function
- Componentes existentes (HotelTab, HealthControlTab, DaycareTab, ClientContext, etc.) — adicionar chamadas ao `logAction`
- `src/pages/LoginPage.tsx` — remover opção de signup

