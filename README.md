# Sistema de Esquadrias — MVP

Sistema de orçamento, precificação e produção para vidraçarias e esquadrias.

Módulos incluídos nesta primeira entrega:
- Login com 3 níveis de acesso (admin, vendedor, cliente)
- Cadastro de materiais (perfis de alumínio, vidros, ferragens) com peso e custo reais
- Catálogo de modelos de esquadria (composição de material por modelo)
- Cadastro de clientes e obras
- Configurador de item com desenho técnico ao vivo, cálculo de peso/custo/preço
- Lista de compras por obra
- Otimização de plano de corte (barras de perfil — 1D, e chapas de vidro — 2D)

---

## 1. Antes de começar

Você vai precisar de:
- Uma conta no [Supabase](https://supabase.com) (banco de dados + login) — plano gratuito serve para começar
- Uma conta no [Vercel](https://vercel.com) (hospedagem) — plano gratuito serve para começar
- Node.js instalado no seu computador, só se quiser rodar localmente antes de publicar (não é obrigatório)

---

## 2. Configurar o banco de dados (Supabase)

1. Entre em [supabase.com](https://supabase.com) e crie um novo projeto (**New project**).
2. Anote a **senha do banco** que você definir — vai precisar dela raramente, mas guarde em local seguro.
3. Espere o projeto terminar de provisionar (1-2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste projeto, copie **todo o conteúdo** e cole no editor.
6. Clique em **Run**. Isso cria todas as tabelas, funções e regras de segurança de uma vez.
7. Vá em **Project Settings** → **API**. Anote dois valores, você vai usar no próximo passo:
   - **Project URL**
   - **anon public key**

### Criar o primeiro usuário administrador
1. No menu lateral, vá em **Authentication** → **Users** → **Add user** → **Create new user**.
2. Preencha e-mail e senha (essa vai ser a conta admin da vidraçaria). Marque "Auto Confirm User".
3. Copie o **UID** do usuário criado.
4. Volte no **SQL Editor** e rode (trocando o UID):
   ```sql
   update public.profiles set role = 'admin' where id = 'COLE-O-UID-AQUI';
   ```
5. Pronto — esse usuário já pode logar no sistema como administrador.

Para criar o usuário do cliente (nível "cliente", só visualização), repita o processo em Authentication, mas depois rode:
```sql
update public.profiles
set role = 'cliente', client_id = 'UUID-DO-CLIENTE-NA-TABELA-CLIENTS'
where id = 'UID-DO-USUARIO';
```
(O UUID do cliente você pega na tabela `clients` depois de cadastrar o cliente pelo sistema.)

---

## 3. Publicar o sistema (Vercel)

### Opção recomendada: subir para o GitHub primeiro
1. Crie um repositório novo no GitHub (pode ser privado) e envie esta pasta do projeto para lá.
2. Em [vercel.com](https://vercel.com), clique em **Add New** → **Project** → conecte sua conta GitHub → selecione o repositório.
3. Na tela de configuração, adicione as **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` → cole o **Project URL** do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → cole a **anon public key** do Supabase
4. Clique em **Deploy**. Em ~2 minutos você tem um link público, tipo `seu-projeto.vercel.app`.

### Alternativa: publicar direto da sua máquina, sem GitHub
```bash
npm install -g vercel
cd esquadrias-sistema
vercel
```
Siga as perguntas no terminal. Quando ele perguntar sobre variáveis de ambiente, informe as mesmas duas de cima (ou configure depois em vercel.com → seu projeto → Settings → Environment Variables → depois rode `vercel --prod`).

---

## 4. Dar acesso ao cliente

Depois do deploy, você tem uma URL pública (ex: `https://esquadrias-suaempresa.vercel.app`).
- Crie um usuário para o cliente no Supabase (passo acima, role = 'cliente', vinculado ao `client_id` dele).
- Passe a URL + e-mail/senha para o cliente. Ele só vai enxergar as obras/orçamentos vinculados ao cadastro dele.
- Se quiser um domínio próprio (ex: `sistema.suaempresa.com.br`), isso se configura em Vercel → Settings → Domains — me avisa que te ajudo com isso depois.

---

## 5. Rodando localmente (opcional, para testar antes de publicar)

```bash
npm install
cp .env.local.example .env.local
# edite o .env.local com a URL e chave do seu projeto Supabase
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000).

---

## 6. O que você precisa preencher antes de usar de verdade

O sistema está pronto, mas **sem dados reais ainda**. Antes de usar em produção com o cliente, cadastre pela tela:

1. **Materiais** → seus perfis de alumínio reais (kg/m, comprimento da barra, custo), vidros (kg/m², tamanho da chapa, custo por espessura) e ferragens.
2. **Modelos de esquadria** → monte a "receita" de cada modelo (quanto de perfil por perímetro/travessa, quais ferragens).
3. Depois disso, o orçamento já calcula peso/custo/preço em cima de dados reais.

---

## 7. Limitações desta primeira entrega (fica combinado, para não ter surpresa)

- Não gera ainda um PDF/proposta comercial formatada para enviar ao cliente final — o orçamento fica na tela do sistema.
- A otimização de corte usa heurísticas padrão de mercado (First Fit Decreasing para barra, Guillotine para chapa) — são boas e usadas por softwares comerciais, mas não são 100% do ótimo matemático absoluto (nenhum otimizador comercial garante isso em tempo real).
- Croqui 3D, versionamento de obras, chat/WhatsApp, estoque detalhado e demais itens da sua lista original ficam para as próximas fases.
- Todo o sistema está em um único "tenant" (uma empresa). Se no futuro você quiser vender para outras vidraçarias, precisamos adicionar isolamento multi-empresa.

---

## Dúvidas técnicas comuns

**"Erro de login" mesmo com usuário criado certo:** confira se copiou a URL e a anon key corretas nas variáveis de ambiente da Vercel, e se rodou o `update` do `role` no SQL Editor.

**Quero mudar as cores/logo:** as cores ficam em `tailwind.config.ts` (`colors.ink`, `colors.accent`). O texto "Sistema de Esquadrias" fica em `src/components/Sidebar.tsx` e `src/app/login/page.tsx`.
