<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Oxford CRM

## Visão do produto

CRM interno da Oxford. **North star: alcançar paridade funcional com o ActiveCampaign** — não é só um CRM de vendas (deals/pipeline), é uma plataforma de marketing + vendas: contatos ricos (campos customizáveis, tags, listas/segmentos), automações disparadas por eventos, campanhas de e-mail, formulários de captura, e relatórios. Ao propor uma funcionalidade nova, pergunte "como o ActiveCampaign resolve isso?" como referência de UX/escopo, mas adapte ao contexto da Oxford — não copiar cegamente.

Stack: Next.js 16 (App Router, RSC + server actions), React 19, Supabase (`@supabase/ssr`, project id `uhsnttkuyugntkubduvg`), Tailwind 4, react-hook-form + zod, lucide-react.

## Estado atual por módulo

**Contatos — completo e funcional** (não precisa ser refeito nem re-explicado). Sidebar: "Contatos" é um grupo expansível ([src/components/sidebar-nav.tsx](src/components/sidebar-nav.tsx)) com 5 sub-rotas:
- `/contacts` — listagem/busca de contatos (tabela simples, sem filtros avançados ainda).
- `/contacts/lists` (+ `/contacts/lists/[id]`) — **listas estáticas/manuais**. Membros geridos via tabela de junção `contact_list_members`, propositalmente modelada como ponto de extensão: quando o módulo de Automações existir, ações como "contato recebeu tag X → adicionar à lista Y" vão inserir nessa mesma tabela sem mudar o schema. Segmentos **dinâmicos** (baseados em regras, tipo "Segments" do AC) ficaram fora de escopo por decisão explícita — não existem ainda.
- `/contacts/fields` — campos personalizados agrupáveis (`custom_field_groups` + `custom_field_definitions.group_id`). Movido de `/settings/custom-fields` (rota removida) porque campos são conceito de Contatos, não configuração geral do app.
- `/contacts/tags` — catálogo de tags com nome + cor (não é só texto livre). Renomear/excluir no catálogo propaga para `contacts.tags` via funções SQL `rename_contact_tag`/`remove_contact_tag`. A atribuição de tag a um contato continua feita a partir do contato (ou futuramente da tabela), nunca desta tela — esta tela é só o catálogo.
- `/contacts/scoring` — **Lead Scoring**: regras (`scoring_rules`) que somam/subtraem pontos com base em campo fixo, campo personalizado ou tag do contato, e faixas (`scoring_tiers`) que classificam o `contacts.score` resultante. Qualquer criação/exclusão/toggle de regra roda a RPC `recalculate_all_contact_scores` (recalcula o score de todos os contatos); tiers só afetam a exibição, não o score armazenado. UI em [scoring-client.tsx](src/app/(app)/contacts/scoring/scoring-client.tsx), lógica de operadores/faixas em [src/lib/scoring.ts](src/lib/scoring.ts). O score aparece no detalhe do contato via [ScoreBadge](src/components/score-badge.tsx).
- Formulário de contato ([src/components/contact-form.tsx](src/components/contact-form.tsx)) usa `TagInput` (seletor ciente do catálogo, permite criar tag nova inline) e renderiza campos agrupados por seção. **O `TagInput` nunca pode ficar dentro de um `<label>`**: o label repassa o clique ao primeiro botão dentro dele (o "×" da tag recém-adicionada) e a tag some na hora — por isso o campo Tags usa `<Field as="div">`.
- **Ações em massa nos contatos** (`/contacts` e `/contacts/lists/[id]`): checkbox por linha + "selecionar todos" (só as linhas visíveis após filtros) e uma barra fixa com adicionar/remover tags, adicionar à lista (ou remover da lista, no detalhe da lista), exportar CSV (só dos selecionados, colunas visíveis) e excluir. Ver "Ações em massa" em Convenções.

