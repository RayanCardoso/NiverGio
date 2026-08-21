# Confirmação de presença por código de família — design

Data: 2026-08-21
Status: aprovado, pronto para o plano de implementação

## Problema

Hoje o convidado se auto-cadastra: entra em `/confirmacao`, digita nome e email,
adiciona os acompanhantes que quiser e grava. O email é a chave (`rsvps.email`
UNIQUE) e o painel `/admin` só lê essa tabela.

Isso não serve ao organizador. Ele não controla quem foi convidado, não sabe se
uma família respondeu por inteiro, não tem como acompanhar a quem já mandou o
convite, e qualquer pessoa que chegue na URL entra na lista.

## Solução

Inverte-se a direção: **o organizador cadastra os grupos no painel e distribui
um link por grupo**. O convidado abre o link e marca, pessoa por pessoa, quem
vai e quem não vai — sobre a lista de nomes que o organizador cadastrou.

O modelo antigo é removido por completo. Não há migração de dados: o `rsvps`
existente é descartado (`DROP TABLE IF EXISTS rsvps`), porque nada nele tem
correspondente no modelo novo.

## Decisões tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Granularidade da presença | Por pessoa | O organizador precisa saber *quem* da família vem, não só quantos |
| O convidado pode alterar a lista? | Não | A lista cadastrada é a verdade; ele só responde sim/não por nome |
| Auth do admin | Token de sessão (12h) | O painel passa a escrever; senha em todo request ficaria exposta a sessão inteira |
| Código do grupo | GUID (UUID v4) | Inadivinhável; elimina o risco de cair no grupo de outra família |
| Como o código chega | Link no WhatsApp (`/?c=<guid>`) | Ninguém digita 36 caracteres |
| Plano B | Código curto de 6 caracteres, com limite de tentativas | Autonomia de quem perdeu o link, sem abrir força bruta |
| Contato do grupo | Telefone do responsável, opcional | Habilita o `wa.me`; email sai de cena |
| Modelo de dados | Tabelas normalizadas | Status por pessoa precisa ser consultável e filtrável |
| Visual do painel | Dashboard com sidebar, sóbrio, paleta do tema | É ferramenta, não convite |

## Modelo de dados

`backend/database/schema.sql` passa a começar com `DROP TABLE IF EXISTS rsvps;`.
Todas as tabelas em `InnoDB` / `utf8mb4_unicode_ci`.

### `guest_groups`

| coluna | tipo | notas |
|---|---|---|
| `id` | INT UNSIGNED AI PK | chave interna; nunca sai pelo endpoint público |
| `guid` | CHAR(36) NOT NULL UNIQUE | UUID v4 de `random_bytes(16)`; é o código do link |
| `short_code` | CHAR(6) NOT NULL UNIQUE | alfabeto sem `0 O 1 I`; ditado por telefone |
| `phone` | VARCHAR(20) NULL | só dígitos; **nunca** sai pelo endpoint público |
| `message_sent_at` | DATETIME NULL | check manual de "já mandei"; NULL = não enviado |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

Sem coluna de "nome do grupo": o grupo é identificado pelo responsável, que já é
uma linha em `guest_members`. Um campo a menos para preencher e para
dessincronizar.

### `guest_members`

| coluna | tipo | notas |
|---|---|---|
| `id` | INT UNSIGNED AI PK | |
| `group_id` | INT UNSIGNED FK → `guest_groups(id)` ON DELETE CASCADE | sem órfãos ao apagar grupo |
| `name` | VARCHAR(120) NOT NULL | |
| `is_responsible` | TINYINT(1) NOT NULL DEFAULT 0 | exatamente um por grupo |
| `status` | ENUM('pending','yes','no') NOT NULL DEFAULT 'pending' | fonte de "confirmados", "recusaram", "sem resposta" |
| `responded_at` | DATETIME NULL | |
| `sort_order` | SMALLINT UNSIGNED NOT NULL DEFAULT 0 | preserva a ordem cadastrada |

