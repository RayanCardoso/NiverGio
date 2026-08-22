# Convite de Aniversário — Tema Enrolados 👑

Convite de festa com confirmação de presença. São duas aplicações independentes
no mesmo repositório, publicadas separadamente no mesmo domínio:

```
frontend/   site em Next.js, exportado como HTML estático  -> public_html/
backend/    API em PHP + MySQL, sem framework               -> public_html/api/
```

A raiz só guarda o que é do repositório inteiro: README, CLAUDE.md e .gitignore.
O `package.json` e o `node_modules` pertencem ao front e ficam dentro de
`frontend/`; o backend não tem gerenciador de pacotes.

## Como rodar e como publicar

Cada aplicação tem o próprio guia, com uma seção de ambiente local e outra de
produção:

| | Rodar na sua máquina | Publicar na HostGator |
|---|---|---|
| **Frontend** | [frontend/DEPLOY.md](frontend/DEPLOY.md#rodar-localmente) | [frontend/DEPLOY.md](frontend/DEPLOY.md#publicar-em-produção-hostgator) |
| **Backend** | [backend/DEPLOY.md](backend/DEPLOY.md#rodar-localmente) | [backend/DEPLOY.md](backend/DEPLOY.md#publicar-em-produção-hostgator) |

Na primeira vez, comece pelo backend: o front depende dele para a confirmação de
presença e para o painel.

Resumo, com tudo já configurado: abra o **XAMPP Control Panel do `C:\xampp`**,
dê **Start** em Apache e MySQL, e depois `cd frontend && npm run dev`.

O repositório fica **dentro** do `htdocs` (`C:\xampp\htdocs\nivergio-api`), então
a API responde em `http://localhost/nivergio-api/backend/` — a raiz
`/nivergio-api/` serve o repositório, não o backend. Detalhes em
[backend/DEPLOY.md](backend/DEPLOY.md#rodar-localmente).

## Como o convite funciona

1. **Vídeo** em tela cheia; começa a tocar no primeiro toque e, ao terminar,
   avança sozinho.
2. **Informações** — imagem principal, contagem regressiva, traje sugerido e três
   botões: confirmar presença, como chegar, sugestões de presente.
3. **Confirmar presença** — quem cadastra os convidados é o organizador, pelo
   painel. Cada família recebe um link exclusivo (`/?c=<código>`) por WhatsApp;
   abrindo esse link, a pessoa vê os nomes do próprio grupo e marca, **um a
   um**, quem vai e quem não vai. Quem perder o link pode digitar o código curto
   de 6 caracteres que o organizador dita. Não existe auto-inscrição: quem não
   recebeu convite não entra na lista.
4. **Presentes** — sugestões e a chave PIX com toque para copiar.
5. **`/admin`** — painel do organizador, protegido por senha, em formato de
   dashboard com três seções: **Visão geral** (totais e o que precisa de ação),
   **Convidados** (cadastrar, editar, apagar, buscar, filtrar por status e
   exportar CSV) e **Envios** (checklist de celular com copiar mensagem, abrir
   WhatsApp e marcar o convite como enviado).

Conteúdo da festa (data, hora, traje, PIX, sugestões de presente) fica todo em
[`frontend/config.js`](frontend/config.js).

O frontend não tem suíte de testes. O backend tem uma, sem Composer
(`"C:/xampp/php/php.exe" backend/tests/run.php`) — os comandos estão no guia do
backend.

## Dados sensíveis

Nada de credencial entra no git. O `.gitignore` bloqueia `.env` e `.env.*` em
qualquer pasta (só o `.env.example` passa), o que cobre:

| Arquivo | O que guarda |
|---|---|
| `backend/.env` | banco e senha do painel, **produção** |
| `backend/.env.local` | banco local, sobrepõe o `.env` na sua máquina |
| `frontend/.env.local` | para onde o proxy do Next manda `/api/*` |

Os dois guias de deploy usam só valores de exemplo. Ao pedir ajuda ou colar log
em algum lugar, confira que não foi junto o conteúdo de um `.env`.
