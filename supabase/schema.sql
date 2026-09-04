-- ============================================================================
-- SISTEMA DE ESQUADRIAS - SCHEMA DO BANCO
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERFIS DE USUÁRIO (liga auth.users a um papel no sistema)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'vendedor', 'cliente')) default 'vendedor',
  client_id uuid, -- preenchido apenas quando role = 'cliente', liga ao registro em public.clients
  created_at timestamptz not null default now()
);

-- Função auxiliar: retorna o papel do usuário logado (usada nas policies)
create or replace function public.current_role_name()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_client_id()
returns uuid
language sql
security definer
stable
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- Cria o profile automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, nome, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), 'vendedor');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. MATERIAIS (perfis de alumínio, vidros, ferragens)
-- ---------------------------------------------------------------------------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('perfil', 'vidro', 'ferragem')),
  nome text not null,
  linha text, -- ex: "Linha 25", "Suprema", só para perfis
  cor_acabamento text, -- branco, preto, natural, bronze...
  unidade text not null, -- 'barra', 'kg', 'm2', 'un'
  -- Perfil de alumínio:
  kg_por_metro numeric(10,4), -- peso linear do perfil
  comprimento_barra_m numeric(10,3) default 6, -- comprimento padrão de venda da barra
  -- Vidro:
  kg_por_m2 numeric(10,4), -- peso por m² (varia com espessura)
  espessura_mm numeric(6,2),
  largura_chapa_m numeric(10,3), -- tamanho da chapa padrão de estoque
  altura_chapa_m numeric(10,3),
  -- Custo:
  custo_unitario numeric(12,4) not null default 0, -- custo de compra na unidade acima
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. MODELOS DE ESQUADRIA (catálogo: janela de correr, porta, veneziana...)
-- ---------------------------------------------------------------------------
create table if not exists public.esquadria_models (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null, -- 'janela_correr', 'porta_correr', 'janela_maxim_ar', 'porta_abrir', etc
  descricao text,
  imagem_url text,
  perfil_material_id uuid references public.materials(id),
  aceita_vidro boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Componentes de cada modelo: quanto de perfil (por perímetro ou travessa) e ferragens por unidade
create table if not exists public.esquadria_model_components (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.esquadria_models(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  tipo_consumo text not null check (tipo_consumo in ('perimetro', 'travessa_h', 'travessa_v', 'unidade')),
  fator numeric(10,4) not null default 1, -- multiplicador sobre a medida (ex: 2x largura + 2x altura)
  quantidade_fixa numeric(10,4) -- para ferragens: qty fixa por esquadria (ex: 4 roldanas)
);

-- ---------------------------------------------------------------------------
-- 4. CLIENTES E OBRAS
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text, -- CPF/CNPJ
  telefone text,
  email text,
  endereco text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nome text not null, -- ex: "Residência Alameda das Flores"
  endereco text,
  status text not null default 'orcamento' check (status in ('orcamento', 'aprovada', 'producao', 'entregue', 'cancelada')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. ORÇAMENTOS E ITENS
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  margem_padrao_pct numeric(6,2) not null default 30, -- margem de venda padrão %
  observacoes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  model_id uuid not null references public.esquadria_models(id),
  largura_mm integer not null,
  altura_mm integer not null,
  quantidade integer not null default 1,
  vidro_material_id uuid references public.materials(id),
  cor_acabamento text,
  margem_pct numeric(6,2), -- se null, usa a margem padrão do orçamento
  -- calculados e congelados no momento do "Adicionar item" (não recalculam sozinhos se o preço do material mudar depois):
  peso_calc_kg numeric(10,3),
  custo_calc numeric(12,2),
  preco_venda_calc numeric(12,2),
  observacoes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. OTIMIZAÇÕES DE CORTE (histórico dos cálculos rodados por obra)
-- ---------------------------------------------------------------------------
create table if not exists public.cutting_runs (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  tipo text not null check (tipo in ('perfil', 'vidro')),
  material_id uuid references public.materials(id),
  resultado jsonb not null, -- guarda o plano de corte gerado
  aproveitamento_pct numeric(6,2),
  barras_ou_chapas_usadas integer,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- admin       -> acesso total
-- vendedor    -> acesso total a clientes/obras/orçamentos/materiais/modelos
-- cliente     -> somente leitura, apenas das obras/orçamentos do seu client_id
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.esquadria_models enable row level security;
alter table public.esquadria_model_components enable row level security;
alter table public.clients enable row level security;
alter table public.works enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.cutting_runs enable row level security;

-- profiles: cada usuário vê o próprio perfil; admin vê todos
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.current_role_name() = 'admin');
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- materials: admin/vendedor têm CRUD; cliente só leitura
create policy "materials_select_all_logged" on public.materials
  for select using (auth.uid() is not null);
create policy "materials_write_admin_vendedor" on public.materials
  for insert with check (public.current_role_name() in ('admin', 'vendedor'));
create policy "materials_update_admin_vendedor" on public.materials
  for update using (public.current_role_name() in ('admin', 'vendedor'));
create policy "materials_delete_admin" on public.materials
  for delete using (public.current_role_name() = 'admin');

-- esquadria_models / components: mesma regra dos materiais
create policy "models_select_all_logged" on public.esquadria_models
  for select using (auth.uid() is not null);
create policy "models_write_admin_vendedor" on public.esquadria_models
  for insert with check (public.current_role_name() in ('admin', 'vendedor'));
create policy "models_update_admin_vendedor" on public.esquadria_models
  for update using (public.current_role_name() in ('admin', 'vendedor'));
create policy "models_delete_admin" on public.esquadria_models
  for delete using (public.current_role_name() = 'admin');

create policy "components_select_all_logged" on public.esquadria_model_components
  for select using (auth.uid() is not null);
create policy "components_write_admin_vendedor" on public.esquadria_model_components
  for all using (public.current_role_name() in ('admin', 'vendedor'));

-- clients: admin/vendedor CRUD total; cliente só vê o próprio registro
create policy "clients_select" on public.clients
  for select using (
    public.current_role_name() in ('admin', 'vendedor')
    or id = public.current_client_id()
  );
create policy "clients_write_admin_vendedor" on public.clients
  for all using (public.current_role_name() in ('admin', 'vendedor'));

-- works: admin/vendedor CRUD total; cliente só vê obras do seu client_id
create policy "works_select" on public.works
  for select using (
    public.current_role_name() in ('admin', 'vendedor')
    or client_id = public.current_client_id()
  );
create policy "works_write_admin_vendedor" on public.works
  for all using (public.current_role_name() in ('admin', 'vendedor'));

-- budgets: mesma regra, via join implícito com works
create policy "budgets_select" on public.budgets
  for select using (
    public.current_role_name() in ('admin', 'vendedor')
    or work_id in (select id from public.works where client_id = public.current_client_id())
  );
create policy "budgets_write_admin_vendedor" on public.budgets
  for all using (public.current_role_name() in ('admin', 'vendedor'));

create policy "budget_items_select" on public.budget_items
  for select using (
    public.current_role_name() in ('admin', 'vendedor')
    or budget_id in (
      select b.id from public.budgets b
      join public.works w on w.id = b.work_id
      where w.client_id = public.current_client_id()
    )
  );
create policy "budget_items_write_admin_vendedor" on public.budget_items
  for all using (public.current_role_name() in ('admin', 'vendedor'));

-- cutting_runs: só admin/vendedor (é uma ferramenta interna de produção)
create policy "cutting_runs_select_admin_vendedor" on public.cutting_runs
  for select using (public.current_role_name() in ('admin', 'vendedor'));
create policy "cutting_runs_write_admin_vendedor" on public.cutting_runs
  for all using (public.current_role_name() in ('admin', 'vendedor'));

-- ============================================================================
-- Fim do schema. Depois de rodar, crie seu primeiro usuário admin manualmente:
-- 1. Crie o usuário em Authentication > Users no painel do Supabase.
-- 2. Rode: update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
-- ============================================================================
