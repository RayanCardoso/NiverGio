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
"C:/xamppv2/php/php.exe" -m | grep pdo_mysql
```

## 1. Deixar o Apache enxergar esta pasta

O jeito que não exige copiar arquivo nenhum é criar um atalho de pasta
(*junction*) dentro do `htdocs` apontando pra cá. Uma vez só, no PowerShell,
ajustando o caminho do repositório:

```powershell
New-Item -ItemType Junction -Path 'C:\xamppv2\htdocs\nivergio-api' -Target 'C:\caminho\do\repo\backend'
```

Com isso a API responde em `http://localhost/nivergio-api` e você edita os `.php`
direto no repositório — o Apache lê a mesma pasta, sem cópia e sem sincronizar
nada.

Conferir pra onde o atalho aponta, se precisar:

```powershell
(Get-Item 'C:\xamppv2\htdocs\nivergio-api' -Force).Target
```

> ⚠️ **A junction não é uma cópia.** Apagar arquivos dentro de
> `htdocs\nivergio-api` — pelo Explorer, limpando o `htdocs`, ou pelo
> desinstalador do XAMPP — apaga os arquivos **de verdade** dentro de
> `backend/`, no repositório. Já aconteceu neste projeto.
>
> Para tirar o atalho sem tocar no repositório, remova **só o link**:
>
> ```powershell
> cmd /c rmdir "C:\xamppv2\htdocs\nivergio-api"
> ```
>
> `rmdir` numa junction apaga apenas o atalho. `Remove-Item -Recurse` e o
> `del /s` do Explorer entram no destino e levam o conteúdo junto.
>
> E lembre que `backend/.env` **não está no git** — se ele for apagado assim,
> não há como recuperar pelo repositório, só pela Lixeira ou refazendo as
> credenciais no cPanel.

## 2. Porta do MariaDB

O padrão do XAMPP é 3306, mas nesta máquina a 3306 é do **MySQL Server 8.0**, que
roda como serviço do Windows. Por isso o `my.ini` do xamppv2 foi ajustado para a
**3307**, e os dois convivem sem que seja preciso desligar nada:

```bash
grep -n "^port" "C:/xamppv2/mysql/bin/my.ini"
```

O que vale é a porta da seção `[mysqld]` (o servidor). Uma coisa importante:
**sempre passe `-h 127.0.0.1 -P 3307` no `mysql.exe`.** Ele não lê o `[client]`
desse `my.ini`, então sem os parâmetros ele conecta no MySQL 8.0 da 3306 e você
mexe no banco errado achando que é o do XAMPP — o sintoma é um erro de
`caching_sha2_password`, que o MariaDB não usa.

Se um dia precisar voltar o XAMPP para a 3306, o arquivo original está salvo em
`C:\xamppv2\mysql\bin\my.ini.bak-nivergio`.

## 3. Criar o banco e a tabela

Os dois comandos abaixo rodam **a partir da raiz do repositório** (é de lá que o
caminho do `schema.sql` vale).

```bash
"C:/xamppv2/mysql/bin/mysql.exe" -u root -h 127.0.0.1 -P 3307 -e "CREATE DATABASE IF NOT EXISTS nivergio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

```bash
"C:/xamppv2/mysql/bin/mysql.exe" -u root -h 127.0.0.1 -P 3307 nivergio < backend/database/schema.sql
```

Pra recomeçar do zero depois, troque o primeiro comando por
`DROP DATABASE IF EXISTS nivergio; CREATE DATABASE nivergio ...` e rode o schema
de novo.

## 4. Criar o `.env.local`

Nesta pasta, um arquivo `.env.local`:

```
DB_HOST=127.0.0.1
DB_PORT=3307
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

Abra o **XAMPP Control Panel do `C:\xamppv2`** — se houver outra instalação de
XAMPP na máquina, não é ela — e dê **Start** em **Apache** e em **MySQL**.

É só isso que você faz toda vez que reiniciar o PC; os passos 1 a 4 são uma vez
só. Para conferir se os dois subiram:

```bash
netstat -ano -p tcp | grep LISTENING | grep -E ":80 |:3307 "
```

## 6. Conferir

```bash
curl "http://localhost/nivergio-api/rsvp?email=teste@teste.com"
```

Deve responder `{"found":false}`. Gravar e ler de volta:

```bash
curl -X POST "http://localhost/nivergio-api/rsvp" -H "Content-Type: application/json" -d "{\"email\":\"teste@teste.com\",\"name\":\"Fulano\",\"companions\":[\"Beltrano\"]}"
```

O front consome a API por um proxy, não direto — veja
[`../frontend/DEPLOY.md`](../frontend/DEPLOY.md).

## Quando não funciona

| Sintoma | Causa provável |
|---|---|
| Apache não inicia | porta 80 ocupada (IIS, Skype, outro servidor) |
| MySQL não inicia | porta do `[mysqld]` ocupada por outro MySQL |
| `Can't connect to MySQL server` no `mysql.exe` | faltou `-P` com a porta certa |
| 404 em `/nivergio-api/rsvp` | a junction não existe, ou `mod_rewrite` desligado |
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

> Se o banco já existia com a versão antiga da tabela (sem a coluna `name`), não
> rode o `CREATE TABLE`: rode só o `ALTER TABLE` comentado no fim do arquivo,
> que preserva as confirmações já feitas.

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
  da tela `/admin`, e você escolhe qual é. Ela é comparada com `hash_equals` e
  enviada a cada requisição (não existe sessão).

O `.env` não está no git e nunca deve estar — crie ele direto no servidor, ou
envie à mão.

## 3. Subir os arquivos

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
| `https://SEU-DOMINIO.com/api/rsvp?email=teste@teste.com` | `{"found":false}` |
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
  falhou. Quase sempre é o schema: tabela `rsvps` que nunca foi criada, ou
  criada na versão antiga (sem a coluna `name`) — veja o `ALTER TABLE` no fim
  do [`database/schema.sql`](database/schema.sql). O motivo exato fica no log
  de erros da conta: cPanel → **Erros**, ou o arquivo `error_log` que aparece
  na própria pasta `public_html/api/`. Procure pelas linhas `[nivergio-api]`.
- **401 no painel com a senha certa** — `ADMIN_PASSWORD` no servidor é diferente
  do que você está digitando. Espaço sobrando no fim da linha do `.env` conta.

---

# Endpoints

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/rsvp?email=` | — | `{found, email, name, companions}` |
| POST | `/rsvp` | `{email, name, companions}` | `{ok, email, name, companions}` |
| POST | `/admin` | `{password}` | `{ok, rsvps[]}` |

O `email` é a chave: gravar duas vezes com o mesmo email atualiza a confirmação
em vez de criar outra. O `name` é obrigatório — quem confirma também é convidado
e entra na contagem de pessoas do painel.

Ao mudar qualquer uma dessas formas, mude junto o
[`../frontend/api.js`](../frontend/api.js) e as telas que consomem: front e back
são publicados separadamente, então nada avisa se saírem de sincronia.
