-- =====================================================================
-- Contratei · esquema do banco no Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- ---------- Administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins_ver_a_si" on public.admins;
create policy "admins_ver_a_si" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.eu() returns text language sql stable as $$ select auth.uid()::text $$;

-- ---------- Tabelas (cada linha guarda o registro em "data", como no MVP) ----------
create table if not exists public.candidatos (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.empresas   (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.interesses (id text primary key, cand_id text, opp_id text, emp_id text, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.matches    (id text primary key, cand_id text, opp_id text, emp_id text, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.mensagens  (id text primary key, match_id text, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.creditos   (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.pedidos    (id text primary key, emp_id text, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.config     (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.moderacao  (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.outros     (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());

create index if not exists interesses_cand on public.interesses (cand_id);
create index if not exists interesses_emp  on public.interesses (emp_id);
create index if not exists matches_cand    on public.matches (cand_id);
create index if not exists matches_emp     on public.matches (emp_id);
create index if not exists mensagens_match on public.mensagens (match_id);
create index if not exists pedidos_emp     on public.pedidos (emp_id);

-- ---------- Funções auxiliares ----------
create or replace function public.empresa_da_vaga(p_opp text) returns text
language sql stable security definer set search_path = public as $$
  select e.id from public.empresas e where e.data->'oportunidades' ? p_opp limit 1;
$$;

-- Créditos disponíveis = liberados pelo admin − contratações efetivadas
create or replace function public.saldo_empresa(p_emp text) returns integer
language plpgsql stable security definer set search_path = public as $$
declare c jsonb; usados int;
begin
  select data into c from public.creditos where id = p_emp;
  if c is null then return 0; end if;
  if coalesce((c->>'ilimitado')::boolean, false) then return 999999; end if;
  select count(*) into usados from public.matches where emp_id = p_emp and data->>'etapa' = 'efetivado';
  return greatest(0, coalesce((c->>'total')::int, 0) - usados);
end $$;
grant execute on function public.saldo_empresa(text) to authenticated;

create or replace function public.tocar() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- Preenche candidato, vaga e empresa a partir do id "candidato~vaga" (o navegador não decide isso)
create or replace function public.partes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.cand_id := split_part(new.id, '~', 1);
  new.opp_id  := split_part(new.id, '~', 2);
  new.emp_id  := public.empresa_da_vaga(new.opp_id);
  return new;
end $$;

-- Interesse: cada lado só marca o próprio lado; empresa precisa de crédito
create or replace function public.regra_interesse() returns trigger
language plpgsql security definer set search_path = public as $$
declare quem text := auth.uid()::text; antes jsonb;
begin
  if public.is_admin() or quem is null then return new; end if;
  antes := case when tg_op = 'UPDATE' then old.data else '{}'::jsonb end;
  if quem = new.cand_id and quem is distinct from new.emp_id then
    new.data := jsonb_set(new.data, '{emp}', coalesce(antes->'emp', 'false'::jsonb));
  elsif quem = new.emp_id and quem is distinct from new.cand_id then
    new.data := jsonb_set(new.data, '{cand}', coalesce(antes->'cand', 'false'::jsonb));
    if coalesce((new.data->>'emp')::boolean, false) and not coalesce((antes->>'emp')::boolean, false)
       and public.saldo_empresa(new.emp_id) < 1 then
      raise exception 'sem_credito' using hint = 'A empresa precisa de pelo menos 1 crédito para demonstrar interesse.';
    end if;
  end if;
  return new;
end $$;

-- Efetivar consome crédito: precisa de saldo
create or replace function public.regra_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.data->>'etapa' = 'efetivado' and (tg_op = 'INSERT' or old.data->>'etapa' is distinct from 'efetivado') then
    if auth.uid()::text is distinct from new.emp_id then raise exception 'so_empresa_efetiva'; end if;
    if public.saldo_empresa(new.emp_id) < 1 then raise exception 'sem_credito'; end if;
  end if;
  return new;
end $$;

create or replace function public.partes_msg() returns trigger language plpgsql as $$
begin new.match_id := replace(coalesce(new.data->>'match', ''), '|', '~'); return new; end $$;

create or replace function public.partes_pedido() returns trigger language plpgsql as $$
begin new.emp_id := new.data->>'empId'; return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['candidatos','empresas','interesses','matches','mensagens','creditos','pedidos','config','moderacao','outros'] loop
    execute format('drop trigger if exists tocar on public.%I', t);
    execute format('create trigger tocar before insert or update on public.%I for each row execute function public.tocar()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop trigger if exists a_partes on public.interesses;
create trigger a_partes before insert or update on public.interesses for each row execute function public.partes();
drop trigger if exists b_regra on public.interesses;
create trigger b_regra before insert or update on public.interesses for each row execute function public.regra_interesse();
drop trigger if exists a_partes on public.matches;
create trigger a_partes before insert or update on public.matches for each row execute function public.partes();
drop trigger if exists b_regra on public.matches;
create trigger b_regra before insert or update on public.matches for each row execute function public.regra_match();
drop trigger if exists a_partes on public.mensagens;
create trigger a_partes before insert or update on public.mensagens for each row execute function public.partes_msg();
drop trigger if exists a_partes on public.pedidos;
create trigger a_partes before insert or update on public.pedidos for each row execute function public.partes_pedido();

-- ---------- Regras de acesso (RLS) ----------
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('candidatos','empresas','interesses','matches','mensagens','creditos','pedidos','config','moderacao','outros') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Perfis: quem está logado vê (para o ranking); cada um edita só o seu
create policy ver on public.candidatos for select to authenticated using (true);
create policy criar on public.candidatos for insert to authenticated with check (id = public.eu() or public.is_admin());
create policy editar on public.candidatos for update to authenticated using (id = public.eu() or public.is_admin()) with check (id = public.eu() or public.is_admin());
create policy apagar on public.candidatos for delete to authenticated using (id = public.eu() or public.is_admin());

create policy ver on public.empresas for select to authenticated using (true);
create policy criar on public.empresas for insert to authenticated with check (id = public.eu() or public.is_admin());
create policy editar on public.empresas for update to authenticated using (id = public.eu() or public.is_admin()) with check (id = public.eu() or public.is_admin());
create policy apagar on public.empresas for delete to authenticated using (id = public.eu() or public.is_admin());

-- Interesses e matches: só as duas partes (e o admin) veem
create policy ver on public.interesses for select to authenticated using (public.eu() in (cand_id, emp_id) or public.is_admin());
create policy criar on public.interesses for insert to authenticated with check (public.eu() in (cand_id, emp_id) or public.is_admin());
create policy editar on public.interesses for update to authenticated using (public.eu() in (cand_id, emp_id) or public.is_admin()) with check (public.eu() in (cand_id, emp_id) or public.is_admin());
create policy apagar on public.interesses for delete to authenticated using (public.is_admin());

create policy ver on public.matches for select to authenticated using (public.eu() in (cand_id, emp_id) or public.is_admin());
create policy criar on public.matches for insert to authenticated with check (
  public.is_admin() or (public.eu() in (cand_id, emp_id) and exists (
    select 1 from public.interesses i where i.id = matches.id
      and coalesce((i.data->>'cand')::boolean, false) and coalesce((i.data->>'emp')::boolean, false))));
create policy editar on public.matches for update to authenticated using (public.eu() in (cand_id, emp_id) or public.is_admin()) with check (public.eu() in (cand_id, emp_id) or public.is_admin());
create policy apagar on public.matches for delete to authenticated using (public.is_admin());

create policy ver on public.mensagens for select to authenticated using (public.is_admin() or exists (
  select 1 from public.matches m where m.id = mensagens.match_id and public.eu() in (m.cand_id, m.emp_id)));
create policy criar on public.mensagens for insert to authenticated with check (public.is_admin() or exists (
  select 1 from public.matches m where m.id = mensagens.match_id and public.eu() in (m.cand_id, m.emp_id)));
create policy editar on public.mensagens for update to authenticated using (public.is_admin() or exists (
  select 1 from public.matches m where m.id = mensagens.match_id and public.eu() in (m.cand_id, m.emp_id)));
create policy apagar on public.mensagens for delete to authenticated using (public.is_admin());

-- Créditos: a empresa vê os seus; só o admin altera
create policy ver on public.creditos for select to authenticated using (id = public.eu() or public.is_admin());
create policy admin on public.creditos for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: a empresa cria e informa o pagamento; só o admin confirma
create policy ver on public.pedidos for select to authenticated using (emp_id = public.eu() or public.is_admin());
create policy criar on public.pedidos for insert to authenticated with check (
  public.is_admin() or (emp_id = public.eu() and data->>'status' in ('aguardando', 'informado')));
create policy editar on public.pedidos for update to authenticated
  using (public.is_admin() or (emp_id = public.eu() and data->>'status' in ('aguardando', 'informado')))
  with check (public.is_admin() or (emp_id = public.eu() and data->>'status' in ('aguardando', 'informado')));
create policy apagar on public.pedidos for delete to authenticated using (public.is_admin());

-- Configuração (links de pagamento, dados da empresa) e listas "Outros": todos leem
create policy ver on public.config for select to anon, authenticated using (true);
create policy admin on public.config for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy ver on public.moderacao for select to authenticated using (true);
create policy admin on public.moderacao for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy ver on public.outros for select to anon, authenticated using (true);
create policy criar on public.outros for insert to authenticated with check (true);
create policy admin on public.outros for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Atualização em tempo real ----------
do $$
declare t text;
begin
  foreach t in array array['candidatos','empresas','interesses','matches','mensagens','creditos','pedidos','config','moderacao','outros'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- Ferramentas do administrador (rodar só aqui no SQL Editor) ----------
-- Torna uma conta administradora:   select public.tornar_admin('contrateionline@gmail.com');
create or replace function public.tornar_admin(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then return 'Conta não encontrada. Crie a conta no site primeiro.'; end if;
  insert into public.admins (user_id) values (u) on conflict do nothing;
  return 'Administrador liberado: ' || p_email;
end $$;

-- Passa o cadastro antigo (do MVP) para a conta nova:   select public.vincular_conta('seu@email.com', 'u_KPc2da_MIY6lfW2A_kiXCg');
create or replace function public.vincular_conta(p_email text, p_antigo text) returns text
language plpgsql security definer set search_path = public as $$
declare novo text;
begin
  select id::text into novo from auth.users where lower(email) = lower(p_email);
  if novo is null then return 'Conta não encontrada. Crie a conta no site primeiro.'; end if;
  delete from public.candidatos where id = novo and exists (select 1 from public.candidatos where id = p_antigo);
  delete from public.empresas   where id = novo and exists (select 1 from public.empresas where id = p_antigo);
  update public.candidatos set id = novo where id = p_antigo;
  update public.empresas   set id = novo where id = p_antigo;
  update public.creditos   set id = novo where id = p_antigo;
  update public.pedidos    set data = jsonb_set(data, '{empId}', to_jsonb(novo)) where data->>'empId' = p_antigo;
  update public.interesses set id = replace(id, p_antigo || '~', novo || '~');
  update public.matches    set id = replace(id, p_antigo || '~', novo || '~');
  update public.mensagens  set data = jsonb_set(data, '{match}', to_jsonb(replace(data->>'match', p_antigo || '|', novo || '|')));
  return 'Cadastro vinculado à conta ' || p_email;
end $$;

revoke execute on function public.tornar_admin(text) from public, anon, authenticated;
revoke execute on function public.vincular_conta(text, text) from public, anon, authenticated;
