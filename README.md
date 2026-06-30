# App Pedido — Sistema de pedidos para restaurante

Sistema web completo de pedidos para restaurante, com três áreas (dono, cliente e
entregador), pagamento online, regras de negócio no backend e atualizações em
**tempo real** (status do pedido + chat).

## ✨ Funcionalidades

### Dono do restaurante (`/owner`)
- Cadastro/login do dono (já cria o restaurante).
- Configuração da loja: nome, logo, descrição, endereço, **horário de funcionamento**,
  **taxa de entrega**, pedido mínimo, **tempo médio de preparo** e **formas de pagamento**.
- Gerenciamento de produtos: criar, editar, excluir, categoria, foto, preço e
  disponível/indisponível.
- Gerenciamento de pedidos em tempo real: alterar status (Em preparo → Saiu para
  entrega → Entregue), cancelar e **atribuir entregador**.
- Cadastro de **entregadores**.

### Cliente (`/r/[slug]`, `/cart`, `/checkout`, `/orders/[id]`)
- Página pública do restaurante com cardápio por categoria.
- Carrinho de compras (persistido no navegador).
- Checkout com endereço de entrega, **login ou pedido como convidado**.
- **Pagamento online (Stripe)** ou **dinheiro na entrega**.
- **Acompanhamento do pedido em tempo real** (Em preparo / Saiu para entrega / Entregue).
- Histórico de pedidos (`/account/orders`).

### Entregador (`/delivery`)
- Login do entregador.
- Lista de pedidos atribuídos.
- Detalhes (cliente, endereço, itens, total, taxa de entrega, status).
- Atualizar status (Saiu para entrega / Entregue).
- **Chat com o cliente**.

### Chat (cliente ↔ entregador)
- Mensagens em tempo real (SSE), histórico salvo no banco, identificação do remetente,
  data/hora e notificação visual de novas mensagens.

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS |
| Banco | PostgreSQL + Prisma |
| Autenticação | Auth.js (NextAuth v5), credenciais + JWT, RBAC por papel |
| Pagamento | Stripe (abstração `PaymentProvider`) + dinheiro na entrega |
| Tempo real | Server-Sent Events + event bus em memória |
| Validação | Zod |

> **Por que SSE + event bus, e não Pusher/Supabase?** Não exige conta nem chaves
> externas — funciona "out of the box" em instância única (cenário típico de um
> restaurante). A camada é abstraída em `src/lib/realtime`; para escalar
> horizontalmente, basta reimplementar `publish/subscribe` com Redis Pub/Sub ou Pusher.

## 🚀 Como rodar

### Pré-requisitos
- Node.js 18+ (testado com 24)
- PostgreSQL em execução

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e ajuste:
```bash
cp .env.example .env
```
- `DATABASE_URL` — conexão do PostgreSQL.
- `AUTH_SECRET` — gere com `npx auth secret` (ou `openssl rand -base64 32`).
- Chaves do Stripe são **opcionais** (o método "dinheiro na entrega" funciona sem elas).

### 3. Criar o banco e popular dados de demonstração
```bash
npm run db:push      # cria as tabelas a partir do schema
npm run db:seed      # dados de exemplo (restaurante, produtos e contas)
```

### 4. Iniciar
```bash
npm run dev
```
Acesse http://localhost:3000

### 🔑 Contas de teste (senha: `senha12345`)
| Papel | E-mail |
|---|---|
| Dono | `dono@demo.com` |
| Cliente | `cliente@demo.com` |
| Entregador | `entregador@demo.com` |

Loja pública de exemplo: http://localhost:3000/r/burguer-do-ze

## 💳 Testando pagamento com cartão (Stripe)
1. Preencha `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (chaves de teste).
2. Rode o encaminhador de webhook e copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. No checkout, escolha **Cartão** e use `4242 4242 4242 4242`, validade futura e CVC qualquer.
4. O pedido só é **confirmado** quando o webhook `payment_intent.succeeded` chega — se o
   pagamento falhar, o pedido fica como `PAYMENT_FAILED` e não entra na fila do restaurante.

> Sem chaves do Stripe, use **"Dinheiro na entrega"**: o fluxo completo funciona normalmente.

## 🔄 Fluxo principal
Dono cria restaurante e produtos → cliente acessa a loja → adiciona ao carrinho →
informa endereço → paga → pedido aparece para o dono → dono coloca "Em preparo" e
atribui entregador → entregador vê o pedido → "Saiu para entrega" → cliente acompanha
em tempo real e conversa pelo chat → entregador finaliza como "Entregue".

## 🗂️ Estrutura

```
prisma/
  schema.prisma        # 10 modelos: User, Restaurant, Category, Product,
                       # DeliveryPerson, Address, Order, OrderItem, Payment, Message
  seed.ts
src/
  auth.ts, auth.config.ts, middleware.ts   # NextAuth + proteção de rotas por papel
  env.ts
  lib/                 # prisma, utils, validações (Zod), pagamentos, realtime, sessão
  server/
    services/orders.ts # máquina de estados do pedido
    actions/           # server actions (auth, restaurant, products, orders,
                       # checkout, messages, delivery)
  components/          # UI reutilizável, carrinho, chat, realtime, etc.
  app/
    page.tsx                       # home (lista de restaurantes)
    (auth)/login, (auth)/register
    r/[slug]                       # página pública do restaurante
    cart, checkout
    orders/[id]                    # acompanhamento + chat (cliente)
    account/orders                 # histórico
    owner/...                      # painel do dono
    delivery/...                   # painel do entregador
    api/auth, api/stripe/webhook, api/realtime (SSE)
```

## 🔒 Segurança
- Autenticação por papel (OWNER / CUSTOMER / DELIVERY) com JWT.
- Rotas protegidas no **middleware** (Edge) + verificação fina nas **server actions**
  e nas páginas (defesa em profundidade).
- Validação e sanitização de **todas** as entradas com Zod no servidor.
- **Preços e totais recalculados no servidor** no checkout (o cliente nunca define preço).
- Pagamento confirmado apenas via **webhook assinado** do Stripe.
- Chat e SSE autorizam acesso por participante do pedido **ou** token de pedido (convidado).
- Chaves sensíveis em variáveis de ambiente.

## 📜 Scripts
| Comando | Descrição |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run db:push` | Aplica o schema no banco |
| `npm run db:migrate` | Cria/aplica migrações |
| `npm run db:seed` | Popula dados de demonstração |
| `npm run db:studio` | Prisma Studio |

## 🧭 Possíveis evoluções
- Pix via Mercado Pago (a abstração `PaymentProvider` já está pronta).
- Upload de imagens (hoje usa URL).
- Push notifications e geolocalização do entregador no mapa.
- Realtime distribuído (Redis/Pusher) para múltiplas instâncias.