Índice em `group_id`.

### `admin_sessions`

| coluna | tipo | notas |
|---|---|---|
| `id` | INT UNSIGNED AI PK | |
| `token_hash` | CHAR(64) NOT NULL UNIQUE | SHA-256 do token; banco vazado não vira login |
| `expires_at` | DATETIME NOT NULL | 12h após a emissão |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

Cada login apaga as sessões expiradas de passagem — a tabela não acumula lixo.

### `code_attempts`

| coluna | tipo | notas |
|---|---|---|
| `id` | INT UNSIGNED AI PK | |
| `ip_hash` | CHAR(64) NOT NULL | SHA-256 do IP; o IP em si não é guardado |
| `attempted_at` | DATETIME NOT NULL | índice em (`ip_hash`, `attempted_at`) |

Registra **só tentativas falhas de código curto**. Regra: mais de 10 falhas em 15
minutos pelo mesmo `ip_hash` → o endpoint recusa com 429. Tentativas por GUID não
passam por aqui.

A cada verificação, o `RateLimiter` apaga registros com mais de 1 hora — assim a
tabela não cresce sem fim numa hospedagem compartilhada, e não é preciso cron.

## Contrato da API

Todas as rotas são caminhos estáticos — o `Http\Router` atual (match exato,
`get`/`post`) atende sem alteração.

### Público (sem token)

**`GET /rsvp?code=<guid|short_code>`**

- Se `code` casa com o formato UUID v4 → busca por `guid`, sem limite de
  tentativas.
- Senão → normaliza para maiúsculas e busca por `short_code`, passando pelo
  limite.
- 200: `{ found: true, code, members: [{ id, name, is_responsible, status }] }`
- 200: `{ found: false }` quando não existe
- 429 quando o limite estourou

O `code` devolvido é **o mesmo que o convidado enviou**, não o outro formato: o
front só precisa dele para reusar no `POST`, e devolver o GUID a quem entrou pelo
código curto vazaria a credencial mais forte sem necessidade.

**`POST /rsvp`** — corpo `{ code, responses: [{ id, status }] }`

- `status` só aceita `yes` ou `no`.
- Cada `id` é verificado contra o `group_id` resolvido pelo `code` **antes** de
  gravar; id de pessoa de outro grupo → 400, nada é gravado.
- Grava `status` e `responded_at` das pessoas enviadas e devolve o grupo
  atualizado no mesmo formato do `GET`.
- Reenvio sobrescreve (o convidado pode editar a resposta); não cria duplicata,
  porque a chave é o grupo.
- `responses` pode ser um subconjunto: quem não vier no corpo fica como está. A
  exigência de responder por todos é regra **de tela**, não do endpoint — o
  backend não tem por que recusar uma correção de uma pessoa só.

**Campos que o endpoint público nunca devolve:** `phone`, `short_code`,
`message_sent_at`, `id` do grupo, e qualquer dado de outro grupo. A resposta é
montada campo a campo a partir de uma lista fixa — a linha do banco não é
repassada.

### Admin (header `Authorization: Bearer <token>`)

| rota | corpo | efeito |
|---|---|---|
| `POST /admin/login` | `{ password }` | `hash_equals` contra `ADMIN_PASSWORD`; devolve `{ token, expires_at }` |
| `POST /admin/logout` | — | apaga a sessão do token |
| `GET /admin/groups` | — | todos os grupos com pessoas, telefone, códigos e `message_sent_at` |
| `POST /admin/groups/create` | `{ responsible, companions: [string], phone }` | gera `guid` + `short_code`, insere grupo e pessoas |
| `POST /admin/groups/update` | `{ id, responsible, companions: [{ id?, name }], phone }` | atualiza o grupo |
| `POST /admin/groups/delete` | `{ id }` | apaga o grupo (cascade nas pessoas) |
| `POST /admin/groups/message-sent` | `{ id, sent: bool }` | liga/desliga `message_sent_at` |