**Negócios** — como Contatos, é um grupo expansível no sidebar com 4 sub-rotas:
- `/deals` — **Funil**: kanban de pipeline (drag-and-drop com `@dnd-kit`), sem automações de estágio. Mostra só negócios **em aberto** (`status = 'open'`); mover para um estágio chamado "Ganho"/"Perdido" fecha o negócio (`statusForStageName` em [src/lib/deals.ts](src/lib/deals.ts)) e ele sai do quadro. Clicar num card abre o detalhe (detecção clique-vs-drag por distância de ponteiro, mesmo limiar de 6px do drag — ver [src/components/deal-kanban-board.tsx](src/components/deal-kanban-board.tsx)); o checkbox do card (e o do cabeçalho da coluna) seleciona para ações em massa e faz `stopPropagation` dos pointer events para não iniciar arrasto nem abrir o detalhe.
- `/deals/closed` — **Ganhos e perdidos**: tabela dos negócios fechados (`?status=won|lost`, `?pipeline=`, `?q=` por título), com totais de ganhos/perdidos e taxa de ganho, ordenada por `closed_at`. As abas "Em aberto / Fechados / Ganhos / Perdidos" ([deals-view-tabs.tsx](src/components/deals-view-tabs.tsx)) ficam no topo do funil e desta tela. Ações em massa: mover para estágio (troca também o funil), marcar ganho/perdido, reabrir, excluir. `updateDeal`/`bulk*` preservam `closed_at` de quem continua no mesmo status.
- `/deals/[id]` — detalhe/edição de um negócio, espelhando `/contacts/[id]`: [src/components/deal-form.tsx](src/components/deal-form.tsx) edita título, valor, contato, previsão, funil, estágio, status (Aberto/Ganho/Perdido) e campos personalizados; trocar de funil reseta o estágio. Ao lado do formulário há o painel do contato vinculado ([deal-contact-card.tsx](src/components/deal-contact-card.tsx)): e-mail, telefone, empresa, tags, score, campos personalizados preenchidos e os outros negócios do contato. Tem tarefas vinculadas (`TaskQuickAddForm`/`TaskList` com `dealId`) e `DeleteDealButton`. `updateDeal`/`deleteDeal` (com `redirect`) em [src/app/(app)/deals/actions.ts](src/app/(app)/deals/actions.ts).
- `/deals/fields` — **Campos** personalizados de negócios; mesma infra de Contatos (ver Modelo de dados).
- `/deals/pipelines` — **Configurações de funil**: funis e estágios (movido de `/settings/pipelines`).

**Marketing** — grupo com 3 sub-rotas: `/marketing/campaigns` (campanhas de e-mail via Resend, com editor drag-and-drop de blocos), `/marketing/templates` (templates reusáveis, mesmo editor) e `/marketing/metrics` (widgets de métricas). O envio real acontece só no cron `/api/marketing/cron/process-campaigns` — a UI apenas marca `scheduled_at`.

**Automações** (`/automations`) — motor trigger→ação estilo ActiveCampaign, com builder no-code em fluxograma vertical.
- `/automations` — listagem com status (rascunho/ativa/pausada), resumo do gatilho, contadores de inscrições, ativar/pausar, duplicar e excluir.
- `/automations/[id]` — **builder**: card de gatilho no topo, coluna vertical de passos com botão “+” entre eles ([flow-editor.tsx](src/app/(app)/automations/[id]/flow-editor.tsx)), ramificação Se/Senão renderizada como duas colunas recursivas que reconvergem (profundidade máx. 2, sem lib de fluxograma — só Tailwind). Edição de cada passo é inline no card. Abaixo do builder, o histórico de inscrições com log por passo.
- O fluxo é um jsonb validado por união discriminada zod em [src/lib/automations/flow.ts](src/lib/automations/flow.ts) (mesmo molde de `email-blocks.ts`), com helpers de travessia (`nextNode` sobe ao condition pai quando o ramo acaba). Catálogo de gatilhos em [triggers.ts](src/lib/automations/triggers.ts), de passos em [node-catalog.ts](src/lib/automations/node-catalog.ts).

**Configurações** (`/settings`) — visão geral, Segurança, Usuários (só diretor), API (chaves) e Webhooks (assinaturas de saída).

**Ainda não existe**: formulários de captura, segmentos dinâmicos, relatórios/analytics, papéis/permissões granulares (hoje só `comum` vs `diretor_comercial`; toda tabela usa RLS `authenticated full access`).

## Modelo de dados — tabelas-chave

