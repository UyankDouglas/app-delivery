# 🧠 CONTEXTO — Guia para retomar o projeto

Este arquivo é a "memória" do projeto: serve para retomar o trabalho rapidamente,
inclusive **de outro computador**. Mantenha-o atualizado quando algo importante mudar.

> Documentação de funcionalidades/uso fica no [README.md](README.md). Aqui é o
> guia do desenvolvedor (setup, decisões, convenções, estado atual).

---

## 🚀 Como começar em uma máquina nova (do zero)

### Pré-requisitos
- **Node.js 18+** (o projeto foi desenvolvido/testado com Node 24)
- **npm** (vem com o Node)
- **PostgreSQL** rodando (local ou em nuvem — Neon, Supabase, Railway, etc.)
- **git**
- *(Opcional)* **Stripe CLI** — só para testar pagamento com cartão e webhook

### Passo a passo
```bash
# 1. Clonar o repositório
git clone https://github.com/UyankDouglas/app-delivery.git
cd app-delivery

# 2. Instalar as dependências (roda "prisma generate" automaticamente no postinstall)
npm install

# 3. Criar o arquivo de ambiente a partir do exemplo
#    Linux/macOS/Git Bash:
cp .env.example .env
#    Windows PowerShell:
#    Copy-Item .env.example .env

# 4. Editar o .env e preencher (mínimo necessário):
#    - DATABASE_URL  -> conexão do seu PostgreSQL
#    - AUTH_SECRET   -> gere um: npx auth secret   (ou: openssl rand -base64 32)

# 5. Criar as tabelas no banco e popular dados de demonstração
npm run db:push
npm run db:seed

# 6. Rodar em desenvolvimento
npm run dev
# Acesse http://localhost:3000
```

> **Sem chaves do Stripe?** Sem problema — o método **"Dinheiro na entrega"** faz o
> fluxo completo funcionar. As chaves do Stripe são opcionais (só para cartão).

### Retomando depois de um `git pull` (quando voltar ao projeto)
```bash
git pull
npm install          # caso o package.json tenha mudado
npm run db:push      # caso o prisma/schema.prisma tenha mudado
npm run dev
```

---