**Regra do `update` (importante):** acompanhante que chega **com** `id` é
renomeado; `id` existente que **não** veio na lista é apagado; entrada **sem**
`id` é inserida. Isso preserva o `status` de quem já respondeu quando se corrige
o nome de outra pessoa. Um "apaga tudo e reinsere" zeraria confirmações — não é
aceitável.

O responsável não entra em `companions`: ele é a linha com `is_responsible = 1`,
localizada pelo `group_id` e **renomeada no lugar**. Trocar o nome do responsável
também não zera o `status` dele.

### Geração de códigos

`Support/Codes.php`: `guid()` monta UUID v4 a partir de `random_bytes(16)`;
`shortCode()` sorteia 6 caracteres do alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
com `random_int`. Ambos com retry em caso de colisão do índice UNIQUE (até 5
tentativas, depois erro 500 logado).

### Validação (toda escrita)

- Nome do responsável obrigatório; `mb_strlen(..., 'UTF-8') <= 120` em todo nome
  (o limite da coluna é em caracteres, não em bytes)
- Nomes vazios ou só com espaço são descartados da lista de acompanhantes
- Telefone: só dígitos após limpeza, 10–13 dígitos, ou vazio → grava `NULL`
- `status` fora de `yes|no` → 400
- 100% dos acessos ao banco por `prepare` + `execute` com parâmetros nomeados

### Header `Authorization` na HostGator

O `mod_rewrite` costuma descartar o header. O `backend/.htaccess` ganha:

```
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
```

e `Http\Request::bearerToken()` lê `HTTP_AUTHORIZATION` **e**
`REDIRECT_HTTP_AUTHORIZATION`. Sem isso, funciona no XAMPP e quebra em produção.

## Arquivos do backend

Novos:

- `src/Controllers/AdminAuthController.php` — `login`, `logout`
- `src/Controllers/GroupsController.php` — `list`, `create`, `update`, `delete`,
  `markMessageSent`
- `src/Auth/AdminSession.php` — emite, valida e expira token; exige token nas
  rotas admin
- `src/Support/Codes.php` — GUID v4 e código curto
- `src/Support/RateLimiter.php` — tentativas de código curto

Reescritos:

- `src/Controllers/RsvpController.php` — `lookup` e `confirm` (sem email)
- `src/Http/Request.php` — ganha `bearerToken()`
- `index.php` — novas rotas
- `database/schema.sql` — schema novo
- `.htaccess` — repasse do `Authorization`

Removido: `src/Controllers/AdminController.php` (substituído por
`GroupsController`).

## Fluxo do convidado

O link do WhatsApp é `https://<SITE_URL>/?c=<guid>`.

1. `/` continua sendo só o vídeo. Ao terminar, `VideoPage` chama
   `router.replace('/confirmacao/?c=<guid>')` — mesmo `replace` de hoje, agora
   levando o parâmetro. Recarregar não replica o vídeo e não perde o código.
2. O código é lido de `window.location.search` dentro de um `useEffect`, **não**
   com `useSearchParams`: com `output: 'export'` o `useSearchParams` obriga a
   envolver a página num `<Suspense>` só para o build passar.

`ConfirmPresencaPage` é reescrita com quatro estados:

| estado | tela |
|---|---|
| `code` | só para quem chegou sem `?c=`: um campo para o código curto (6 caracteres, maiúsculas automáticas) |
| `loading` | busca no `GET /rsvp` |
| `list` | "Olá, família de {responsável}" + cada pessoa com dois botões (*Vai* / *Não vai*), placar ao vivo e envio |
| `done` | resumo + "Editar resposta", que volta ao `list` |