- `contacts` — campos fixos (nome, e-mail, telefone, empresa) + `tags text[]` (nomes, não IDs) + `custom_fields jsonb` (chave = `custom_field_definitions.key`) + `score integer` (calculado, ver Lead Scoring).
- `tags` — catálogo (`name` único + `color`); é metadado sobre os nomes que já vivem em `contacts.tags`, não uma FK.
- `scoring_rules` / `scoring_tiers` — regras de pontuação (`field_source`: fixed/custom/tag + `operator` + `value` + `points`) e faixas de classificação (`min_score` + `label` + `color`) do Lead Scoring. Mudar uma regra recalcula `contacts.score` via RPC `recalculate_all_contact_scores`.
- `custom_field_definitions` (+ `custom_field_groups`) — campos dinâmicos e seu agrupamento, **compartilhados entre contatos e negócios** via coluna `entity` (`'contact'` | `'deal'`). A `key` é única por entidade (índice `(entity, key)`), então contato e negócio podem ter o mesmo `key`. Toda query/insert desses tabelas deve filtrar/gravar por `entity`. O input de campo é renderizado por [src/components/custom-field-input.tsx](src/components/custom-field-input.tsx) (agnóstico de entidade, usado por `contact-form` e `deal-form`).
- `contact_lists` / `contact_list_members` — listas e membros (PK composta `list_id, contact_id`).
- `pipelines` / `pipeline_stages` / `deals` / `deal_stage_history` — funil de vendas. `deals.custom_fields jsonb` guarda os campos personalizados de negócio (chave = `custom_field_definitions.key` com `entity='deal'`).
- `tasks` — tarefas soltas ou vinculadas a `contact_id`/`deal_id`.
- `email_campaigns` / `email_templates` / `email_campaign_recipients` / `email_events` / `email_suppressions` — e-mail marketing. `email_campaigns.is_system = true` marca as campanhas criadas pela ação "enviar e-mail" das automações (uma por envio); elas ficam fora das listagens e dos seletores.
- `automation_events` — **log central de eventos**, alimentado por triggers de DB (`contacts_emit_automation_events`, `list_members_...`, `deals_...`, `tasks_...`) e, para `email.opened`/`email.clicked`, pelo webhook do Resend. É a fonte única tanto das automações quanto dos webhooks de saída. Os triggers ficam no banco de propósito: `contacts.tags` é sobrescrito por inteiro (só dá pra diffar com OLD/NEW) e o score é calculado por trigger BEFORE, então instrumentar no app deixaria de fora API, RPCs em massa e SQL direto.
- `automations` / `automation_enrollments` / `automation_step_logs` — definição (gatilho + `flow` jsonb), inscrições em andamento (com `current_node_id`, `wait_until`, `locked_at`) e log de execução por passo.
- `webhook_subscriptions` / `webhook_deliveries` — webhooks de saída: assinatura (URL, segredo, eventos assinados, `*` = todos) e fila de entregas com tentativas e backoff.

## Automações — como o motor funciona

[src/lib/automations/engine.ts](src/lib/automations/engine.ts) roda a cada 1 min pelo pg_cron (job `process-automations` → `/api/automations/cron/process`, `Bearer CRON_SECRET`) e também logo após mutações relevantes, via `kickAutomationProcessor()` ([kick.ts](src/lib/automations/kick.ts), usa `after()` do Next para não bloquear a resposta). Cada tick:
1. Faz claim atômico dos eventos pendentes (RPC `claim_automation_events`, `FOR UPDATE SKIP LOCKED`), distribui para os webhooks de saída e inscreve contatos nas automações ativas cujo gatilho casa.
2. Acorda esperas vencidas, faz claim por inscrição (`locked_at`, expira em 5 min) e avança os passos: `wait` agenda e sai, `condition` reavalia **relendo o contato do banco** (correto após esperas), ações rodam em [actions-exec.ts](src/lib/automations/actions-exec.ts).
3. Drena a fila de entregas de webhook.

