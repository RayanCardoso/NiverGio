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

There is no test suite. PHP is only available through the local XAMPP install, so
backend changes are verified by hitting the endpoints (see README) rather than by
unit tests.

## Frontend (`frontend/`)

- **Routing is Next.js App Router with route groups**: `app/(public)/page.jsx` is
  `/`, `app/(private)/admin/page.jsx` is `/admin` (route groups don't affect the
  URL). `app/layout.jsx` holds the root `<html>/<body>`, title, favicon and the
  Google Fonts `<link>` tags.
- **Within `/`, navigation is a single `stage` string** (`'video' | 'presentes' |
  'info' | 'confirmar'`) in `useState` inside `app/(public)/page.jsx` (a client
  component). Each stage renders one full-screen component from `screens/` and
  passes callbacks (`onFinished`, `onOpenGifts`, `onOpenConfirm`, `onBack`) down
  instead of using nested routes. `/admin` is a real, separate route.
- **Screen components live in `frontend/screens/`** — deliberately not `pages/`,
  which Next reserves for the legacy Pages Router. Each screen has a co-located
  BEM-ish `.css` file imported directly into its `.jsx`.
- **`frontend/config.js` is the single source of truth for party content** —
  event date/time, dress code, the `LINKS` map (`comoChegar` only; the other two
  buttons are in-app screens), `GIFT_SUGGESTIONS`, and the PIX key. Content edits
  for the actual event go here.
- **`frontend/api.js`** is the fetch client for the RSVP backend (`/api/rsvp`,
  `/api/admin`; same-origin in production, proxied in dev by `next.config.js`'s
  `rewrites()` — target overridable via `API_PROXY_TARGET` in
  `frontend/.env.local`).
- **Media lives in `frontend/public/`** (`video.mp4`, `imagem-principal.png`),
  referenced by absolute path. `VideoPage` and `InfoPage` degrade gracefully when
  a file is missing.
- **`trailingSlash: true`** is deliberate: it emits `out/admin/index.html` instead
  of `out/admin.html`, which Apache serves as a directory index with no rewrite
  rule. Removing it 404s `/admin` in production.

### RSVP model

A guest identifies by **email only** — there is one invite for this event, so
there is no invite code and no multi-tenant logic. The entry form also collects
the guest's **name**, because the person who confirms is themselves a guest and
counts toward the head count; `AdminPage` computes every group as
`companions.length + 1`. Re-entering the same email loads the previous RSVP for
editing (upsert by email).

`AdminPage` is the organizer dashboard: totals (people, confirmations,
companions, groups of one), a searchable table, copy-emails, and CSV export
(BOM + semicolons so pt-BR Excel opens it correctly).

## Backend (`backend/`)

Plain OOP PHP, deployed by uploading the folder's contents to a subfolder of
`public_html`. No build step: manual PSR-4-style autoloader in `index.php`,
manual `.env` parser in `src/Config/Env.php`.

- `index.php` is the front controller — `.htaccess` rewrites every request
  without a matching file to `index.php?route=...`, which builds a small
  `Http\Router` and dispatches.
- `src/Controllers/RsvpController.php` — `GET /rsvp?email=` (lookup) and
  `POST /rsvp` (upsert by email, body `{ email, name, companions }`).
- `src/Controllers/AdminController.php` — `POST /admin` (body `{ password }`,
  checked against `ADMIN_PASSWORD` via `hash_equals`), returns all RSVPs as raw
  rows; the dashboard does the aggregation so the totals have one definition.
- `src/Database/Connection.php` — PDO singleton, prepared statements only,
  `utf8mb4`. `DB_PORT` is optional and defaults to 3306.
- `src/Config/Env.php` — `load()` may be called more than once and **first load
  wins**; `index.php` loads `.env.local` before `.env` so a dev machine can
  override production credentials without editing `.env`. `.env.local` must never
  be uploaded.
- `database/schema.sql` — the `rsvps` table (`email` UNIQUE, `name`, `companions`
  as JSON-encoded `TEXT`), plus a commented `ALTER TABLE` for databases created
  before the `name` column existed.
- `src/.htaccess` and `database/.htaccess` deny direct HTTP access to PHP source
  and the SQL file; the root `.htaccess` denies anything matching `^\.env`.

When changing the RSVP data model or API contract, update **both** sides by hand
— `frontend/api.js`, `frontend/screens/ConfirmPresencaPage.jsx`,
`frontend/screens/AdminPage.jsx` and the matching controller(s) — they are
deployed independently, so nothing catches a drift between them.

## Secrets

`.gitignore` blocks `.env` and `.env.*` at any depth, with `!.env.example` as the
only exception. The rules are intentionally unanchored so they keep working if
folders move. Never commit, print, or paste the contents of `backend/.env`, and
keep example values in the docs as placeholders (`SEU-DOMINIO.com`,
`usuariocpanel_convite`).
