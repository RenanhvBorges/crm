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
- Formulário de contato ([src/components/contact-form.tsx](src/components/contact-form.tsx)) usa `TagInput` (seletor ciente do catálogo, permite criar tag nova inline) e renderiza campos agrupados por seção.

**Negócios** — como Contatos, é um grupo expansível no sidebar com 3 sub-rotas:
- `/deals` — **Funil**: kanban de pipeline (drag-and-drop com `@dnd-kit`), sem automações de estágio. Clicar num card abre o detalhe (detecção clique-vs-drag por distância de ponteiro, mesmo limiar de 6px do drag — ver [src/components/deal-kanban-board.tsx](src/components/deal-kanban-board.tsx)).
- `/deals/[id]` — detalhe/edição de um negócio, espelhando `/contacts/[id]`: [src/components/deal-form.tsx](src/components/deal-form.tsx) edita título, valor, contato, previsão, funil, estágio, status (Aberto/Ganho/Perdido) e campos personalizados; trocar de funil reseta o estágio. Tem tarefas vinculadas (`TaskQuickAddForm`/`TaskList` com `dealId`) e `DeleteDealButton`. `updateDeal`/`deleteDeal` (com `redirect`) em [src/app/(app)/deals/actions.ts](src/app/(app)/deals/actions.ts).
- `/deals/fields` — **Campos** personalizados de negócios; mesma infra de Contatos (ver Modelo de dados).
- `/deals/pipelines` — **Configurações de funil**: funis e estágios (movido de `/settings/pipelines`).

**Tarefas** (`/tasks`) — lista simples vinculável a contato/negócio.

**Configurações** (`/settings`) — página placeholder do menu global de Configurações, reservada para ajustes futuros (senha, domínios de e-mail). As configurações de funil saíram daqui para Negócios → Configurações de funil.

**Ainda não existe**: automações (triggers/actions), campanhas de e-mail, formulários de captura, segmentos dinâmicos, relatórios/analytics, papéis/permissões por usuário (hoje é single-tenant: toda tabela usa RLS `authenticated full access`, sem distinção de usuário/equipe).

## Modelo de dados — tabelas-chave

- `contacts` — campos fixos (nome, e-mail, telefone, empresa) + `tags text[]` (nomes, não IDs) + `custom_fields jsonb` (chave = `custom_field_definitions.key`) + `score integer` (calculado, ver Lead Scoring).
- `tags` — catálogo (`name` único + `color`); é metadado sobre os nomes que já vivem em `contacts.tags`, não uma FK.
- `scoring_rules` / `scoring_tiers` — regras de pontuação (`field_source`: fixed/custom/tag + `operator` + `value` + `points`) e faixas de classificação (`min_score` + `label` + `color`) do Lead Scoring. Mudar uma regra recalcula `contacts.score` via RPC `recalculate_all_contact_scores`.
- `custom_field_definitions` (+ `custom_field_groups`) — campos dinâmicos e seu agrupamento, **compartilhados entre contatos e negócios** via coluna `entity` (`'contact'` | `'deal'`). A `key` é única por entidade (índice `(entity, key)`), então contato e negócio podem ter o mesmo `key`. Toda query/insert desses tabelas deve filtrar/gravar por `entity`. O input de campo é renderizado por [src/components/custom-field-input.tsx](src/components/custom-field-input.tsx) (agnóstico de entidade, usado por `contact-form` e `deal-form`).
- `contact_lists` / `contact_list_members` — listas e membros (PK composta `list_id, contact_id`).
- `pipelines` / `pipeline_stages` / `deals` / `deal_stage_history` — funil de vendas. `deals.custom_fields jsonb` guarda os campos personalizados de negócio (chave = `custom_field_definitions.key` com `entity='deal'`).
- `tasks` — tarefas soltas ou vinculadas a `contact_id`/`deal_id`.

## Convenções do projeto

- Toda tabela nova no Supabase leva RLS habilitado com uma única policy `authenticated full access` (`ALL` / role `authenticated` / `using true` / `with check true`) — padrão usado em todas as tabelas existentes; manter até que multi-tenant/permissões entrem em pauta explicitamente.
- Server actions ficam em `actions.ts` dentro da própria pasta de rota (ex: `src/app/(app)/contacts/tags/actions.ts`), não centralizadas.
- `DeleteFieldButton` ([src/components/delete-field-button.tsx](src/components/delete-field-button.tsx)) é genérico — reusar para qualquer exclusão com confirmação em vez de criar um botão novo.
- Após alterar o schema, regenerar `src/lib/supabase/database.types.ts` (MCP Supabase `generate_typescript_types`) antes de escrever código que dependa dos tipos.
- Mudanças de escopo maior (nova entidade, novo módulo) devem passar por plan mode antes de implementar — o padrão até aqui foi: explorar código existente, tirar dúvidas de produto com o usuário via perguntas objetivas, só então gerar o plano.

## Roadmap direcional (não compromissado — validar escopo com o usuário antes de iniciar)

Ordem provável de próximos módulos, rumo à paridade com ActiveCampaign:
1. **Segmentos dinâmicos** para Listas (regras tipo tag/campo/atividade) — extensão natural do que já existe em `/contacts/lists`.
2. **Automações** — motor de trigger→ação (ex: "tag adicionada" → "adicionar à lista" / "criar tarefa" / "enviar e-mail"). `contact_list_members` já foi desenhada pensando nisso.
3. **Campanhas de e-mail / marketing** — envio para listas/segmentos.
4. **Formulários de captura** — landing pages/forms que criam contatos.
5. **Relatórios/analytics** — métricas de funil, engajamento de campanhas.

Este roadmap é uma referência de direção, não uma spec — cada item precisa da mesma rodada de alinhamento de escopo (como a que gerou o módulo de Contatos) antes de virar código.
