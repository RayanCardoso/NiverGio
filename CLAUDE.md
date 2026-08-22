# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Invitation site for a birthday party ("Enrolados"/Tangled theme) with RSVP. Two
independent applications live side by side and are deployed separately to the
same HostGator domain:

- `frontend/` — Next.js (App Router), statically exported (`output: 'export'`) → `public_html/`
- `backend/` — self-contained PHP + MySQL API, no framework, no Composer → `public_html/api/`

Neither folder is nested under the other, and there is no `src/` wrapper. Each
one is self-contained — its own `DEPLOY.md`, and for the frontend its own
`package.json` and `node_modules`.

## Commands

**All npm commands run from `frontend/`, not the repo root.** `package.json`,
`package-lock.json`, `node_modules` and `.oxlintrc.json` all live inside
`frontend/` — the repo root holds only repo-wide files (README, CLAUDE.md,
.gitignore). The backend has no package manager at all.

```bash
cd frontend
npm install       # install deps
npm run dev       # http://localhost:3000
npm run build     # static export -> frontend/out/
npm run preview   # serve the exported build (npx serve out)
npm run lint      # oxlint (rules in frontend/.oxlintrc.json)
```

The frontend has no test suite. The backend does — see `tests/` under
[Backend](#backend-backend) below — since PHP is only available through the
local XAMPP install and changes need something more than hitting endpoints by
hand.

## Frontend (`frontend/`)

- **Routing is Next.js App Router with route groups** (route groups don't affect
  the URL): `app/(public)/page.jsx` is `/`, `app/(public)/confirmacao/page.jsx`
  is `/confirmacao`, `app/(private)/admin/page.jsx` is `/admin`.
  `app/layout.jsx` holds the root `<html>/<body>`, title, favicon and the Google
  Fonts `<link>` tags.
- **`/` is only the opening video.** When it ends, `VideoPage`'s `onFinished`
  calls `router.replace('/confirmacao')` — a real route change, not a state
  change. That is deliberate: reloading must not replay the video, and `replace`
  (not `push`) keeps the browser Back button from dropping the guest back into
  it. Any internal link meant for "the invite" must point at `/confirmacao/`,
  never `/`.
- **Everything after the video lives at `/confirmacao`**, where navigation is a
  single `stage` string (`'info' | 'presentes' | 'confirmar'`) in `useState`
  inside `app/(public)/confirmacao/page.jsx` (a client component). Each stage
  renders one full-screen component from `screens/` and passes callbacks
  (`onOpenGifts`, `onOpenConfirm`, `onBack`) down instead of using nested routes.
- **Screen components live in `frontend/screens/`** — deliberately not `pages/`,
  which Next reserves for the legacy Pages Router. Each screen has a co-located
  BEM-ish `.css` file imported directly into its `.jsx`.
- **`frontend/config.js` is the single source of truth for party content** —
  event date/time, dress code, the `LINKS` map (`comoChegar` only; the other two
  buttons are in-app screens), `GIFT_SUGGESTIONS`, and the PIX key. Content edits
  for the actual event go here.
- **`frontend/api.js`** is the fetch client for the backend (`/api/rsvp`,
  `/api/admin/*`; same-origin in production, proxied in dev by `next.config.js`'s
  `rewrites()` — target overridable via `API_PROXY_TARGET` in
  `frontend/.env.local`).
- **Media lives in `frontend/public/`** (`video.mp4`, `imagem-principal.png`),
  referenced by absolute path. `VideoPage` and `InfoPage` degrade gracefully when
  a file is missing.
- **`trailingSlash: true`** is deliberate: it emits `out/admin/index.html` instead
  of `out/admin.html`, which Apache serves as a directory index with no rewrite
  rule. Removing it 404s `/admin` in production.

### Modelo de convidados

Quem cadastra é o organizador, pelo painel — não há auto-inscrição e não há
email em lugar nenhum. Cada **grupo** (`guest_groups`) tem um `guid` (o código
do link do WhatsApp), um `short_code` de 6 caracteres (ditado por telefone,
protegido por limite de tentativas) e um telefone opcional. Cada pessoa do grupo
é uma linha em `guest_members`, com `status` `pending`/`yes`/`no` — inclusive o
responsável, que também é convidado e conta na cabeça.

O convidado abre `/?c=<guid>`, o código atravessa a troca de rota até
`/confirmacao/` e ele marca pessoa por pessoa. A tela só libera o envio quando
todos foram respondidos; o endpoint, porém, aceita subconjunto — a exigência é
de tela, não de API.

O painel escreve no banco, então toda rota `/admin/*` (fora `login`) exige
`Authorization: Bearer <token>`, validado por `AdminSession::guard()`. O token
vale 12h, o banco guarda só o SHA-256 dele, e o navegador o mantém em
`sessionStorage`.

O status de um grupo (**não enviado / aguardando / parcial / respondido**) é
derivado no front por `screens/admin/groupStats.js` — uma definição só para as
três seções do painel.

## Backend (`backend/`)

Plain OOP PHP, deployed by uploading the folder's contents to a subfolder of
`public_html`. No build step: manual PSR-4-style autoloader in `index.php`,
manual `.env` parser in `src/Config/Env.php`.

- `index.php` is the front controller — `.htaccess` rewrites every request
  without a matching file to `index.php?route=...`, which builds a small
  `Http\Router` and dispatches.
- `src/Controllers/RsvpController.php` — público: `GET /rsvp?code=` (busca o
  grupo por GUID ou código curto) e `POST /rsvp` (grava `{ code, responses }`).
  Monta a resposta campo a campo: telefone, código curto e id do grupo nunca
  saem por aqui.
- `src/Controllers/AdminAuthController.php` — `POST /admin/login` e
  `POST /admin/logout`.
- `src/Controllers/GroupsController.php` — `GET /admin/groups` e os `POST`
  `/admin/groups/create`, `/update`, `/delete`, `/message-sent`. No `update`, o
  acompanhante que vem com `id` é **renomeado no lugar** — recriar zeraria o
  status de quem já respondeu.
- `src/Auth/AdminSession.php`, `src/Support/Codes.php`,
  `src/Support/RateLimiter.php` — sessão, geração de códigos e freio de força
  bruta no código curto.
- `src/Database/Connection.php` — PDO singleton, prepared statements only,
  `utf8mb4`. `DB_PORT` is optional and defaults to 3306.
- `src/Config/Env.php` — `load()` may be called more than once and **first load
  wins**; `index.php` loads `.env.local` before `.env` so a dev machine can
  override production credentials without editing `.env`. `.env.local` must never
  be uploaded.
- `database/schema.sql` — as tabelas `guest_groups`, `guest_members`,
  `admin_sessions` e `code_attempts`; começa com `DROP TABLE IF EXISTS rsvps`,
  encerrando a tabela do modelo antigo.
- `tests/` — runner sem Composer: `"C:/xampp/php/php.exe" backend/tests/run.php`.
  Bate na API por HTTP e trunca as tabelas, então recusa rodar se `DB_HOST` não
  for local. **Não subir esta pasta para produção.**
- `src/.htaccess`, `tests/.htaccess` e `database/.htaccess` deny direct HTTP
  access to PHP source, the test runner, and the SQL file; the root `.htaccess`
  denies anything matching `^\.env`.

When changing the guest data model or API contract, update **both** sides by
hand — `frontend/api.js`, `frontend/screens/ConfirmPresencaPage.jsx`,
`frontend/screens/AdminPage.jsx` and the matching controller(s) — they are
deployed independently, so nothing catches a drift between them.

## Secrets

`.gitignore` blocks `.env` and `.env.*` at any depth, with `!.env.example` as the
only exception. The rules are intentionally unanchored so they keep working if
folders move. Never commit, print, or paste the contents of `backend/.env`, and
keep example values in the docs as placeholders (`SEU-DOMINIO.com`,
`usuariocpanel_convite`).

## Ambiente local (armadilhas conhecidas)

- O XAMPP em uso é o de `C:\xampp`. O repositório fica **dentro** do
  `htdocs` (`C:\xampp\htdocs\nivergio-api`), então a API responde em
  `http://localhost/nivergio-api/backend/` — a raiz `/nivergio-api/` serve o
  repositório, não o backend. É esse caminho que vai no `API_PROXY_TARGET` do
  `frontend/.env.local`.
- (Histórico: houve uma instalação em `C:\xamppv2`, com o MariaDB na 3307 e uma
  *junction* `htdocs\nivergio-api` → `backend/`. Ela não existe mais. Se um dia
  voltar a usar junction, lembre que `Remove-Item -Recurse` entra no destino e
  apaga o repositório — use `cmd /c rmdir`.)
- O PHP CLI **não está no PATH**: use `"C:/xampp/php/php.exe"`.
- `npm run build` trava se o `npm run dev` estiver aberto: os dois disputam
  `frontend/.next`.