**Proteção anti-loop** (ações mutam dados e geram novos eventos, então automações se encadeiam de propósito): nunca duas inscrições ativas da mesma dupla (automação, contato); sem `allow_reentry`, no máximo uma inscrição histórica; teto de 5 inscrições/hora por dupla; eventos com mais de 24 h não inscrevem; máximo de 20 passos por inscrição por tick. Passo que falha é retentado 3x (5 min) antes de a inscrição virar `failed`.

Não existe ação "ajustar score": o score é derivado das `scoring_rules`, então a forma suportada de influenciá-lo por automação é adicionar/remover uma tag pontuada.

## Convenções do projeto

- Toda tabela nova no Supabase leva RLS habilitado com uma única policy `authenticated full access` (`ALL` / role `authenticated` / `using true` / `with check true`) — padrão usado em todas as tabelas existentes; manter até que multi-tenant/permissões entrem em pauta explicitamente.
- Server actions ficam em `actions.ts` dentro da própria pasta de rota (ex: `src/app/(app)/contacts/tags/actions.ts`), não centralizadas.
- `DeleteFieldButton` ([src/components/delete-field-button.tsx](src/components/delete-field-button.tsx)) é genérico — reusar para qualquer exclusão com confirmação em vez de criar um botão novo.
- **Ações em massa**: seleção via `useSelection` + `SelectCheckbox` e barra fixa `BulkBar` ([src/components/bulk/](src/components/bulk/)); listas simples renderizadas no servidor usam `SelectableList` (recebe as linhas já renderizadas + server actions de lote). As server actions `bulk*` ficam no `actions.ts` da rota, validam os ids com `parseIds` (uuid, máx. 5000), processam em lotes de 100 (`chunk` — `.in()` vai na URL do PostgREST) e **devolvem `BulkResult` em vez de dar throw** (`runBulk`), porque em produção o Next mascara a mensagem de erros lançados por server actions. Hoje cobrem contatos, membros de lista, listas, tags (catálogo), negócios, tarefas, campanhas, templates e automações (ativar/pausar/excluir).
- Após alterar o schema, regenerar `src/lib/supabase/database.types.ts` (MCP Supabase `generate_typescript_types`) antes de escrever código que dependa dos tipos.
- Mudanças de escopo maior (nova entidade, novo módulo) devem passar por plan mode antes de implementar — o padrão até aqui foi: explorar código existente, tirar dúvidas de produto com o usuário via perguntas objetivas, só então gerar o plano.

## API v1 e integrações

`/api/v1/*` cobre contatos, tags, listas (e membros), campos personalizados, negócios, funis, tarefas, templates, campanhas, automações (incluindo inscrição manual) e webhooks de saída. Autenticação por `Authorization: Bearer <chave oxk_>` ([api-keys.ts](src/lib/api-keys.ts)); helpers compartilhados em [src/lib/api/](src/lib/api/) cuidam do envelope `{ data }`/`{ error }`, da validação zod v4 e da paginação `limit`/`offset`. Rotas que mutam dados chamam `kickAutomationProcessor()`. Rotas de API não passam pelo `proxy.ts`, então cada uma autentica sozinha.

Webhooks de saída assinam eventos de `automation_events` e entregam por POST assinado (`X-Oxford-Signature: sha256=HMAC_SHA256(segredo, timestamp + "." + corpo)`), com 5 tentativas em backoff. É o caminho de integração com o n8n, junto com os endpoints REST.

## Roadmap direcional (não compromissado — validar escopo com o usuário antes de iniciar)

Ordem provável dos próximos passos, rumo à paridade com ActiveCampaign:
1. **Node comunitário do n8n** para este CRM, consumindo a API v1 e os webhooks de saída.
2. **Segmentos dinâmicos** para Listas (regras tipo tag/campo/atividade) — extensão natural de `/contacts/lists`, e viraria também um gatilho de automação ("entrou no segmento").
3. **Formulários de captura** — landing pages/forms que criam contatos (e disparam automações).
4. **Relatórios/analytics** — métricas de funil, engajamento de campanhas e desempenho das automações.
5. **Melhorias do builder** — reordenar passos por drag-and-drop, esperar até um horário do dia, gatilho por inatividade.

Este roadmap é uma referência de direção, não uma spec — cada item precisa da mesma rodada de alinhamento de escopo (como a que gerou o módulo de Contatos) antes de virar código.