## 📜 Comandos úteis
| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento (http://localhost:3000) |
| `npm run build` | Build de produção (roda `prisma generate` + `next build`) |
| `npm run start` | Sobe o build de produção |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `npm run test` | Testes (Vitest) |
| `npm run db:push` | Aplica o `schema.prisma` no banco (sem migração formal) |
| `npm run db:migrate` | Cria/aplica migração versionada |
| `npm run db:seed` | Popula dados de demonstração |
| `npm run db:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run lint` | ESLint |

### Verificação rápida antes de commitar
```bash
npm run typecheck && npm run test && npm run build
```

---

## 🔑 Variáveis de ambiente (`.env`)
| Variável | Obrigatória? | Para quê |
|---|---|---|
| `DATABASE_URL` | ✅ Sim | Conexão PostgreSQL |
| `AUTH_SECRET` | ✅ Sim | Sessões NextAuth **e** tokens de pedido (convidado). Sem ela o app falha de propósito. |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Em produção | URL pública da aplicação |
| `STRIPE_SECRET_KEY` | Opcional | Pagamento com cartão |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Opcional | Stripe no cliente |
| `STRIPE_WEBHOOK_SECRET` | Opcional | Confirmação de pagamento via webhook |

> ⚠️ O `.env` **nunca** é commitado (está no `.gitignore`). Só o `.env.example` vai pro git.

### Testar cartão (Stripe) localmente
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copie o whsec_... para STRIPE_WEBHOOK_SECRET no .env
# Cartão de teste: 4242 4242 4242 4242 (validade futura, CVC qualquer)
```

---

## 👤 Contas de teste (após `npm run db:seed`) — senha `senha12345`
| Papel | E-mail | Vai para |
|---|---|---|
| Dono | `dono@demo.com` | `/owner` |
| Cliente | `cliente@demo.com` | `/account/orders` |
| Entregador | `entregador@demo.com` | `/delivery` |

Loja pública de exemplo: `http://localhost:3000/r/burguer-do-ze`

---

## 🧱 Stack e decisões de arquitetura
- **Next.js 15 (App Router) + React 19 + TypeScript** — backend (Server Actions +
  Route Handlers) e frontend no mesmo projeto.
- **Tailwind CSS** para estilo.
- **Prisma + PostgreSQL** — ORM e banco.
- **Auth.js (NextAuth v5)** — credenciais + JWT, RBAC por papel (`OWNER`/`CUSTOMER`/`DELIVERY`).
- **Stripe** (cartão) com **abstração `PaymentProvider`** + **dinheiro na entrega**.
- **Tempo real: SSE + event bus em memória** (`src/lib/realtime`) — sem serviço externo;
  funciona em instância única. Para escalar, trocar `publish/subscribe` por Redis/Pusher.
- **Upload de imagens: storage local** (`public/uploads`) com **abstração `StorageProvider`**
  (`src/lib/storage`) — trocável por S3/Cloudinary depois.
- **Zod** para validação/sanitização no servidor.
- **Checkout convidado** via **token de pedido** (HMAC do id, em `src/lib/order-token.ts`).

### Por que SSE e storage local (e não serviços externos)?
Para o app **rodar out-of-the-box** em instância única (cenário típico de um
restaurante), sem exigir contas/chaves externas. Ambos são abstraídos, então a troca
por solução distribuída é localizada.

---

## 🗂️ Estrutura de pastas (mapa rápido)
```
prisma/
  schema.prisma          # 10 modelos: User, Restaurant, Category, Product,
                         # DeliveryPerson, Address, Order, OrderItem, Payment, Message
  seed.ts                # dados de demonstração
src/
  auth.ts, auth.config.ts, middleware.ts   # NextAuth + proteção de rotas por papel
  env.ts
  lib/
    prisma.ts, utils.ts, validations.ts (Zod), session.ts, order-token.ts
    order-status.ts      # máquina de estados (regras puras, testável)
    payments/            # provider.ts (interface) + stripe.ts
    realtime/            # bus.ts (event bus) + events.ts (canais)
    storage/             # provider.ts (interface) + local.ts + index.ts
  server/
    services/orders.ts   # changeOrderStatus (persistência + eventos)
    actions/             # auth, restaurant, products, orders, checkout, messages, delivery
  components/            # ui.tsx, chat/, cart/, checkout/, owner/, delivery/, menu/,
                         # realtime/, image-upload.tsx, order-timeline, order-status-badge
  app/
    page.tsx                       # home (lista de restaurantes)
    (auth)/login, (auth)/register
    r/[slug]                       # página pública do restaurante (cardápio)
    cart, checkout
    orders/[id]                    # acompanhamento + chat (cliente/convidado)
    account/orders                 # histórico do cliente
    owner/...                      # painel do dono (orders, products, settings, delivery)
    delivery/...                   # painel do entregador
    api/auth, api/stripe/webhook, api/realtime (SSE), api/upload
public/uploads/          # imagens enviadas (conteúdo ignorado pelo git; pasta via .gitkeep)
```

---

## 🧩 Convenções de código (padrões já estabelecidos)
- **Mutations** = Server Actions em `src/server/actions/*`. Retornam `ActionState`
  (`{ error?, success?, fieldErrors? }`) e usam `useActionState` no cliente.
- **Toda entrada é validada com Zod** (`src/lib/validations.ts`) no servidor.
- **Autorização em camadas**: `middleware.ts` (rota por papel) **+** `requireRole()`/
  checagens dentro de cada action/página (defesa em profundidade). Nunca confie só na UI.
- **Preços/totais são sempre recalculados no servidor** (checkout nunca confia no cliente).
- **Tempo real**: o servidor chama `publish(canal, evento)`; no cliente, `<RealtimeRefresher>`
  (faz `router.refresh()`) ou o `<Chat>` assinam via `useRealtime`/SSE. Canais em
  `src/lib/realtime/events.ts`.
- **Máquina de estados do pedido** em `src/lib/order-status.ts` (`ALLOWED_TRANSITIONS`);
  a transição é aplicada por `changeOrderStatus` em `src/server/services/orders.ts`.
- **Pagamento com cartão só é confirmado pelo webhook do Stripe** (nunca manualmente).
- **Imagens**: componente `<ImageUpload name="..." />` envia para `/api/upload` e guarda a URL.

---

## ✅ Estado atual e 🧭 próximos passos

### Pronto e funcionando
- [x] Área do dono (config da loja, CRUD de produtos, pedidos em tempo real, atribuir entregador, cadastrar entregadores)
- [x] Área do cliente (cardápio, carrinho, checkout login/convidado, pagamento, acompanhamento, histórico)
- [x] Área do entregador (lista, detalhes, status, chat)
- [x] Chat em tempo real (cliente ↔ entregador) com histórico
- [x] Pagamentos: Stripe (cartão) + dinheiro na entrega, webhook idempotente com estorno
- [x] Segurança: RBAC, validação/sanitização, gating de pagamento
- [x] Upload de imagens (logo + produtos)
- [x] Testes básicos (Vitest) + verificação por build de produção

### Roadmap (ideias para continuar)
- [ ] **Pix via Mercado Pago** (a abstração `PaymentProvider` já está pronta)
- [ ] **Storage externo** (S3/Cloudinary) implementando `StorageProvider`
- [x] **CI no GitHub Actions** (typecheck + test + build a cada push) — `.github/workflows/ci.yml`
- [ ] Push notifications / geolocalização do entregador no mapa
- [ ] Realtime distribuído (Redis/Pusher) para múltiplas instâncias

---

## ⚠️ Pontos de atenção (gotchas)
- **Precisa de PostgreSQL** rodando antes de `db:push`/`db:seed`/`dev`.
- **`AUTH_SECRET` é obrigatória** — além do login, assina os tokens de pedido (convidado).
- **SSE e uploads são single-instance**: funcionam em um servidor só (`next start`); para
  serverless/múltiplas instâncias, troque o realtime (Redis/Pusher) e o storage (S3/etc.).
- **Imagens enviadas não vão pro git** (`public/uploads/*` ignorado) — em outro ambiente
  elas não estarão presentes; só as URLs salvas no banco.
- **Windows/LF**: o `.gitattributes` normaliza tudo para LF — os avisos de CRLF no `git add`
  são inofensivos.
- **`prisma generate`** roda sozinho no `postinstall` e no `build`; se mexer no schema,
  rode `npm run db:push` (ou `db:migrate`) para refletir no banco.

---

## 🔗 Git / GitHub
- Repositório: **https://github.com/UyankDouglas/app-delivery**
- Branch principal: **`main`**
- Fluxo sugerido: trabalhe em branch, rode `npm run typecheck && npm run test && npm run build`
  antes de commitar, e faça PR (ou push direto na `main` para projeto solo).
