# Plataforma whitelabel de gestão interna com CRM integrado

Sistema de **controle interno com CRM integrado** para empresas de diversos segmentos, multiempresa e **100% whitelabel**, pronto para rodar na **Vercel**. A plataforma não exibe marca própria: cada cliente usa **seu nome, logotipo, paleta de cores e fontes**, além de funis, etapas, campos, nomenclatura, equipe e automações próprios.

A única referência à desenvolvedora é a assinatura **"Desenvolvido por DRAP"** no rodapé (`src/components/drap-signature.tsx`).

## Funcionalidades

**Vendas**
- Funil Kanban com arrastar e soltar, totais e valor ponderado por etapa, zonas de **Ganho/Perdido** ao arrastar
- Vários funis por empresa (ex.: Vendas, Renovação, Pós-venda) e visualização em **lista** com ordenação e ações em massa
- Etapas com cor, probabilidade e **alerta de negócio parado** (dias sem movimentação)
- Ficha do negócio: barra de etapas clicável, ganhar/perder (com motivo)/reabrir, produtos com quantidade e desconto (recalcula o valor), contato/empresa, WhatsApp em um clique
- Linha do tempo completa: notas (fixáveis), atividades e histórico de alterações

**Relacionamento**
- Contatos (ciclo de vida, origem, aniversário, WhatsApp) e Empresas (CNPJ, porte, segmento, endereço)
- Importação de contatos por **CSV** (cria empresas automaticamente) e exportação CSV de contatos, empresas e negócios
- Busca global (**Ctrl/Cmd + K**) e criação rápida de qualquer registro

**Produtividade**
- Atividades (ligação, reunião, tarefa, e-mail, prazo, almoço, WhatsApp) em lista agrupada por dia ou **calendário mensal**, com atrasadas destacadas
- **Automações** “quando… então…”: ao criar, mudar de etapa, ganhar ou perder → criar atividade, etiqueta, responsável, nota ou ciclo de vida
- **Metas** mensais (receita, negócios ganhos, atividades) por empresa ou vendedor

**Gestão**
- Painel com pipeline, previsão ponderada, conversão, ticket médio, ciclo de venda, meta, ranking e negócios parados
- Relatórios: funil de conversão, receita 12 meses, desempenho por vendedor, motivos de perda, origens, atividades e previsão de fechamento

**Whitelabel e personalização (Configurações → Marca e geral)**
- Estúdio de marca: envio do logotipo/identidade oficial com extração automática da paleta
- Personalização livre: cores (com aviso de contraste), tom de fundo, cantos, fonte principal e de destaque
- Gerador de logotipo genérico (monograma) para quem ainda não tem marca; sem logo, exibe as iniciais na cor da empresa
- Nome, moeda, idioma e fuso — por empresa; título da aba e favicon com o nome e o logo do cliente
- **Nomenclatura livre**: renomeie “Negócios” para “Imóveis”, “Matrículas”, “Projetos”…
- **Campos personalizados** (texto, número, moeda, data, lista, múltipla escolha, sim/não, link, e-mail, telefone) para negócios, contatos e empresas
- Domínio próprio por empresa (a tela de login exibe a marca do cliente) ou `/login?org=slug`
- Módulos liga/desliga (empresas, produtos, metas, automações), etiquetas coloridas, motivos de perda
- Usuários com perfis (Proprietário, Administrador, Gestor, Vendedor, Somente leitura), convites por link e visibilidade “apenas os próprios registros” para vendedores
- Multiempresa: um usuário pode participar de várias empresas e alternar entre elas
- Modo claro/escuro e layout responsivo

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · Prisma 6 · PostgreSQL · dnd-kit · Recharts · JWT (jose) + bcrypt

## Deploy na Vercel (passo a passo)

1. Importe este repositório em **vercel.com/new**.
2. No projeto, abra **Storage → Create Database → Neon (Postgres)** e conecte ao projeto. A Vercel cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` automaticamente.
3. Em **Settings → Environment Variables**, adicione:
   - `AUTH_SECRET` — uma chave longa e aleatória (`openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_NAME` — nome neutro exibido no login quando nenhuma empresa é identificada (opcional, padrão "Gestão & CRM")
   - `ALLOW_SIGNUP` — `false` para impedir que qualquer pessoa crie empresas (opcional)
4. Faça o deploy. O build executa `prisma db push`, criando as tabelas automaticamente.
5. Acesse `/register` e crie a primeira empresa — funil, etapas e motivos de perda já vêm configurados.

> Usando outro Postgres (Supabase, RDS…)? Defina `DATABASE_URL` e `DATABASE_URL_UNPOOLED` (pode ser a mesma URL).
> Se o projeto já tiver outro banco conectado, defina `CRM_DATABASE_URL` (e opcionalmente `CRM_DATABASE_URL_UNPOOLED`): elas têm prioridade sobre `DATABASE_URL`.

**Domínio por cliente (whitelabel):** adicione o domínio do cliente em *Settings → Domains* da Vercel e informe o mesmo domínio em *Configurações → Marca* dentro da empresa do cliente.

## Rodando localmente

```bash
cp .env.example .env      # ajuste DATABASE_URL e AUTH_SECRET
npm install
npm run db:push           # cria as tabelas
npm run db:seed           # (opcional) dados de demonstração
npm run dev
```

Login de demonstração após o seed: `demo@nucleo.app` / `demo1234`.

## Estrutura

```
prisma/schema.prisma        modelo de dados (multi-tenant por organização)
prisma/seed.ts              dados de demonstração
src/actions/                Server Actions (negócios, CRM, configurações, autenticação)
src/app/(auth)/             login, cadastro e convites (com a marca da empresa)
src/app/(app)/              painel, negócios, contatos, empresas, atividades, produtos, relatórios, configurações
src/app/api/                busca rápida, exportação CSV, health check, logout
src/components/             UI, formulários, Kanban, linha do tempo, gráficos
src/lib/                    auth, permissões, rótulos, automações, métricas, formatação
src/proxy.ts                proteção de rotas
```
