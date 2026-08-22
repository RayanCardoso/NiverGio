# Frontend — rodar local e publicar

Site em Next.js exportado como HTML estático (`output: 'export'`). Em produção a
HostGator só serve arquivos — **não roda Node no servidor**.

- [Rodar localmente](#rodar-localmente)
- [Publicar em produção (HostGator)](#publicar-em-produção-hostgator)

---

# Rodar localmente

## O que precisa estar instalado

**Node** (versão 18 ou mais nova). Todos os comandos rodam **de dentro desta
pasta** — o `package.json` e o `node_modules` moram aqui, não na raiz do
repositório.

## 1. Instalar as dependências

```bash
cd frontend && npm install
```

## 2. Apontar o proxy para a API

O front chama `/api/*`, e em desenvolvimento quem atende isso é o `rewrites()` do
[`next.config.js`](next.config.js), que encaminha para o backend.

Crie `frontend/.env.local` com o alvo do proxy de dev:

```
API_PROXY_TARGET=http://localhost/nivergio-api/backend
```

O repositório fica dentro do `htdocs`, então a raiz `/nivergio-api/` serve o
repositório inteiro — é o `/backend` no fim do caminho que aponta para a API de
verdade. Veja [o guia do backend](../backend/DEPLOY.md#rodar-localmente) para
como esse caminho responde.

Esse proxy é o motivo de não haver problema de CORS: quem chama a API é o
servidor do Next, não o navegador, então tudo é mesma origem do ponto de vista da
página.

## 3. Subir o servidor

```bash
cd frontend && npm run dev
```

Abre em http://localhost:3000. Com o backend ligado, `/admin` e a confirmação de
presença já funcionam contra o banco local.

## 4. Testar contra a API já publicada

Dá pra rodar o front local batendo no banco **de produção**, sem publicar nada.
No `.env.local`:

```
API_PROXY_TARGET=https://SEU-DOMINIO.com/api
```

Útil pra conferir uma correção antes de gerar o build. Lembre que aí você está
mexendo em dados reais de confirmação.

## Comandos

```bash
npm run dev       # servidor de desenvolvimento
npm run build     # gera o site estático em out/
npm run preview   # serve o out/ como a hospedagem serviria
npm run lint      # oxlint
```

## Quando não funciona

| Sintoma | Causa provável |
|---|---|
| `Erro ao comunicar com o servidor` na confirmação | backend desligado — Apache ou MySQL parados |
| A porta 3000 já está em uso | outra instância do `npm run dev` aberta |
| Vídeo não aparece | falta `public/video.mp4` (a tela avisa e deixa pular) |
| Mudou o `.env.local` e nada mudou | o Next só lê na subida; reinicie o `npm run dev` |
| `npm run build` trava sem sair nada | o `npm run dev` está aberto; os dois disputam o `.next`, pare o dev antes |

---

# Publicar em produção (HostGator)

## 1. Conferir o conteúdo da festa

Data, hora, traje, chave PIX e sugestões de presente ficam em
[`config.js`](config.js). Isso é conteúdo, não código — revise antes de gerar o
build.

Antes de publicar, abra `frontend/config.js` e troque `SITE_URL` pelo domínio
real (sem barra no fim). É dele que sai o link exclusivo de cada família na
mensagem do WhatsApp — deixando o valor de exemplo, todos os convites saem
apontando para lugar nenhum.

Os arquivos de mídia (`video.mp4`, `imagem-principal.png`) ficam em
[`public/`](public) e entram no build automaticamente.

## 2. Gerar o build

```bash
cd frontend && npm run build
```

Sai em `frontend/out/`. Para conferir localmente antes de subir, exatamente como
a hospedagem vai servir:

```bash
cd frontend && npm run preview
```

## 3. Subir

Envie o **conteúdo** de `out/` (não a pasta) para `public_html/`, pelo
Gerenciador de Arquivos do cPanel ou por FTP:

```
public_html/index.html
public_html/admin/index.html
public_html/_next/...
public_html/video.mp4
public_html/imagem-principal.png
```

**Não apague `public_html/api/`** — é o backend, publicado separadamente (veja
[`../backend/DEPLOY.md`](../backend/DEPLOY.md)).

O `.env.local` não vai junto: ele só existe para o servidor de desenvolvimento,
que não roda em produção.

## 4. Conferir

- `https://SEU-DOMINIO.com` → o convite abre no vídeo.
- `https://SEU-DOMINIO.com/admin/` → tela de senha do painel.
- Cadastrar um grupo de teste no painel, abrir o link dele e confirmar as
  pessoas, e ver se o resultado aparece de volta no painel. Se der erro de
  comunicação, o problema está no backend, não aqui.

O `trailingSlash: true` do [`next.config.js`](next.config.js) existe por causa
disso: ele gera `admin/index.html` em vez de `admin.html`, que é o formato que o
Apache serve como índice de diretório sem precisar de regra de rewrite nenhuma.
Sem ele, `/admin` dá 404 em produção.

## O que nunca sobe pro git

`.env.local`, `out/` e `node_modules/` estão cobertos pelo `.gitignore` da raiz.