- Não há campo de texto para nomes: o convidado não adiciona nem remove ninguém.
- O botão de enviar fica desabilitado enquanto faltar alguém responder, com aviso
  "falta responder por N pessoas" — resposta parcial deixaria o painel com número
  aberto.
- Abrir o link de novo carrega os status já gravados e permite alterar.

Mensagens de erro ao convidado, sem revelar nada do sistema:

| situação | texto |
|---|---|
| código inexistente | "Código não encontrado. Confira o link que você recebeu." |
| 429 | "Muitas tentativas. Aguarde alguns minutos." |
| rede/servidor | mensagem genérica que o `api.js` já produz |

**Consequência aceita:** quem não recebeu link do organizador não consegue
confirmar. Não existe mais auto-inscrição.

## Painel admin

### Shell

Sidebar à esquerda, topo com o título da seção + "Atualizar" + "Sair", conteúdo
rolando sozinho. **No celular a sidebar vira barra inferior** com os mesmos
destinos — enviar convite é tarefa de telefone, e a seção *Envios* precisa
funcionar com o polegar.

Três seções, e só três:

1. **Visão geral** — números grandes + bloco "precisa da sua ação": grupos sem
   mensagem enviada e grupos que receberam e não responderam, cada um clicável
   levando à lista já filtrada.
2. **Convidados** — tabela completa: cadastrar, editar, apagar, expandir por
   pessoa, buscar, filtrar, exportar CSV.
3. **Envios** — modo checklist enxuto: nome, copiar mensagem, abrir WhatsApp,
   check. É tarefa diferente da tabela densa, por isso tela própria.

### Status derivado do grupo

Calculado no front a partir das pessoas, sem coluna no banco:

| status | regra |
|---|---|
| não enviado | `message_sent_at` nulo |
| aguardando | mensagem enviada e todas as pessoas em `pending` |
| parcial | parte respondeu |
| respondido | todos responderam |

Filtro por esses quatro estados + busca por nome (responsável ou acompanhante).

### Totais (topo)

Pessoas cadastradas, confirmadas, recusadas, sem resposta, grupos, grupos que já
responderam, mensagens enviadas. Todos calculados no React sobre a lista crua,
mantendo a decisão existente de ter uma definição só de cada total.

### Mensagem do WhatsApp

O texto mora em `frontend/config.js` (fonte única do conteúdo da festa), com
`{nome}` e `{link}` a preencher, mais um `SITE_URL` novo para montar
`https://<SITE_URL>/?c=<guid>`. Dois botões por grupo:

- **Copiar mensagem** — `navigator.clipboard`
- **Abrir WhatsApp** — `wa.me/55<telefone>?text=<encoded>`, só quando há
  telefone. Abre a conversa com o texto digitado; **quem aperta enviar é o
  organizador**.

**O check de "enviado" é manual.** Copiar o texto não é ter enviado; acender o
check no copiar produziria gente marcada como avisada sem ter recebido nada.

### Sessão

Token em `sessionStorage` — sobrevive a F5, morre ao fechar a aba. A senha sai do
state assim que o token chega. Token expirado devolve ao login com "Sessão
expirada, entre de novo".

### Dado sensível na tela

- O **GUID não aparece escrito** na tabela: é credencial, vai embutido nos botões
  de copiar/abrir.
- O **código curto aparece** — o organizador precisa ditá-lo.
- O **CSV** leva nomes, status, telefone e data de envio, mas **não** leva o
  GUID: planilha circula por email e grupo, e quem tem o GUID confirma presença
  pela família.

### Arquivos do frontend

`AdminPage.jsx` (hoje ~230 linhas) vira orquestrador — login, carga, filtros — e
nasce `screens/admin/` com `AdminShell.jsx` (sidebar + topo), `LoginCard.jsx`,
`OverviewSection.jsx`, `GuestsSection.jsx`, `SendsSection.jsx`, `GroupForm.jsx`,
`GroupsTable.jsx`, `GroupRow.jsx`, `StatsBar.jsx` e `inviteMessage.js`. Cada um
com o `.css` colado ao lado, como o resto do projeto.

