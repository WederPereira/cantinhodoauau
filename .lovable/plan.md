

## Análise: O que falta para uso profissional e venda B2B

### Problema Principal: Dados no localStorage
O maior bloqueio é que **todos os dados de clientes/pets estão no localStorage do navegador**, não no banco de dados. Isso significa:
- Dados se perdem ao limpar o cache ou trocar de dispositivo
- Não há sincronização entre funcionários — cada um vê dados diferentes
- Não há backup dos dados

### O que precisa ser feito (por prioridade)

**1. Migrar dados de clientes para o banco de dados (CRÍTICO)**
- Criar tabela `clients` no banco com todos os campos atuais
- Criar tabelas `vaccine_records` e `flea_records` relacionadas
- Refatorar o `ClientContext` para ler/gravar no banco em vez do localStorage
- Adicionar RLS para que apenas usuários autenticados acessem os dados
- Todos os funcionários passam a ver os mesmos dados em tempo real

**2. Multi-tenancy (para vender para múltiplas empresas)**
- Adicionar campo `tenant_id` (ou `business_id`) em todas as tabelas
- Cada petshop/creche tem seu espaço isolado de dados
- RLS garante que empresa A nunca vê dados da empresa B
- Criar fluxo de onboarding para novas empresas

**3. Segurança e conformidade**
- Remover as RLS abertas (`Allow all access`) das tabelas `hotel_stays`, `hotel_meals`, `hotel_medications`, `qr_entries`, `daily_records` — hoje qualquer pessoa pode ler/escrever nesses dados
- Implementar foreign keys adequadas entre tabelas
- Adicionar validação de entrada (zod) nos formulários
- LGPD: adicionar termos de uso e política de privacidade

**4. Funcionalidades comerciais ausentes**
- **Financeiro**: Controle de pagamentos, recebimentos, mensalidades (creche), diárias (hotel)
- **Agendamento**: Calendário para agendar serviços
- **Notificações**: WhatsApp/email automático para vacinas vencendo, checkout, etc.
- **Relatórios avançados**: Faturamento, ocupação do hotel, frequência de creche
- **Backup/exportação**: Exportar dados em planilha, backup automático

**5. Experiência e polimento**
- Tratamento de erros em todas as operações do banco
- Loading states consistentes
- Modo offline com sincronização quando voltar online
- Testes automatizados
- Documentação de uso

### Resumo visual

```text
Prioridade    Item                         Status
─────────────────────────────────────────────────
P0 (bloqueia) Dados no banco (não localStorage)  ❌
P0 (bloqueia) RLS seguras nas tabelas             ❌
P1 (venda)    Multi-tenancy                       ❌
P1 (venda)    Módulo financeiro                   ❌
P2 (valor)    Notificações automáticas            ❌
P2 (valor)    Agendamento/calendário              ❌
P3 (qualidade)Validação de formulários            ❌
P3 (qualidade)Tratamento de erros                 parcial
P3 (qualidade)Testes automatizados                ❌
✅ já feito   Auth + roles + auditoria            ✅
✅ já feito   PWA standalone                      ✅
✅ já feito   Hotel/Creche/Taxi/Saúde             ✅
```

### Recomendação de próximo passo
Começar pelo **P0: migrar os dados de clientes para o banco de dados**. Sem isso, o sistema não é confiável para uso profissional — basta limpar o navegador e todos os clientes somem. Posso fazer essa migração mantendo a mesma interface que você já tem.

Quer que eu comece pela migração dos dados para o banco?

