-- Integração Meta Ads — leads de formulários instantâneos (Lead Ads).
--
-- Três tabelas: a conexão com a página do Facebook (token + padrões de
-- destino), a configuração por formulário instantâneo (lista de destino,
-- tags e mapeamento de campos) e a fila/auditoria dos leads recebidos.
--
-- RLS segue a convenção do projeto: uma única policy "authenticated full
-- access" por tabela.

-- Página do Facebook conectada. O modelo aceita N páginas (uma linha cada),
-- mas só as com is_active = true recebem leads; o OAuth grava uma linha por
-- página devolvida por /me/accounts e a UI ativa a escolhida.
create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  page_id text not null unique,
  page_name text not null,
  -- Token de página long-lived. Nunca é selecionado por componente client.
  page_access_token text not null,
  scopes text[] not null default '{}',
  is_active boolean not null default false,
  -- Lista padrão para onde vão os leads sem override no formulário.
  default_list_id uuid references public.contact_lists(id) on delete set null,
  default_tags text[] not null default '{}',
  webhook_subscribed_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- Configuração por formulário instantâneo. target_list_id nulo = usa a lista
-- padrão da conexão.
create table if not exists public.meta_lead_forms (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.meta_connections(id) on delete cascade,
  form_id text not null unique,
  name text not null,
  status text,
  is_enabled boolean not null default true,
  target_list_id uuid references public.contact_lists(id) on delete set null,
  tags text[] not null default '{}',
  -- { "<nome da pergunta na Meta>": { "target": "fixed|custom|ignore", "key": "email" } }
  field_mappings jsonb not null default '{}'::jsonb,
  -- Cache das perguntas do formulário, para montar a tela de mapeamento.
  questions jsonb not null default '[]'::jsonb,
  last_polled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists meta_lead_forms_connection_idx
  on public.meta_lead_forms (connection_id);

-- Fila + auditoria + idempotência. leadgen_id unique é o que impede lead
-- duplicado quando a Meta reentrega o webhook ou quando o polling de
-- reconciliação encontra um lead que o webhook já trouxe.
create table if not exists public.meta_leads (
  id uuid primary key default gen_random_uuid(),
  leadgen_id text not null unique,
  form_id text not null,
  page_id text,
  contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'pending',
  attempts integer not null default 0,
  error_message text,
  -- Payload cru da Meta (inclui atribuição: campanha, anúncio, plataforma).
  raw jsonb not null default '{}'::jsonb,
  created_time timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists meta_leads_status_idx
  on public.meta_leads (status, created_at);
create index if not exists meta_leads_form_idx
  on public.meta_leads (form_id, created_at desc);

alter table public.meta_connections enable row level security;
alter table public.meta_lead_forms enable row level security;
alter table public.meta_leads enable row level security;

-- Idempotente: rodar a migração de novo não pode falhar no meio nem duplicar
-- policy (create policy não aceita "if not exists").
drop policy if exists "authenticated full access" on public.meta_connections;
drop policy if exists "authenticated full access" on public.meta_lead_forms;
drop policy if exists "authenticated full access" on public.meta_leads;

create policy "authenticated full access" on public.meta_connections
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.meta_lead_forms
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.meta_leads
  for all to authenticated using (true) with check (true);

-- Dedup por telefone: contacts.phone é texto livre ("(11) 98888-7777",
-- "+5511988887777", "11988887777"), então o match precisa normalizar os dois
-- lados e comparar os últimos 8 dígitos (o que sobra depois de DDI e DDD).
-- Não dá para expressar isso como filtro do PostgREST, por isso vira função.
create or replace function public.find_contact_by_phone(p_phone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8) as suffix
  )
  select c.id
  from public.contacts c, normalized n
  where length(n.suffix) = 8
    and right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 8) = n.suffix
  order by c.created_at
  limit 1;
$$;