`Sparkles` sai do painel. A paleta do tema (roxo e dourado) é herdada nos
acentos, sobre superfícies escuras e densas — o painel é ferramenta, não convite.
A implementação dessa parte passa pela skill `anti-ai-slop-ui`, com tokens de
design definidos antes do CSS.

`api.js` perde `lookupRsvp`, `saveRsvp` e `fetchAdminRsvps`; ganha `lookupGroup`,
`confirmGroup`, `adminLogin`, `adminLogout`, `fetchGroups`, `createGroup`,
`updateGroup`, `deleteGroup`, `setMessageSent`. O token é injetado em um lugar só,
e o 401 é tratado em um lugar só — derruba a sessão e volta ao login, em vez de
cada tela adivinhar.

Não são tocados: `InfoPage`, `GiftsPage`, `Countdown`, `Sparkles`, `GiftIcons`,
`next.config.js`.

## Segurança

- Todo acesso ao banco por statement preparado; nenhuma concatenação de SQL
- `ADMIN_PASSWORD` só no `.env`, comparada com `hash_equals`
- Token nunca em claro no banco (SHA-256) e nunca na URL — header não entra em
  log de acesso do Apache nem no histórico do navegador
- Endpoint público com lista fixa de campos na resposta
- Limite de tentativas por `ip_hash` no código curto; GUID isento
- `src/.htaccess` e `database/.htaccess` seguem negando acesso direto; a raiz
  segue bloqueando `^\.env`
- **Pré-requisito de produção: HTTPS.** Em HTTP puro o token viaja legível. Vira
  linha explícita no `backend/DEPLOY.md`.

Códigos de erro: 400 validação, 401 token inválido ou expirado, 404 rota, 429
limite, 500 genérico. O `set_exception_handler` do `index.php` continua mandando
a causa real para o log e só `{"error":"Erro interno no servidor."}` para o
cliente.

## Verificação

Não há suíte de testes e o PHP só roda pelo XAMPP; a verificação é por endpoint
(`curl`) e pelo fluxo no navegador. Lembrar: MariaDB do `C:\xamppv2` na **3307**,
e `mysql.exe` exige `-h 127.0.0.1 -P 3307`.

Cenários obrigatórios:

1. Código inexistente → `{ found: false }`
2. Código de uma família não abre o grupo de outra
3. `POST /rsvp` com `id` de pessoa de outro grupo → 400, nada gravado
4. Rotas admin sem token, com token inválido e com token expirado → 401
5. `update` renomeando um acompanhante **não** zera o status de quem já respondeu
6. `delete` do grupo apaga as pessoas (cascade), sem órfão
7. Limite de tentativas dispara em 10 falhas/15min e libera após a janela
8. Colisão de `short_code` é resolvida pelo retry
9. Fluxo completo no navegador: cadastrar grupo → copiar mensagem → abrir link →
   marcar pessoa a pessoa → ver no painel
10. `npm run build` passa (com o `npm run dev` fechado, senão trava no `.next`)

## Documentação a atualizar

| arquivo | o que muda |
|---|---|
| `README.md` | "Como o convite funciona" descreve o fluxo por email |
| `CLAUDE.md` | a seção "RSVP model" inteira, e a lista de rotas do backend |
| `backend/DEPLOY.md` | schema novo + HTTPS obrigatório |
| `frontend/DEPLOY.md` | `SITE_URL` novo em `config.js` |

## Ordem de publicação

Schema → backend → frontend. O inverso deixa o site pedindo tabela que não
existe.

## Fora de escopo

- Envio automático de mensagens (o organizador sempre aperta enviar)
- Campo de observação por grupo
- Múltiplos eventos / multi-tenant
- Notificação ao organizador quando alguém confirma
