# Backend — rodar local e publicar

API PHP + MySQL, sem framework e sem Composer. Não tem build nem `npm install`:
é subir os arquivos e criar o `.env`.

- [Rodar localmente](#rodar-localmente)
- [Publicar em produção (HostGator)](#publicar-em-produção-hostgator)

---

# Rodar localmente

## O que precisa estar instalado

Só o **XAMPP** — ele traz o Apache, o PHP e o MariaDB. Não precisa de Composer,
Docker ou MySQL avulso.

Confira que o PHP do XAMPP tem a extensão `pdo_mysql` ligada (vem ligada por
padrão):

```bash
"C:/xampp/php/php.exe" -m | grep pdo_mysql
```

## 1. Onde o Apache enxerga esta pasta

O XAMPP em uso é o de `C:\xampp`, e o repositório fica **dentro** do `htdocs`
(`C:\xampp\htdocs\nivergio-api`) — não há mais atalho nem cópia envolvidos. Por
isso a API responde em `http://localhost/nivergio-api/backend/`: a raiz
`/nivergio-api/` serve o repositório inteiro, não o backend, e é o caminho
`/backend/` que vai no `API_PROXY_TARGET` do `frontend/.env.local`.

> (Histórico: houve uma instalação em `C:\xamppv2`, com uma *junction*
> `htdocs\nivergio-api` → `backend/`. Ela não existe mais nesta máquina. Se um
> dia voltar a usar junction, lembre que `Remove-Item -Recurse` e o `del /s` do
> Explorer entram no destino e apagam o conteúdo de verdade — use
> `cmd /c rmdir` para tirar só o atalho.)

## 2. Porta do MariaDB

O padrão do XAMPP é 3306, e é essa a porta em uso nesta máquina — o MariaDB é o
10.4.32. Conferir, se precisar:

```bash
grep -n "^port" "C:/xampp/mysql/bin/my.ini"
```

## 3. Criar o banco e a tabela

Os dois comandos abaixo rodam **a partir da raiz do repositório** (é de lá que o
caminho do `schema.sql` vale).

```bash
"C:/xampp/mysql/bin/mysql.exe" -u root -h 127.0.0.1 -P 3306 -e "CREATE DATABASE IF NOT EXISTS nivergio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

```bash
"C:/xampp/mysql/bin/mysql.exe" -u root -h 127.0.0.1 -P 3306 nivergio < backend/database/schema.sql
```

Pra recomeçar do zero depois, troque o primeiro comando por
`DROP DATABASE IF EXISTS nivergio; CREATE DATABASE nivergio ...` e rode o schema
de novo.

## 4. Criar o `.env.local`

Nesta pasta, um arquivo `.env.local`:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nivergio
DB_USER=root
DB_PASS=
ADMIN_PASSWORD=escolha uma senha qualquer pro /admin local
```

O root do MariaDB do XAMPP vem sem senha, por isso o `DB_PASS` vazio.

**Esse arquivo tem prioridade sobre o `.env`.** O `index.php` carrega o
`.env.local` primeiro e o primeiro valor lido vence, então o `.env` de produção
pode continuar na pasta sem atrapalhar o desenvolvimento. Ele está no
`.gitignore` e **nunca deve ser enviado pro servidor**.

## 5. Ligar

Abra o **XAMPP Control Panel do `C:\xampp`** e dê **Start** em **Apache** e em
**MySQL**.

É só isso que você faz toda vez que reiniciar o PC; os passos 1 a 4 são uma vez
só. Para conferir se os dois subiram:

```bash
netstat -ano -p tcp | grep LISTENING | grep -E ":80 |:3306 "
```

## 6. Conferir

```bash
curl "http://localhost/nivergio-api/backend/rsvp?code=algum-guid-ou-codigo-curto"
```

Com um código válido, deve responder o grupo e os nomes de cada pessoa. A
suíte em `tests/` cobre o resto:

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

O front consome a API por um proxy, não direto — veja
[`../frontend/DEPLOY.md`](../frontend/DEPLOY.md).

## Fusos horários: PHP e MySQL não são o mesmo relógio

Nesta máquina, o PHP roda em `Europe/Berlin` e o MariaDB em `SYSTEM` (o fuso do
Windows) — uma diferença de cinco horas medida na prática. Isso já causou um
bug real: o `expires_at` da sessão do painel era calculado com `date()` do PHP
em `AdminSession::login()` e depois comparado com `NOW()` do MySQL em
`AdminSession::isValid()`, e a sessão durava 17 horas em vez das 12 combinadas,
silenciosamente — sem erro, só a sessão recusando o token mais cedo ou mais
tarde do que o esperado.

Por isso **todas** as datas do sistema (`expires_at`, `responded_at`,
`message_sent_at`, `created_at`, `updated_at`) vêm do relógio do **banco**
(`NOW()`, `DATE_ADD(NOW(), ...)`), nunca do `date()` do PHP. É a garantia de que
a comparação de prazo e o carimbo de tempo estão sempre no mesmo relógio,
qualquer que seja o fuso de cada um nesta máquina ou na HostGator.

**Não "conserte" isso para `date()` do PHP.** A invariante a preservar: um
`grep -rn "date('Y-m-d" backend/src` não deve retornar nada. Se algum dia
retornar, é sinal de que o bug voltou.

## Quando não funciona

| Sintoma | Causa provável |
|---|---|
| Apache não inicia | porta 80 ocupada (IIS, Skype, outro servidor) |
| MySQL não inicia | porta do `[mysqld]` ocupada por outro MySQL |
| `Can't connect to MySQL server` no `mysql.exe` | faltou `-P` com a porta certa |
| 404 em `/nivergio-api/backend/rsvp` | caminho errado (falta o `/backend/`), ou `mod_rewrite` desligado |
| `Falha ao conectar ao banco de dados.` | `.env.local` com porta, banco ou senha errados |
| `Rota não encontrada.` | rota certa, método errado (GET x POST) |

---

# Publicar em produção (HostGator)

A API vai para uma **subpasta** de `public_html`, normalmente `public_html/api/`,
porque o front ocupa a raiz. Se você usar outro nome de pasta, o endereço da API
muda junto (`/minhapasta/rsvp` em vez de `/api/rsvp`).

## 1. Criar o banco

cPanel → **Bancos de Dados MySQL** (*MySQL Databases*):

1. **Criar novo banco.** O cPanel prefixa com o nome do usuário do cPanel, então
   um banco chamado `convite` vira `usuariocpanel_convite` — é esse nome
   completo que vai no `DB_NAME`.
2. **Criar novo usuário.** Mesma regra de prefixo. Use o gerador de senha e
   **copie a senha na hora**: o cPanel não mostra ela de novo. Se perder, dá pra
   trocar depois em *Alterar senha* no próprio usuário.
3. **Adicionar usuário ao banco** com **ALL PRIVILEGES**. Pular esse passo é o
   erro mais comum: a conexão até abre, mas todo SELECT/INSERT falha por
   permissão.
4. cPanel → **phpMyAdmin** → selecionar o banco → aba **SQL** → colar o conteúdo
   de [`database/schema.sql`](database/schema.sql) → executar.

O `schema.sql` começa com `DROP TABLE IF EXISTS rsvps` — a tabela do modelo
antigo (auto-cadastro por email). Rodá-lo num banco que ainda tenha confirmações
do modelo antigo **apaga essas confirmações**, e não há como recuperá-las: nada
nelas tem correspondente no modelo novo.

**Ordem de publicação: schema → backend → frontend.** O inverso deixa o site
pedindo tabela que ainda não existe, e o convidado vê erro de servidor.

## 2. Criar o `.env`

Copie [`.env.example`](.env.example) para `.env` e preencha:

```
DB_HOST=localhost
DB_NAME=usuariocpanel_convite
DB_USER=usuariocpanel_usuario
DB_PASS=a senha gerada no passo 2
ADMIN_PASSWORD=a senha que abre o painel /admin
```

- **`DB_HOST=localhost`**, sempre. O PHP roda na mesma máquina do MySQL. O
  endereço `brXXX.hostgator.com.br` que aparece no cPanel serve para conectar de
  fora (Workbench, DBeaver) e, nesse caso, ainda exige liberar o seu IP em
  cPanel → *MySQL Remoto*.
- **`DB_PORT`** não entra aqui — na HostGator o padrão 3306 já vale. Ele existe
  só por causa do ambiente local.
- **`ADMIN_PASSWORD`** não tem relação com o cPanel nem com o banco. É só a senha
  da tela `/admin`, e você escolhe qual é. Ela é comparada com `hash_equals`,
  mas só uma vez, no login: a senha é trocada por um token de sessão com
  validade de 12h, que viaja no header `Authorization` em cada requisição
  seguinte. O banco guarda só o SHA-256 do token, nunca a senha nem o token em
  claro.

O `.env` não está no git e nunca deve estar — crie ele direto no servidor, ou
envie à mão.

## 3. Subir os arquivos

> ⚠️ **HTTPS é pré-requisito.** O painel autentica por token no header
> `Authorization`; em HTTP puro ele viaja legível e qualquer um na mesma rede
> copia a sessão. Confirme o SSL do domínio no cPanel antes de publicar.
>
> **Não suba a pasta `tests/`.** Ela trunca tabelas e não tem função em
> produção. O `.htaccess` dentro dela já nega acesso por HTTP, mas o certo é
> não subir.

Envie o **conteúdo** desta pasta para `public_html/api/`:

```
public_html/api/index.php
public_html/api/.htaccess
public_html/api/.env          <- criado por você, não vem do git
public_html/api/src/...
public_html/api/database/...
```

Duas coisas que costumam dar problema:

- **Arquivos ocultos.** No Gerenciador de Arquivos, ative *Configurações →
  Mostrar arquivos ocultos (dotfiles)*, senão `.htaccess` e `.env` não aparecem —
  e vários clientes de FTP também os ignoram por padrão.
- **Não envie o `.env.local`.** Ele aponta pro banco da sua máquina e tem
  prioridade sobre o `.env`, então derrubaria a API em produção.

## 4. Conferir depois de subir

| Endereço | Esperado |
|---|---|
| `https://SEU-DOMINIO.com/api/rsvp?code=algum-guid-de-teste` | `{"found":false}` |
| `https://SEU-DOMINIO.com/api/.env` | **403 Forbidden** |
| `https://SEU-DOMINIO.com/api/.env.example` | **403 Forbidden** |
| `https://SEU-DOMINIO.com/api/src/Config/Env.php` | **403 Forbidden** |
| `https://SEU-DOMINIO.com/api/database/schema.sql` | **403 Forbidden** |

Se algum dos três últimos devolver o conteúdo do arquivo em vez de 403, o Apache
não está lendo os `.htaccess` — **não deixe assim**, é o `.env` com a senha do
banco exposto na internet. Fale com o suporte da HostGator para confirmar que o
`AllowOverride` está habilitado.

Diagnóstico dos erros mais comuns:

- **404 em `/api/rsvp`** — o `.htaccess` não subiu, ou o `mod_rewrite` não está
  ativo. O endereço `/api/index.php?route=rsvp` deve funcionar mesmo assim; se
  funcionar, o problema é só a reescrita.
- **500 com `Falha ao conectar ao banco de dados.`** — `.env` errado. Revise
  `DB_NAME`/`DB_USER` (com prefixo!), a senha, e se o usuário foi adicionado ao
  banco com todos os privilégios. **Confira também se um `.env.local` foi parar
  no servidor**: ele vence o `.env` e aponta pro banco da máquina de
  desenvolvimento, que não existe lá — o sintoma é exatamente este 500.
- **500 com `Erro interno no servidor.`** — a conexão abriu, mas a consulta
  falhou. Quase sempre é o schema: as tabelas `guest_groups`/`guest_members`
  nunca foram criadas — rode o [`database/schema.sql`](database/schema.sql)
  inteiro (passo 1 acima). O motivo exato fica no log de erros da conta:
  cPanel → **Erros**, ou o arquivo `error_log` que aparece na própria pasta
  `public_html/api/`. Procure pelas linhas `[nivergio-api]`.
- **401 no painel com a senha certa** — `ADMIN_PASSWORD` no servidor é diferente
  do que você está digitando. Espaço sobrando no fim da linha do `.env` conta.

---

# Endpoints

Público, sem `Authorization`:

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/rsvp?code=` | — | `{found, code, members[]}` (busca por `guid` ou `short_code`) |
| POST | `/rsvp` | `{code, responses: [{id, status}]}` | `{found, code, members[]}` |

`status` só aceita `yes` ou `no` — `pending` é o estado inicial, não uma
resposta possível. `members[]` nunca inclui telefone, código curto ou id do
grupo: só o necessário para a tela de confirmação.

Do painel, exigem `Authorization: Bearer <token>` (fora o próprio login):

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/admin/login` | `{password}` | `{ok, token, expires_at}` |
| POST | `/admin/logout` | — | `{ok}` |
| GET | `/admin/groups` | — | `{ok, groups[]}` (cada grupo com seus `members[]`) |
| POST | `/admin/groups/create` | `{responsible, companions[], phone?}` | `{ok, id}` |
| POST | `/admin/groups/update` | `{id, responsible, companions[], phone?}` | `{ok}` |
| POST | `/admin/groups/delete` | `{id}` | `{ok}` |
| POST | `/admin/groups/message-sent` | `{id, sent}` | `{ok, message_sent_at}` |

No `update`, todo acompanhante com `id` é renomeado no lugar (nunca recriado) —
recriar zeraria o status de quem já respondeu.

Ao mudar qualquer uma dessas formas, mude junto o
[`../frontend/api.js`](../frontend/api.js) e as telas que consomem: front e back
são publicados separadamente, então nada avisa se saírem de sincronia.
