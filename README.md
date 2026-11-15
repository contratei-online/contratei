# Contratei

Conexão entre empresas e profissionais de vendas **por compatibilidade, não por sorte**.

- Site: React (um único `index.html`, gerado por `npm run build` em `public/`)
- Banco de dados, login e tempo real: **Supabase**
- Publicação: **Vercel** (cada `git push` atualiza o site)

## Estrutura

| Pasta / arquivo | O que é |
|---|---|
| `src/` | Código do site (telas, algoritmo de compatibilidade em `engine.js`, integração em `supa.js`) |
| `supabase/01_esquema.sql` | Tabelas, regras de segurança (RLS), créditos e tempo real |
| `supabase/02_dados_iniciais.sql` | Dados atuais: 15 candidatos de teste, DescontaBR, créditos e links de pagamento |
| `supabase.config.json` | URL do projeto e chave **publishable** (pública, pode ficar no código) |
| `scripts/build.mjs` | Gera `public/index.html` |

> Nunca coloque a chave `service_role` / `secret` nem a senha do banco neste repositório.

## Colocar no ar (uma vez)

### 1. Supabase — banco de dados
1. Supabase → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/01_esquema.sql` → **Run**.
3. Nova query: cole `supabase/02_dados_iniciais.sql` → **Run**.

### 2. Vercel — site
1. Entre em https://vercel.com com a conta do GitHub → **Add New… → Project**.
2. Importe este repositório. A Vercel lê o `vercel.json` sozinha (build `npm run build`, pasta `public`). Clique em **Deploy**.
3. Copie o endereço gerado (ex.: `https://contratei.vercel.app`).

### 3. Supabase — endereço do site e e-mails
1. **Authentication → URL Configuration**
   - **Site URL**: o endereço da Vercel.
   - **Redirect URLs**: adicione o mesmo endereço (e o domínio próprio, quando tiver).
2. (Opcional) **Authentication → Emails**: traduza os textos de “Confirm signup” e “Reset password” para português.

### 4. Administrador e seu cadastro antigo
1. No site, crie a conta `contrateionline@gmail.com` (Entrar → Criar conta) e confirme o e-mail.
2. Crie também a sua conta pessoal (a que vai gerenciar a DescontaBR).
3. No **SQL Editor**, rode (trocando o e-mail pessoal):
```sql
select public.tornar_admin('contrateionline@gmail.com');
select public.vincular_conta('SEU-EMAIL@exemplo.com', 'u_KPc2da_MIY6lfW2A_kiXCg');
```
A primeira libera o painel admin. A segunda passa a DescontaBR (vagas, créditos e o match com a Rafaela) para a sua conta.

## Como funciona a segurança
- Perfis de candidatos e empresas: visíveis para quem está logado (necessário para o ranking); cada pessoa só edita o próprio.
- Interesses, matches e conversas: só as duas partes e o admin enxergam.
- Cada lado só marca o próprio interesse; a empresa precisa de crédito para demonstrar interesse e para efetivar (o banco confere).
- Créditos e confirmação de pagamento: só o admin altera.

## Desenvolvimento
```bash
npm install
npm run build      # gera public/index.html
```
Abra `public/index.html` no navegador (ele conversa com o Supabase configurado em `supabase.config.json`).
