# Confirmação por código de família — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a confirmação de presença auto-cadastrada por email por um modelo em que o organizador cadastra os grupos no painel e cada família confirma, pessoa por pessoa, através de um link exclusivo.

**Architecture:** Backend PHP sem framework com quatro tabelas normalizadas (`guest_groups`, `guest_members`, `admin_sessions`, `code_attempts`), token de sessão para toda escrita do painel, e endpoint público que resolve o grupo por GUID (link) ou código curto (com freio de força bruta). Frontend Next.js estático: o convidado lê o código da query string e marca cada pessoa; o painel vira um dashboard com sidebar.

**Tech Stack:** PHP 8.0 (XAMPP, sem Composer), MySQL/MariaDB via PDO, Next.js 15 App Router com `output: 'export'`, React 19, oxlint.

**Spec:** `docs/superpowers/specs/2026-08-21-confirmacao-por-codigo-de-familia-design.md`

## Global Constraints

- **Todo acesso ao banco por `prepare` + `execute` com parâmetros nomeados.** Nenhum valor vindo do cliente entra no texto do SQL, nem casteado para `int`. Onde o MySQL não aceita placeholder (`INTERVAL`), o valor é uma constante de classe, nunca entrada do usuário.
- **O endpoint público (`/rsvp`) monta a resposta campo a campo.** Nunca repassa a linha do banco. Nunca devolve `phone`, `short_code`, `message_sent_at`, `id` do grupo, `guid` de quem entrou pelo código curto, nem dado de outro grupo.
- **Toda rota `/admin/*` (exceto `login`) chama `AdminSession::guard()` na primeira linha.**
- **Nenhum segredo no git.** `backend/.env*` e `frontend/.env.local` são ignorados; nunca imprima o conteúdo deles em log, commit ou mensagem.
- **PHP 8.0**: sem `enum`, sem `readonly`, sem propriedades promovidas no construtor. O código existente usa `isset(...) ? ... : ...` em vez de `??` — mantenha o estilo.
- **Comentários em português**, explicando *por que*, não *o que* — é o padrão do repositório.
- **Idioma da interface: português do Brasil.**
- **`npm` roda de dentro de `frontend/`**, nunca da raiz.
- **PHP CLI:** `"C:/xampp/php/php.exe"` (não está no PATH).
- **Nenhuma dependência nova** no `package.json` nem no backend.

---

## Estrutura de arquivos

**Backend — criar**

| arquivo | responsabilidade |
|---|---|
| `backend/src/autoload.php` | autoloader PSR-4 manual, compartilhado entre `index.php` e os testes |
| `backend/src/Support/Codes.php` | gera GUID v4 e código curto; reconhece o formato do GUID |
| `backend/src/Support/RateLimiter.php` | conta tentativas falhas de código curto por hash de IP |
| `backend/src/Auth/AdminSession.php` | emite, valida, expira e revoga o token do painel |
| `backend/src/Controllers/AdminAuthController.php` | `login`, `logout` |
| `backend/src/Controllers/GroupsController.php` | `index`, `create`, `update`, `destroy`, `markMessageSent` |
| `backend/tests/run.php` | runner de testes sem Composer |
| `backend/tests/bootstrap.php` | autoloader + `.env` + trava de segurança contra rodar em produção |
| `backend/tests/lib.php` | asserções, cliente HTTP e helpers |
| `backend/tests/cases/*.php` | os testes, um arquivo por assunto |
| `backend/tests/.htaccess` | nega acesso HTTP à pasta |

**Backend — modificar**

| arquivo | mudança |
|---|---|
| `backend/index.php` | usa `src/autoload.php`; registra as rotas novas |
| `backend/.htaccess` | repassa o header `Authorization` |
| `backend/src/Http/Request.php` | ganha `bearerToken()` e `ip()` |
| `backend/src/Controllers/RsvpController.php` | reescrito: `lookup` e `confirm` por código |
| `backend/database/schema.sql` | reescrito: quatro tabelas |

**Backend — apagar:** `backend/src/Controllers/AdminController.php`

**Frontend — criar**

| arquivo | responsabilidade |
|---|---|
| `frontend/.env.local` | `API_PROXY_TARGET` do proxy de dev (ignorado pelo git) |
| `frontend/screens/admin/adminTokens.css` | tokens de cor/espaço/tipografia do painel |
| `frontend/screens/admin/AdminShell.jsx` + `.css` | sidebar, topo e área de conteúdo |
| `frontend/screens/admin/LoginCard.jsx` + `.css` | tela de senha |
| `frontend/screens/admin/OverviewSection.jsx` + `.css` | totais e blocos de ação |
| `frontend/screens/admin/GuestsSection.jsx` + `.css` | tabela, busca, filtros, CSV |
| `frontend/screens/admin/GroupRow.jsx` + `.css` | uma linha expansível de grupo |
| `frontend/screens/admin/GroupForm.jsx` + `.css` | cadastro e edição |
| `frontend/screens/admin/SendsSection.jsx` + `.css` | checklist de envio |
| `frontend/screens/admin/groupStats.js` | status derivado do grupo e totais — uma definição só |
| `frontend/screens/admin/inviteMessage.js` | monta link, mensagem e URL do WhatsApp |

**Frontend — modificar:** `api.js` (reescrito), `config.js`, `app/(public)/page.jsx`, `app/(public)/confirmacao/page.jsx`, `screens/ConfirmPresencaPage.jsx` + `.css` (reescritos), `screens/AdminPage.jsx` + `.css` (reescritos como orquestrador).

**Docs — modificar:** `README.md`, `CLAUDE.md`, `backend/DEPLOY.md`, `frontend/DEPLOY.md`.

---

## Como se testa neste projeto

O backend ganha um runner próprio (Task 1): testes de integração que batem no Apache local por HTTP, o que exercita `.htaccess`, roteamento, JSON e o header `Authorization` de verdade. Rodar:

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

> ⚠️ **Correção aplicada durante a execução:** o argumento de filtro casa com a
> **descrição** de cada teste, não com o nome do arquivo — então `run.php auth`
> casa com zero testes e imprime `0 passaram, 0 falharam`, que *parece* verde.
> Ignore os comandos com filtro que aparecem nos passos das tasks abaixo: rode
> sempre a suíte inteira, sem argumento. Os totais cumulativos esperados são
> T1→1, T2→5, T3→9, T4→17, T5→25, T6→33, T7→38, T8→47, T9→56.

O filtro existe para depuração pontual, e casa com parte da **descrição** do
teste (não do arquivo):

```bash
"C:/xampp/php/php.exe" backend/tests/run.php "codigo curto"
```

O frontend **não tem** runner de testes e não vai ganhar um: verificação é `npm run lint`, `npm run build` e observação no navegador, com o resultado esperado escrito em cada passo.

---

### Task 1: Ambiente local, autoloader compartilhado e runner de testes

Sem isto nenhuma task seguinte tem como provar nada. Também corrige o descompasso entre os docs e a máquina: `C:\xamppv2` não existe mais, o XAMPP ativo é o `C:\xampp`, e `C:\xampp\htdocs\nivergio-api` é o próprio repositório — então a API local responde em `http://localhost/nivergio-api/backend/`, não em `http://localhost/nivergio-api`.

**Files:**
- Create: `backend/src/autoload.php`
- Create: `backend/tests/bootstrap.php`, `backend/tests/lib.php`, `backend/tests/run.php`, `backend/tests/.htaccess`
- Create: `backend/tests/cases/00-smoke.php`
- Create: `frontend/.env.local` (não vai para o git)
- Modify: `backend/index.php` (linhas 10-20, o `spl_autoload_register` inline)

**Interfaces:**
- Consumes: nada.
- Produces: `api_base()`, `http_call($method, $path, $body = null, $token = null): array{status:int, body:?array, raw:string}`, `reset_tables(): void`, `test(string $name, callable $fn): void`, `check(bool $cond, string $msg): void`, `check_same(mixed $expected, mixed $actual, string $msg): void` — usados por todas as tasks de backend.

- [ ] **Step 1: Subir Apache e MySQL**

Abra o **XAMPP Control Panel do `C:\xampp`** e dê **Start** em Apache e MySQL. Confirme:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/nivergio-api/backend/
```

Esperado: `200` (JSON de rota não encontrada) ou `404` — qualquer código HTTP serve; o que não pode é `000`, que significa Apache parado.

- [ ] **Step 2: Confirmar a porta do MySQL e o `pdo_mysql`**

```bash
"C:/xampp/php/php.exe" -m | grep pdo_mysql
```

Esperado: `pdo_mysql`.

```bash
netstat -an | grep LISTENING | grep ":330"
```

Anote a porta que aparecer (3306 ou 3307) e confira que `DB_PORT` em `backend/.env.local` bate. Se não bater, ajuste o `.env.local` — **não** imprima o conteúdo do arquivo.

- [ ] **Step 3: Criar `frontend/.env.local`**

```bash
printf 'API_PROXY_TARGET=http://localhost/nivergio-api/backend\n' > frontend/.env.local
```

- [ ] **Step 4: Extrair o autoloader para `backend/src/autoload.php`**

```php
<?php

// Autoloader PSR-4 manual (o projeto não usa Composer): App\Foo\Bar vira
// src/Foo/Bar.php. Em arquivo próprio porque o index.php e o runner de testes
// precisam exatamente do mesmo — duplicar as duas cópias sairiam de sincronia.
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});
```

- [ ] **Step 5: Trocar o autoloader inline do `index.php`**

Em `backend/index.php`, apague o bloco `spl_autoload_register(function ($class) { ... });` inteiro e ponha no lugar:

```php
require __DIR__ . '/src/autoload.php';
```

- [ ] **Step 6: Criar `backend/tests/.htaccess`**

```apache
# A pasta de testes nunca é servida por HTTP — nem local nem em produção.
Require all denied
```

- [ ] **Step 7: Criar `backend/tests/bootstrap.php`**

```php
<?php

use App\Config\Env;

require __DIR__ . '/../src/autoload.php';

// Mesma ordem do index.php: o .env.local da máquina do dev vence o .env.
Env::load(__DIR__ . '/../.env.local');
Env::load(__DIR__ . '/../.env');

// Os testes truncam as tabelas. Se o .env apontar para um banco que não seja
// local, abortar: rodar isto contra a HostGator apagaria a lista de convidados
// da festa inteira.
$host = strtolower(trim((string) Env::get('DB_HOST', '')));
if ($host !== 'localhost' && $host !== '127.0.0.1') {
    fwrite(STDERR, "ABORTADO: DB_HOST nao e local. Os testes apagam dados.\n");
    exit(1);
}
```

- [ ] **Step 8: Criar `backend/tests/lib.php`**

```php
<?php

use App\Config\Env;
use App\Database\Connection;

$GLOBALS['tests'] = ['pass' => 0, 'fail' => 0, 'filter' => ''];

// A base pode ser trocada por variável de ambiente sem editar arquivo:
//   TEST_API_BASE=http://localhost:8080/api "C:/xampp/php/php.exe" tests/run.php
function api_base()
{
    $base = getenv('TEST_API_BASE');
    if ($base === false || $base === '') {
        $base = 'http://localhost/nivergio-api/backend';
    }
    return rtrim($base, '/');
}

// Os testes batem por HTTP de propósito: é o único jeito de exercitar o
// .htaccess, o roteamento e o repasse do header Authorization, que são
// exatamente as partes que quebram só em produção.
function http_call($method, $path, $body = null, $token = null)
{
    $headers = ['Accept: application/json'];
    $ch = curl_init(api_base() . $path);

    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    if ($token !== null) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 10,
    ]);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new RuntimeException('curl falhou (Apache no ar?): ' . $error);
    }

    return ['status' => $status, 'body' => json_decode($raw, true), 'raw' => $raw];
}

function reset_tables()
{
    $pdo = Connection::get();
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach (['guest_members', 'guest_groups', 'admin_sessions', 'code_attempts'] as $table) {
        $pdo->exec('TRUNCATE TABLE ' . $table);
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

function admin_token()
{
    $res = http_call('POST', '/admin/login', ['password' => Env::get('ADMIN_PASSWORD')]);
    check_same(200, $res['status'], 'login deveria funcionar para obter token');
    return $res['body']['token'];
}

function test($name, $fn)
{
    if ($GLOBALS['tests']['filter'] !== '' && stripos($name, $GLOBALS['tests']['filter']) === false) {
        return;
    }
    try {
        $fn();
        $GLOBALS['tests']['pass']++;
        echo "  OK      $name\n";
    } catch (Throwable $e) {
        $GLOBALS['tests']['fail']++;
        echo "  FALHOU  $name\n          " . $e->getMessage() . "\n";
    }
}

function check($condition, $message)
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function check_same($expected, $actual, $message)
{
    if ($expected !== $actual) {
        throw new RuntimeException(
            $message . ' — esperado ' . json_encode($expected) . ', veio ' . json_encode($actual)
        );
    }
}
```

- [ ] **Step 9: Criar `backend/tests/run.php`**

```php
<?php

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib.php';

$GLOBALS['tests']['filter'] = isset($argv[1]) ? $argv[1] : '';

foreach (glob(__DIR__ . '/cases/*.php') as $case) {
    echo basename($case, '.php') . "\n";
    require $case;
}

$totals = $GLOBALS['tests'];
echo "\n{$totals['pass']} passaram, {$totals['fail']} falharam\n";
exit($totals['fail'] > 0 ? 1 : 0);
```

- [ ] **Step 10: Criar o teste de fumaça `backend/tests/cases/00-smoke.php`**

```php
<?php

test('rota inexistente devolve 404 em JSON, nunca HTML de erro do PHP', function () {
    $res = http_call('GET', '/rota-que-nao-existe');
    check_same(404, $res['status'], 'status');
    check(is_array($res['body']), 'corpo deveria ser JSON, veio: ' . substr($res['raw'], 0, 200));
    check(isset($res['body']['error']), 'corpo deveria ter a chave "error"');
});
```

- [ ] **Step 11: Rodar o runner**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

Esperado: `1 passaram, 0 falharam`.

Se vier `curl falhou`, o Apache está parado ou a base está errada — volte ao Step 1. Se vier `ABORTADO`, o `.env.local` não está apontando para o banco local. Esse é o ciclo vermelho desta task: o runner só passa quando o ambiente está de pé.

- [ ] **Step 12: Confirmar que os testes não vão para o git como segredo e commitar**

```bash
git status --short
```

Esperado: `frontend/.env.local` **não** aparece na lista (o `.gitignore` cobre `.env.*` em qualquer profundidade). Se aparecer, pare e corrija o `.gitignore` antes de continuar.

```bash
git add backend/src/autoload.php backend/index.php backend/tests
git commit -m "test: runner de testes da API sem Composer e autoloader compartilhado"
```

---

### Task 2: Schema novo

**Files:**
- Modify: `backend/database/schema.sql` (arquivo inteiro)
- Create: `backend/tests/cases/01-schema.php`

**Interfaces:**
- Consumes: `reset_tables()`, `check()`, `check_same()` da Task 1.
- Produces: as tabelas `guest_groups`, `guest_members`, `admin_sessions`, `code_attempts` — todas as tasks de backend seguintes dependem delas.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/01-schema.php`:

```php
<?php

use App\Database\Connection;

test('schema tem as quatro tabelas novas e nao tem mais rsvps', function () {
    $rows = Connection::get()->query('SHOW TABLES')->fetchAll();
    $tables = array_map(function ($row) {
        return array_values($row)[0];
    }, $rows);

    foreach (['guest_groups', 'guest_members', 'admin_sessions', 'code_attempts'] as $table) {
        check(in_array($table, $tables, true), "tabela $table nao existe");
    }
    check(!in_array('rsvps', $tables, true), 'tabela rsvps deveria ter sido removida');
});

test('status do convidado e um enum com pending, yes e no', function () {
    $column = Connection::get()->query("SHOW COLUMNS FROM guest_members LIKE 'status'")->fetch();
    check_same("enum('pending','yes','no')", $column['Type'], 'tipo da coluna status');
});

test('guid e codigo curto sao unicos', function () {
    reset_tables();
    $pdo = Connection::get();
    $insert = $pdo->prepare('INSERT INTO guest_groups (guid, short_code) VALUES (:guid, :short)');
    $insert->execute(['guid' => '11111111-1111-4111-8111-111111111111', 'short' => 'AAAAAA']);

    $duplicated = false;
    try {
        $insert->execute(['guid' => '11111111-1111-4111-8111-111111111111', 'short' => 'BBBBBB']);
    } catch (Throwable $e) {
        $duplicated = true;
    }
    check($duplicated, 'guid repetido deveria ser recusado pelo indice UNIQUE');
});

test('apagar um grupo apaga as pessoas dele em cascata', function () {
    reset_tables();
    $pdo = Connection::get();
    $pdo->prepare('INSERT INTO guest_groups (guid, short_code) VALUES (:guid, :short)')
        ->execute(['guid' => '22222222-2222-4222-8222-222222222222', 'short' => 'CCCCCC']);
    $groupId = (int) $pdo->lastInsertId();

    $pdo->prepare('INSERT INTO guest_members (group_id, `name`, is_responsible) VALUES (:id, :name, 1)')
        ->execute(['id' => $groupId, 'name' => 'Teste']);

    $pdo->prepare('DELETE FROM guest_groups WHERE id = :id')->execute(['id' => $groupId]);

    $left = $pdo->query('SELECT COUNT(*) AS total FROM guest_members')->fetch();
    check_same(0, (int) $left['total'], 'sobraram pessoas orfas apos apagar o grupo');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php schema
```

Esperado: as quatro falham, a primeira com `tabela guest_groups nao existe`.

- [ ] **Step 3: Reescrever `backend/database/schema.sql`**

```sql
-- Estrutura do banco do convite. Rode no phpMyAdmin (aba SQL) do banco criado
-- no cPanel da HostGator, ou pelo mysql.exe no ambiente local.
--
-- ATENÇÃO: o primeiro comando apaga a tabela do modelo antigo (auto-cadastro
-- por email). Não há migração: no modelo novo quem cadastra é o organizador,
-- e nada da tabela antiga tem correspondente aqui.

DROP TABLE IF EXISTS rsvps;

CREATE TABLE guest_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guid CHAR(36) NOT NULL,               -- código do link do convite (UUID v4)
  short_code CHAR(6) NOT NULL,          -- código ditado por telefone
  phone VARCHAR(20) NULL,               -- só dígitos; nunca sai pela API pública
  message_sent_at DATETIME NULL,        -- NULL = convite ainda não enviado
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_guid (guid),
  UNIQUE KEY uq_short_code (short_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guest_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_responsible TINYINT(1) NOT NULL DEFAULT 0,   -- exatamente um por grupo
  status ENUM('pending','yes','no') NOT NULL DEFAULT 'pending',
  responded_at DATETIME NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_group (group_id),
  CONSTRAINT fk_member_group FOREIGN KEY (group_id)
    REFERENCES guest_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Guarda o SHA-256 do token, nunca o token: quem conseguir ler esta tabela
-- ainda assim não consegue entrar no painel.
CREATE TABLE admin_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Só tentativas FALHAS de código curto, para frear força bruta. Guarda o hash
-- do IP: dá para contar tentativas do mesmo visitante sem manter um registro
-- de quem abriu o convite.
CREATE TABLE code_attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip_hash CHAR(64) NOT NULL,
  attempted_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ip_time (ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 4: Aplicar no banco local**

Descubra o nome do banco sem imprimir credenciais:

```bash
grep -E '^DB_NAME=' backend/.env.local | cut -d= -f2
```

Aplique (troque `NOME_DO_BANCO` pelo que saiu acima, e `-P` pela porta anotada na Task 1; o `-p` sem valor faz o cliente pedir a senha, que assim não fica no histórico):

```bash
"C:/xampp/mysql/bin/mysql.exe" -h 127.0.0.1 -P 3306 -u root -p NOME_DO_BANCO < backend/database/schema.sql
```

- [ ] **Step 5: Rodar e ver passar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php schema
```

Esperado: `4 passaram, 0 falharam`.

- [ ] **Step 6: Commit**

```bash
git add backend/database/schema.sql backend/tests/cases/01-schema.php
git commit -m "feat: schema de grupos, convidados, sessoes e tentativas de codigo"
```

---

### Task 3: Geração dos códigos

**Files:**
- Create: `backend/src/Support/Codes.php`
- Create: `backend/tests/cases/02-codes.php`

**Interfaces:**
- Consumes: as tabelas da Task 2; helpers da Task 1.
- Produces: `Codes::guid(): string`, `Codes::shortCode(): string`, `Codes::uniquePair(PDO $pdo): array{guid:string, short_code:string}`, `Codes::isGuid(mixed $value): bool` — usados por `GroupsController::create` (Task 5) e `RsvpController` (Task 8).

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/02-codes.php`:

```php
<?php

use App\Database\Connection;
use App\Support\Codes;

test('guid tem formato UUID v4 e nao repete', function () {
    $seen = [];
    for ($i = 0; $i < 200; $i++) {
        $guid = Codes::guid();
        check(Codes::isGuid($guid), "guid fora do formato: $guid");
        check(!isset($seen[$guid]), "guid repetido em 200 sorteios: $guid");
        $seen[$guid] = true;
    }
});

test('codigo curto tem 6 caracteres e nao usa 0 O 1 I', function () {
    for ($i = 0; $i < 200; $i++) {
        $code = Codes::shortCode();
        check_same(6, strlen($code), "tamanho do codigo curto ($code)");
        check(
            preg_match('/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/', $code) === 1,
            "codigo curto usa caractere ambiguo: $code"
        );
    }
});

test('isGuid recusa codigo curto e lixo', function () {
    check(!Codes::isGuid('K7M2QP'), 'codigo curto nao e guid');
    check(!Codes::isGuid(''), 'string vazia nao e guid');
    check(!Codes::isGuid('11111111-1111-1111-1111-111111111111'), 'versao 1 nao e uuid v4');
});

test('uniquePair evita par que ja esta no banco', function () {
    reset_tables();
    $pdo = Connection::get();

    $taken = Codes::uniquePair($pdo);
    $pdo->prepare('INSERT INTO guest_groups (guid, short_code) VALUES (:guid, :short)')
        ->execute(['guid' => $taken['guid'], 'short' => $taken['short_code']]);

    $next = Codes::uniquePair($pdo);
    check($next['guid'] !== $taken['guid'], 'uniquePair devolveu guid ja usado');
    check($next['short_code'] !== $taken['short_code'], 'uniquePair devolveu codigo curto ja usado');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php codigo
```

Esperado: erro fatal de classe não encontrada (`App\Support\Codes`), capturado como falha nos quatro testes.

- [ ] **Step 3: Criar `backend/src/Support/Codes.php`**

```php
<?php

namespace App\Support;

use PDO;
use RuntimeException;

// Os dois códigos de um grupo. Ambos usam gerador criptográfico (random_bytes,
// random_int) e não rand()/uniqid(): o GUID é a única coisa que separa uma
// família da outra, então precisa ser inviável de adivinhar ou de prever a
// partir de um código já conhecido.
class Codes
{
    // Sem 0/O e sem 1/I: o código curto é ditado por telefone e anotado à mão.
    const SHORT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const SHORT_LENGTH = 6;
    const MAX_TRIES = 5;

    public static function guid()
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40); // versão 4
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80); // variante RFC 4122
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    public static function shortCode()
    {
        $last = strlen(self::SHORT_ALPHABET) - 1;
        $code = '';
        for ($i = 0; $i < self::SHORT_LENGTH; $i++) {
            $code .= self::SHORT_ALPHABET[random_int(0, $last)];
        }
        return $code;
    }

    // Sorteia até achar um par que ainda não está no banco. A chance de colisão
    // é ínfima, mas o índice UNIQUE existe justamente para não confiar nisso —
    // aqui a colisão vira novo sorteio em vez de erro na cara do organizador.
    public static function uniquePair(PDO $pdo)
    {
        for ($try = 0; $try < self::MAX_TRIES; $try++) {
            $guid = self::guid();
            $short = self::shortCode();

            $stmt = $pdo->prepare(
                'SELECT 1 FROM guest_groups WHERE guid = :guid OR short_code = :short LIMIT 1'
            );
            $stmt->execute(['guid' => $guid, 'short' => $short]);

            if (!$stmt->fetch()) {
                return ['guid' => $guid, 'short_code' => $short];
            }
        }

        throw new RuntimeException('Não foi possível gerar um código único em ' . self::MAX_TRIES . ' tentativas.');
    }

    public static function isGuid($value)
    {
        return preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            (string) $value
        ) === 1;
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php codigo
```

Esperado: `4 passaram, 0 falharam`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Support/Codes.php backend/tests/cases/02-codes.php
git commit -m "feat: geracao de guid v4 e codigo curto do grupo"
```

---

### Task 4: Sessão do painel (token) e rotas de login/logout

O `bearerToken()` e a linha do `.htaccess` entram aqui e não numa task própria: sozinhos não têm comportamento observável — só existem para esta sessão funcionar.

**Files:**
- Create: `backend/src/Auth/AdminSession.php`, `backend/src/Controllers/AdminAuthController.php`
- Create: `backend/tests/cases/03-auth.php`
- Modify: `backend/src/Http/Request.php` (acrescentar dois métodos)
- Modify: `backend/.htaccess` (repasse do `Authorization`)
- Modify: `backend/index.php` (duas rotas novas)

**Interfaces:**
- Consumes: `admin_sessions` (Task 2); `admin_token()`, `http_call()`, `reset_tables()` (Task 1).
- Produces: `Request::bearerToken(): string`, `Request::ip(): string`, `AdminSession::login($password): ?array{token:string, expires_at:string}`, `AdminSession::logout(): void`, `AdminSession::isValid(): bool`, `AdminSession::guard(): void` (responde 401 e encerra). `guard()` é chamado por todas as rotas do painel nas Tasks 5-7; `Request::ip()` é usado pelo `RateLimiter` na Task 8.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/03-auth.php`:

```php
<?php

use App\Auth\AdminSession;
use App\Config\Env;
use App\Database\Connection;

test('login com senha errada devolve 401 e nenhum token', function () {
    reset_tables();
    $res = http_call('POST', '/admin/login', ['password' => 'senha-errada-de-proposito']);
    check_same(401, $res['status'], 'status');
    check(!isset($res['body']['token']), 'resposta de senha errada nao pode trazer token');
});

test('login sem corpo nenhum devolve 401', function () {
    $res = http_call('POST', '/admin/login', []);
    check_same(401, $res['status'], 'status');
});

test('login com a senha certa devolve token de 64 hex e validade futura', function () {
    reset_tables();
    $res = http_call('POST', '/admin/login', ['password' => Env::get('ADMIN_PASSWORD')]);
    check_same(200, $res['status'], 'status');
    check(
        preg_match('/^[0-9a-f]{64}$/', (string) $res['body']['token']) === 1,
        'token deveria ser 64 caracteres hex'
    );
    check(
        strtotime($res['body']['expires_at']) > time() + 11 * 3600,
        'validade deveria ser de aproximadamente 12 horas'
    );
});

test('o banco guarda o hash do token, nunca o token em claro', function () {
    reset_tables();
    $res = http_call('POST', '/admin/login', ['password' => Env::get('ADMIN_PASSWORD')]);
    $token = $res['body']['token'];

    $row = Connection::get()->query('SELECT token_hash FROM admin_sessions LIMIT 1')->fetch();
    check($row !== false, 'sessao deveria ter sido gravada');
    check($row['token_hash'] !== $token, 'token esta em claro no banco');
    check_same(hash('sha256', $token), $row['token_hash'], 'token_hash deveria ser o sha256 do token');
});

test('token recem criado vale e token expirado nao vale', function () {
    reset_tables();
    $session = AdminSession::login(Env::get('ADMIN_PASSWORD'));
    check($session !== null, 'login direto deveria funcionar');

    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $session['token'];
    check(AdminSession::isValid(), 'token recem criado deveria valer');

    Connection::get()->exec('UPDATE admin_sessions SET expires_at = NOW() - INTERVAL 1 MINUTE');
    check(!AdminSession::isValid(), 'token expirado nao deveria valer');

    unset($_SERVER['HTTP_AUTHORIZATION']);
});

test('header sem o prefixo Bearer e ignorado', function () {
    reset_tables();
    $session = AdminSession::login(Env::get('ADMIN_PASSWORD'));

    $_SERVER['HTTP_AUTHORIZATION'] = $session['token'];
    check(!AdminSession::isValid(), 'token sem "Bearer " nao deveria valer');

    unset($_SERVER['HTTP_AUTHORIZATION']);
});

test('logout invalida o token', function () {
    reset_tables();
    $token = admin_token();

    $res = http_call('POST', '/admin/logout', [], $token);
    check_same(200, $res['status'], 'status do logout');

    $left = Connection::get()->query('SELECT COUNT(*) AS total FROM admin_sessions')->fetch();
    check_same(0, (int) $left['total'], 'sessao deveria ter sido apagada');
});

test('login limpa sessoes ja vencidas', function () {
    reset_tables();
    admin_token();
    Connection::get()->exec('UPDATE admin_sessions SET expires_at = NOW() - INTERVAL 1 DAY');

    admin_token();

    $rows = Connection::get()->query('SELECT COUNT(*) AS total FROM admin_sessions')->fetch();
    check_same(1, (int) $rows['total'], 'a sessao vencida deveria ter sido apagada no login seguinte');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php auth
```

Esperado: as oito falham — as de HTTP com status `404` (rota não existe), as diretas com classe `App\Auth\AdminSession` não encontrada.

- [ ] **Step 3: Acrescentar `bearerToken()` e `ip()` em `backend/src/Http/Request.php`**

Dentro da classe `Request`, depois de `json()`:

```php
    // O mod_rewrite da HostGator costuma descartar o header Authorization. Com
    // a linha E=HTTP_AUTHORIZATION no .htaccess ele reaparece com o prefixo
    // REDIRECT_. Ler os dois nomes é o que faz o painel funcionar tanto no
    // XAMPP quanto em produção — testar só localmente esconde esse problema.
    public static function bearerToken()
    {
        $header = '';
        foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $key) {
            if (!empty($_SERVER[$key])) {
                $header = (string) $_SERVER[$key];
                break;
            }
        }

        if (stripos($header, 'Bearer ') !== 0) {
            return '';
        }

        return trim(substr($header, 7));
    }

    public static function ip()
    {
        return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    }
```

- [ ] **Step 4: Repassar o `Authorization` no `backend/.htaccess`**

Dentro do bloco `<IfModule mod_rewrite.c>`, logo abaixo de `RewriteEngine On`:

```apache
  # Sem esta linha o mod_rewrite engole o header Authorization e o painel
  # responde 401 em produção mesmo com token válido. O Request::bearerToken()
  # lê tanto HTTP_AUTHORIZATION quanto a versão com prefixo REDIRECT_.
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
```

- [ ] **Step 5: Criar `backend/src/Auth/AdminSession.php`**

```php
<?php

namespace App\Auth;

use App\Config\Env;
use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;

// Sessão do painel: a senha é trocada uma vez por um token aleatório com prazo.
// O banco guarda só o SHA-256 do token, e o token viaja no header — não na URL,
// que apareceria no log de acesso do Apache e no histórico do navegador.
class AdminSession
{
    const LIFETIME_HOURS = 12;

    public static function login($password)
    {
        $expected = (string) Env::get('ADMIN_PASSWORD', '');

        // hash_equals compara em tempo constante. Sem isso o tempo de resposta
        // entrega quantos caracteres do começo da senha já estão certos.
        if ($expected === '' || !hash_equals($expected, (string) $password)) {
            return null;
        }

        $pdo = Connection::get();

        // Limpeza oportunista: não há cron na hospedagem compartilhada, então é
        // aqui que as sessões vencidas somem em vez de acumularem para sempre.
        $pdo->exec('DELETE FROM admin_sessions WHERE expires_at < NOW()');

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + self::LIFETIME_HOURS * 3600);

        $stmt = $pdo->prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (:hash, :expires)');
        $stmt->execute(['hash' => hash('sha256', $token), 'expires' => $expiresAt]);

        return ['token' => $token, 'expires_at' => $expiresAt];
    }

    public static function logout()
    {
        $token = Request::bearerToken();
        if ($token === '') {
            return;
        }

        $stmt = Connection::get()->prepare('DELETE FROM admin_sessions WHERE token_hash = :hash');
        $stmt->execute(['hash' => hash('sha256', $token)]);
    }

    public static function isValid()
    {
        $token = Request::bearerToken();
        if ($token === '') {
            return false;
        }

        $stmt = Connection::get()->prepare(
            'SELECT 1 FROM admin_sessions WHERE token_hash = :hash AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['hash' => hash('sha256', $token)]);

        return (bool) $stmt->fetch();
    }

    // Primeira linha de toda rota do painel. Encerra a requisição em 401 em vez
    // de devolver um booleano: assim nenhum controller pode esquecer de checar
    // o retorno e servir dados sem sessão.
    public static function guard()
    {
        if (self::isValid()) {
            return;
        }

        Response::json(['error' => 'Sessão inválida ou expirada.'], 401);
        exit;
    }
}
```

- [ ] **Step 6: Criar `backend/src/Controllers/AdminAuthController.php`**

```php
<?php

namespace App\Controllers;

use App\Auth\AdminSession;
use App\Http\Request;
use App\Http\Response;

class AdminAuthController
{
    public function login()
    {
        $body = Request::json();
        $password = isset($body['password']) ? (string) $body['password'] : '';

        $session = AdminSession::login($password);
        if ($session === null) {
            Response::json(['error' => 'Senha incorreta.'], 401);
            return;
        }

        Response::json([
            'ok' => true,
            'token' => $session['token'],
            'expires_at' => $session['expires_at'],
        ]);
    }

    public function logout()
    {
        AdminSession::logout();
        Response::json(['ok' => true]);
    }
}
```

- [ ] **Step 7: Registrar as rotas em `backend/index.php`**

Troque o `use App\Controllers\AdminController;` por `use App\Controllers\AdminAuthController;` e, no bloco de rotas, acrescente:

```php
$router->post('/admin/login', function () {
    (new AdminAuthController())->login();
});
$router->post('/admin/logout', function () {
    (new AdminAuthController())->logout();
});
```

Deixe a rota `POST /admin` antiga por enquanto — ela sai na Task 5, junto com o controller que a atende.

- [ ] **Step 8: Rodar e ver passar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php auth
```

Esperado: `8 passaram, 0 falharam`.

- [ ] **Step 9: Rodar a suíte inteira**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

Esperado: `17 passaram, 0 falharam`.

- [ ] **Step 10: Commit**

```bash
git add backend/src/Auth backend/src/Controllers/AdminAuthController.php backend/src/Http/Request.php backend/.htaccess backend/index.php backend/tests/cases/03-auth.php
git commit -m "feat: sessao do painel por token com validade de 12h"
```

---

### Task 5: Listar e cadastrar grupos

Aqui também sai o `AdminController` antigo: `GroupsController::index` é o que substitui a rota `POST /admin`.

**Files:**
- Create: `backend/src/Controllers/GroupsController.php`
- Create: `backend/tests/cases/04-groups-create.php`
- Modify: `backend/index.php`
- Delete: `backend/src/Controllers/AdminController.php`

**Interfaces:**
- Consumes: `AdminSession::guard()` (Task 4), `Codes::uniquePair()` (Task 3).
- Produces: `GET /admin/groups` → `{ ok, groups: [{ id, guid, short_code, phone, message_sent_at, created_at, members: [{ id, name, is_responsible, status, responded_at }] }] }`; `POST /admin/groups/create` → `{ ok, id }`. Os métodos privados `cleanName`, `cleanCompanionNames`, `cleanPhone` e `validate` são reusados pela Task 6.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/04-groups-create.php`:

```php
<?php

use App\Support\Codes;

test('listar grupos sem token devolve 401', function () {
    reset_tables();
    $res = http_call('GET', '/admin/groups');
    check_same(401, $res['status'], 'status');
});

test('listar grupos com token invalido devolve 401', function () {
    $res = http_call('GET', '/admin/groups', null, 'token-inventado');
    check_same(401, $res['status'], 'status');
});

test('cadastrar grupo sem token devolve 401 e nao grava nada', function () {
    reset_tables();
    $res = http_call('POST', '/admin/groups/create', ['responsible' => 'Invasor']);
    check_same(401, $res['status'], 'status');

    $token = admin_token();
    $list = http_call('GET', '/admin/groups', null, $token);
    check_same(0, count($list['body']['groups']), 'nenhum grupo deveria ter sido criado');
});

test('cadastrar grupo cria responsavel e acompanhantes, todos pendentes', function () {
    reset_tables();
    $token = admin_token();

    $created = http_call('POST', '/admin/groups/create', [
        'responsible' => 'Ana Silva',
        'companions' => ['João Silva', 'Maria Silva'],
        'phone' => '(21) 96539-7036',
    ], $token);
    check_same(200, $created['status'], 'status da criacao');
    check(isset($created['body']['id']), 'resposta deveria trazer o id do grupo');

    $list = http_call('GET', '/admin/groups', null, $token);
    check_same(1, count($list['body']['groups']), 'deveria haver um grupo');

    $group = $list['body']['groups'][0];
    check(Codes::isGuid($group['guid']), 'guid do grupo fora do formato');
    check_same(6, strlen($group['short_code']), 'tamanho do codigo curto');
    check_same('21965397036', $group['phone'], 'telefone deveria ser guardado so com digitos');
    check_same(null, $group['message_sent_at'], 'grupo novo nao pode estar marcado como enviado');

    check_same(3, count($group['members']), 'total de pessoas no grupo');
    check_same('Ana Silva', $group['members'][0]['name'], 'responsavel deveria vir primeiro');
    check_same(true, $group['members'][0]['is_responsible'], 'primeiro deveria ser o responsavel');
    foreach ($group['members'] as $member) {
        check_same('pending', $member['status'], 'todo mundo comeca pendente');
    }
});

test('cadastrar sem responsavel devolve 400', function () {
    reset_tables();
    $token = admin_token();
    $res = http_call('POST', '/admin/groups/create', ['responsible' => '   '], $token);
    check_same(400, $res['status'], 'status');
});

test('acompanhante em branco e descartado em silencio', function () {
    reset_tables();
    $token = admin_token();
    http_call('POST', '/admin/groups/create', [
        'responsible' => 'Ana',
        'companions' => ['João', '   ', ''],
    ], $token);

    $list = http_call('GET', '/admin/groups', null, $token);
    check_same(2, count($list['body']['groups'][0]['members']), 'so responsavel e Joao deveriam existir');
});

test('telefone curto demais devolve 400 e telefone vazio vira nulo', function () {
    reset_tables();
    $token = admin_token();

    $curto = http_call('POST', '/admin/groups/create', ['responsible' => 'Ana', 'phone' => '12345'], $token);
    check_same(400, $curto['status'], 'telefone de 5 digitos deveria ser recusado');

    $vazio = http_call('POST', '/admin/groups/create', ['responsible' => 'Ana', 'phone' => ''], $token);
    check_same(200, $vazio['status'], 'telefone vazio e valido');

    $list = http_call('GET', '/admin/groups', null, $token);
    check_same(null, $list['body']['groups'][0]['phone'], 'telefone vazio deveria virar null');
});

test('nome longo demais devolve 400', function () {
    reset_tables();
    $token = admin_token();
    $res = http_call('POST', '/admin/groups/create', [
        'responsible' => str_repeat('á', 121),
    ], $token);
    check_same(400, $res['status'], 'status');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php grupo
```

Esperado: falhas com status `404` nas rotas novas.

- [ ] **Step 3: Criar `backend/src/Controllers/GroupsController.php`**

```php
<?php

namespace App\Controllers;

use App\Auth\AdminSession;
use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;
use App\Support\Codes;
use Throwable;

class GroupsController
{
    const MAX_COMPANIONS = 30;
    const MAX_NAME_LENGTH = 120;

    public function index()
    {
        AdminSession::guard();

        $pdo = Connection::get();
        $groups = $pdo->query(
            'SELECT id, guid, short_code, phone, message_sent_at, created_at
             FROM guest_groups ORDER BY created_at DESC, id DESC'
        )->fetchAll();

        if (!$groups) {
            Response::json(['ok' => true, 'groups' => []]);
            return;
        }

        // Uma consulta só para todas as pessoas, agrupadas em PHP: um SELECT por
        // grupo seria N+1 idas ao banco a cada carga do painel.
        $members = $pdo->query(
            'SELECT id, group_id, `name`, is_responsible, status, responded_at
             FROM guest_members ORDER BY group_id, is_responsible DESC, sort_order, id'
        )->fetchAll();

        $byGroup = [];
        foreach ($members as $member) {
            $byGroup[(int) $member['group_id']][] = [
                'id' => (int) $member['id'],
                'name' => $member['name'],
                'is_responsible' => (int) $member['is_responsible'] === 1,
                'status' => $member['status'],
                'responded_at' => $member['responded_at'],
            ];
        }

        $out = [];
        foreach ($groups as $group) {
            $id = (int) $group['id'];
            $out[] = [
                'id' => $id,
                'guid' => $group['guid'],
                'short_code' => $group['short_code'],
                'phone' => $group['phone'],
                'message_sent_at' => $group['message_sent_at'],
                'created_at' => $group['created_at'],
                'members' => isset($byGroup[$id]) ? $byGroup[$id] : [],
            ];
        }

        Response::json(['ok' => true, 'groups' => $out]);
    }

    public function create()
    {
        AdminSession::guard();

        $body = Request::json();
        $rawPhone = isset($body['phone']) ? $body['phone'] : '';
        $responsible = self::cleanName(isset($body['responsible']) ? $body['responsible'] : '');
        $companions = self::cleanCompanionNames(isset($body['companions']) ? $body['companions'] : []);
        $phone = self::cleanPhone($rawPhone);

        $error = self::validate($responsible, $companions, $phone, $rawPhone);
        if ($error !== null) {
            Response::json(['error' => $error], 400);
            return;
        }

        $pdo = Connection::get();
        $codes = Codes::uniquePair($pdo);

        // Transação porque um erro no meio deixaria um grupo com código válido e
        // sem ninguém dentro — e o organizador mandaria um link para uma família
        // vazia sem perceber.
        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO guest_groups (guid, short_code, phone) VALUES (:guid, :short, :phone)')
                ->execute([
                    'guid' => $codes['guid'],
                    'short' => $codes['short_code'],
                    'phone' => $phone === '' ? null : $phone,
                ]);
            $groupId = (int) $pdo->lastInsertId();

            $insertMember = $pdo->prepare(
                'INSERT INTO guest_members (group_id, `name`, is_responsible, sort_order)
                 VALUES (:group_id, :name, :responsible, :sort_order)'
            );
            $insertMember->execute([
                'group_id' => $groupId,
                'name' => $responsible,
                'responsible' => 1,
                'sort_order' => 0,
            ]);
            foreach ($companions as $index => $name) {
                $insertMember->execute([
                    'group_id' => $groupId,
                    'name' => $name,
                    'responsible' => 0,
                    'sort_order' => $index + 1,
                ]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Response::json(['ok' => true, 'id' => $groupId]);
    }

    protected static function cleanName($value)
    {
        return trim((string) $value);
    }

    // Aceita tanto ["João"] quanto [{"id":3,"name":"João"}] — o cadastro manda a
    // primeira forma, a edição manda a segunda.
    protected static function cleanCompanionNames($value)
    {
        if (!is_array($value)) {
            return [];
        }

        $names = [];
        foreach ($value as $item) {
            $raw = is_array($item) && isset($item['name']) ? $item['name'] : $item;
            $name = trim((string) $raw);
            if ($name !== '') {
                $names[] = $name;
            }
        }

        return $names;
    }

    protected static function cleanPhone($value)
    {
        return preg_replace('/\D+/', '', (string) $value);
    }

    protected static function validate($responsible, array $companions, $phone, $rawPhone)
    {
        if ($responsible === '') {
            return 'Informe o nome do responsável.';
        }

        // mb_strlen porque o limite da coluna é em caracteres, não em bytes: um
        // nome com acentos seria cortado antes de a conta bater.
        if (mb_strlen($responsible, 'UTF-8') > self::MAX_NAME_LENGTH) {
            return 'Nome do responsável muito longo.';
        }

        foreach ($companions as $name) {
            if (mb_strlen($name, 'UTF-8') > self::MAX_NAME_LENGTH) {
                return 'Nome de acompanhante muito longo.';
            }
        }

        if (count($companions) > self::MAX_COMPANIONS) {
            return 'Máximo de ' . self::MAX_COMPANIONS . ' acompanhantes por grupo.';
        }

        if (trim((string) $rawPhone) !== '' && (strlen($phone) < 10 || strlen($phone) > 13)) {
            return 'Telefone deve ter entre 10 e 13 dígitos, com DDD.';
        }

        return null;
    }
}
```

- [ ] **Step 4: Trocar as rotas em `backend/index.php`**

Remova o `use App\Controllers\AdminController;` e o bloco:

```php
$router->post('/admin', function () {
    (new AdminController())->list();
});
```

Acrescente `use App\Controllers\GroupsController;` e:

```php
$router->get('/admin/groups', function () {
    (new GroupsController())->index();
});
$router->post('/admin/groups/create', function () {
    (new GroupsController())->create();
});
```

- [ ] **Step 5: Apagar o controller antigo**

```bash
git rm backend/src/Controllers/AdminController.php
```

- [ ] **Step 6: Rodar e ver passar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php grupo
```

Esperado: `8 passaram, 0 falharam`. O teste "listar grupos com token invalido" é o que prova, de quebra, que o header `Authorization` está chegando ao PHP — se o `.htaccess` da Task 4 não estivesse certo, o teste do token **válido** daria 401.

- [ ] **Step 7: Commit**

```bash
git add backend/src/Controllers backend/index.php backend/tests/cases/04-groups-create.php
git commit -m "feat: listar e cadastrar grupos pelo painel"
```

---

### Task 6: Editar grupo preservando as confirmações

A regra central desta task: corrigir o nome de uma pessoa **não pode** zerar o `status` de quem já respondeu. Um "apaga tudo e reinsere" seria muito mais curto de escrever e apagaria confirmações reais da festa.

**Files:**
- Modify: `backend/src/Controllers/GroupsController.php` (novo método `update`)
- Modify: `backend/index.php` (uma rota)
- Create: `backend/tests/cases/05-groups-update.php`

**Interfaces:**
- Consumes: `cleanName`, `cleanCompanionNames`, `cleanPhone`, `validate` (Task 5).
- Produces: `POST /admin/groups/update` → `{ ok: true }`, 400 em validação ou id de outro grupo, 404 em grupo inexistente.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/05-groups-update.php`:

```php
<?php

use App\Database\Connection;

// Cria um grupo e devolve [token, grupo] já lido da API, para não repetir sete
// vezes o mesmo preparo.
function make_group($responsible, array $companions, $phone = '')
{
    reset_tables();
    $token = admin_token();
    http_call('POST', '/admin/groups/create', [
        'responsible' => $responsible,
        'companions' => $companions,
        'phone' => $phone,
    ], $token);

    $list = http_call('GET', '/admin/groups', null, $token);
    return [$token, $list['body']['groups'][0]];
}

function reload_group($token)
{
    $list = http_call('GET', '/admin/groups', null, $token);
    return $list['body']['groups'][0];
}

test('renomear um acompanhante nao zera o status de quem ja respondeu', function () {
    list($token, $group) = make_group('Ana', ['João', 'Maria']);

    // A Maria já confirmou presença.
    $maria = $group['members'][2];
    Connection::get()->prepare(
        "UPDATE guest_members SET status = 'yes', responded_at = NOW() WHERE id = :id"
    )->execute(['id' => $maria['id']]);

    $joao = $group['members'][1];
    $res = http_call('POST', '/admin/groups/update', [
        'id' => $group['id'],
        'responsible' => 'Ana',
        'companions' => [
            ['id' => $joao['id'], 'name' => 'João Pedro'],
            ['id' => $maria['id'], 'name' => 'Maria'],
        ],
        'phone' => '',
    ], $token);
    check_same(200, $res['status'], 'status');

    $updated = reload_group($token);
    $names = array_column($updated['members'], 'name');
    check(in_array('João Pedro', $names, true), 'Joao deveria ter sido renomeado');

    foreach ($updated['members'] as $member) {
        if ($member['id'] === $maria['id']) {
            check_same('yes', $member['status'], 'a confirmacao da Maria foi perdida na edicao');
        }
    }
});

test('renomear o responsavel nao zera o status dele', function () {
    list($token, $group) = make_group('Ana', ['João']);

    $responsavel = $group['members'][0];
    Connection::get()->prepare("UPDATE guest_members SET status = 'yes' WHERE id = :id")
        ->execute(['id' => $responsavel['id']]);

    http_call('POST', '/admin/groups/update', [
        'id' => $group['id'],
        'responsible' => 'Ana Maria Silva',
        'companions' => [['id' => $group['members'][1]['id'], 'name' => 'João']],
        'phone' => '',
    ], $token);

    $updated = reload_group($token);
    check_same('Ana Maria Silva', $updated['members'][0]['name'], 'nome do responsavel');
    check_same($responsavel['id'], $updated['members'][0]['id'], 'o responsavel foi recriado em vez de renomeado');
    check_same('yes', $updated['members'][0]['status'], 'a confirmacao do responsavel foi perdida');
});

test('acompanhante que sai da lista e apagado, e os outros ficam', function () {
    list($token, $group) = make_group('Ana', ['João', 'Maria']);

    http_call('POST', '/admin/groups/update', [
        'id' => $group['id'],
        'responsible' => 'Ana',
        'companions' => [['id' => $group['members'][1]['id'], 'name' => 'João']],
        'phone' => '',
    ], $token);

    $updated = reload_group($token);
    check_same(2, count($updated['members']), 'deveriam sobrar Ana e Joao');
    check(!in_array('Maria', array_column($updated['members'], 'name'), true), 'Maria deveria ter saido');
});

test('acompanhante sem id e inserido como pendente', function () {
    list($token, $group) = make_group('Ana', ['João']);

    http_call('POST', '/admin/groups/update', [
        'id' => $group['id'],
        'responsible' => 'Ana',
        'companions' => [
            ['id' => $group['members'][1]['id'], 'name' => 'João'],
            ['name' => 'Bebê novo'],
        ],
        'phone' => '',
    ], $token);

    $updated = reload_group($token);
    check_same(3, count($updated['members']), 'deveria ter 3 pessoas');
    $novo = $updated['members'][2];
    check_same('Bebê novo', $novo['name'], 'nome do novo acompanhante');
    check_same('pending', $novo['status'], 'quem acabou de entrar comeca pendente');
});

test('id de pessoa de outro grupo e recusado e nao altera nada', function () {
    list($token, $primeiro) = make_group('Ana', ['João']);

    http_call('POST', '/admin/groups/create', ['responsible' => 'Carlos', 'companions' => ['Bia']], $token);
    $list = http_call('GET', '/admin/groups', null, $token);

    $outro = null;
    foreach ($list['body']['groups'] as $candidate) {
        if ($candidate['id'] !== $primeiro['id']) {
            $outro = $candidate;
        }
    }
    check($outro !== null, 'o segundo grupo deveria existir');

    $biaId = $outro['members'][1]['id'];
    $res = http_call('POST', '/admin/groups/update', [
        'id' => $primeiro['id'],
        'responsible' => 'Ana',
        'companions' => [['id' => $biaId, 'name' => 'Sequestrada']],
        'phone' => '',
    ], $token);
    check_same(400, $res['status'], 'status');

    $depois = http_call('GET', '/admin/groups', null, $token);
    foreach ($depois['body']['groups'] as $candidate) {
        foreach ($candidate['members'] as $member) {
            check($member['name'] !== 'Sequestrada', 'nenhuma pessoa deveria ter sido renomeada');
        }
    }
});

test('editar grupo inexistente devolve 404', function () {
    reset_tables();
    $token = admin_token();
    $res = http_call('POST', '/admin/groups/update', [
        'id' => 999999,
        'responsible' => 'Fantasma',
        'companions' => [],
        'phone' => '',
    ], $token);
    check_same(404, $res['status'], 'status');
});

test('editar sem token devolve 401', function () {
    list($token, $group) = make_group('Ana', []);
    $res = http_call('POST', '/admin/groups/update', [
        'id' => $group['id'],
        'responsible' => 'Invadida',
        'companions' => [],
    ]);
    check_same(401, $res['status'], 'status');
});

test('edicao troca o telefone do grupo', function () {
    list($token, $group) = make_group('Ana', [], '21965397036');

    http_call('POST', '/admin/groups/update', [
        'id' => $group['id'],
        'responsible' => 'Ana',
        'companions' => [],
        'phone' => '(11) 3333-4444',
    ], $token);

    check_same('1133334444', reload_group($token)['phone'], 'telefone deveria ter sido trocado');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php grupo
```

Esperado: os oito testes novos falham com status `404` (a rota `update` ainda não existe); os oito da Task 5 continuam passando.

- [ ] **Step 3: Acrescentar `update` em `GroupsController`**

Logo depois de `create()`:

```php
    public function update()
    {
        AdminSession::guard();

        $body = Request::json();
        $groupId = isset($body['id']) ? (int) $body['id'] : 0;
        $rawPhone = isset($body['phone']) ? $body['phone'] : '';
        $responsible = self::cleanName(isset($body['responsible']) ? $body['responsible'] : '');
        $phone = self::cleanPhone($rawPhone);

        $companions = [];
        $companionsInput = isset($body['companions']) && is_array($body['companions']) ? $body['companions'] : [];
        foreach (array_values($companionsInput) as $index => $item) {
            $raw = is_array($item) && isset($item['name']) ? $item['name'] : $item;
            $name = trim((string) $raw);
            if ($name === '') {
                continue;
            }
            $companions[] = [
                'id' => is_array($item) && isset($item['id']) ? (int) $item['id'] : 0,
                'name' => $name,
                'sort_order' => $index + 1,
            ];
        }

        $names = array_map(function ($companion) {
            return $companion['name'];
        }, $companions);

        $error = self::validate($responsible, $names, $phone, $rawPhone);
        if ($error !== null) {
            Response::json(['error' => $error], 400);
            return;
        }

        $pdo = Connection::get();

        $exists = $pdo->prepare('SELECT id FROM guest_groups WHERE id = :id LIMIT 1');
        $exists->execute(['id' => $groupId]);
        if (!$exists->fetch()) {
            Response::json(['error' => 'Grupo não encontrado.'], 404);
            return;
        }

        $current = $pdo->prepare('SELECT id FROM guest_members WHERE group_id = :id AND is_responsible = 0');
        $current->execute(['id' => $groupId]);
        $existingIds = array_map('intval', array_column($current->fetchAll(), 'id'));

        // Todo id que o painel mandou tem de ser deste grupo. Conferir antes de
        // abrir a transação é o que garante que um id de outra família não
        // renomeie ninguém — nem por engano do painel, nem de propósito.
        $keptIds = [];
        foreach ($companions as $companion) {
            if ($companion['id'] === 0) {
                continue;
            }
            if (!in_array($companion['id'], $existingIds, true)) {
                Response::json(['error' => 'Acompanhante não pertence a este grupo.'], 400);
                return;
            }
            $keptIds[] = $companion['id'];
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE guest_groups SET phone = :phone WHERE id = :id')
                ->execute(['phone' => $phone === '' ? null : $phone, 'id' => $groupId]);

            // Renomeado no lugar, nunca recriado: recriar geraria um id novo e
            // com ele perderia o status de quem já tinha respondido.
            $pdo->prepare('UPDATE guest_members SET `name` = :name WHERE group_id = :id AND is_responsible = 1')
                ->execute(['name' => $responsible, 'id' => $groupId]);

            $toDelete = array_values(array_diff($existingIds, $keptIds));
            if ($toDelete) {
                // Placeholders montados um a um: mesmo sendo ids já validados e
                // inteiros, nenhum valor entra no texto do SQL.
                $placeholders = [];
                $params = ['group_id' => $groupId];
                foreach ($toDelete as $position => $memberId) {
                    $placeholders[] = ':del' . $position;
                    $params['del' . $position] = $memberId;
                }
                $sql = 'DELETE FROM guest_members WHERE group_id = :group_id AND id IN ('
                    . implode(', ', $placeholders) . ')';
                $pdo->prepare($sql)->execute($params);
            }

            $rename = $pdo->prepare(
                'UPDATE guest_members SET `name` = :name, sort_order = :sort_order
                 WHERE id = :id AND group_id = :group_id'
            );
            $insert = $pdo->prepare(
                'INSERT INTO guest_members (group_id, `name`, is_responsible, sort_order)
                 VALUES (:group_id, :name, 0, :sort_order)'
            );

            foreach ($companions as $companion) {
                if ($companion['id'] !== 0) {
                    $rename->execute([
                        'name' => $companion['name'],
                        'sort_order' => $companion['sort_order'],
                        'id' => $companion['id'],
                        'group_id' => $groupId,
                    ]);
                } else {
                    $insert->execute([
                        'group_id' => $groupId,
                        'name' => $companion['name'],
                        'sort_order' => $companion['sort_order'],
                    ]);
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Response::json(['ok' => true]);
    }
```

- [ ] **Step 4: Registrar a rota em `backend/index.php`**

```php
$router->post('/admin/groups/update', function () {
    (new GroupsController())->update();
});
```

- [ ] **Step 5: Rodar e ver passar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php grupo
```

Esperado: `16 passaram, 0 falharam`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/Controllers/GroupsController.php backend/index.php backend/tests/cases/05-groups-update.php
git commit -m "feat: editar grupo sem perder as confirmacoes ja feitas"
```

---

### Task 7: Apagar grupo e marcar mensagem enviada

**Files:**
- Modify: `backend/src/Controllers/GroupsController.php` (`destroy`, `markMessageSent`)
- Modify: `backend/index.php` (duas rotas)
- Create: `backend/tests/cases/06-groups-delete.php`

**Interfaces:**
- Consumes: tudo das Tasks 4-6.
- Produces: `POST /admin/groups/delete` → `{ ok: true }` / 404; `POST /admin/groups/message-sent` → `{ ok: true, message_sent_at: string|null }` / 404.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/06-groups-delete.php`:

```php
<?php

use App\Database\Connection;

test('apagar grupo remove o grupo e as pessoas dele', function () {
    reset_tables();
    $token = admin_token();
    http_call('POST', '/admin/groups/create', ['responsible' => 'Ana', 'companions' => ['João']], $token);
    $group = http_call('GET', '/admin/groups', null, $token)['body']['groups'][0];

    $res = http_call('POST', '/admin/groups/delete', ['id' => $group['id']], $token);
    check_same(200, $res['status'], 'status');

    $list = http_call('GET', '/admin/groups', null, $token);
    check_same(0, count($list['body']['groups']), 'grupo deveria ter sumido');

    $left = Connection::get()->query('SELECT COUNT(*) AS total FROM guest_members')->fetch();
    check_same(0, (int) $left['total'], 'as pessoas do grupo deveriam ter sumido junto');
});

test('apagar grupo inexistente devolve 404', function () {
    reset_tables();
    $token = admin_token();
    $res = http_call('POST', '/admin/groups/delete', ['id' => 999999], $token);
    check_same(404, $res['status'], 'status');
});

test('apagar sem token devolve 401 e o grupo continua la', function () {
    reset_tables();
    $token = admin_token();
    http_call('POST', '/admin/groups/create', ['responsible' => 'Ana'], $token);
    $group = http_call('GET', '/admin/groups', null, $token)['body']['groups'][0];

    $res = http_call('POST', '/admin/groups/delete', ['id' => $group['id']]);
    check_same(401, $res['status'], 'status');

    $list = http_call('GET', '/admin/groups', null, $token);
    check_same(1, count($list['body']['groups']), 'o grupo nao deveria ter sido apagado');
});

test('marcar e desmarcar mensagem enviada', function () {
    reset_tables();
    $token = admin_token();
    http_call('POST', '/admin/groups/create', ['responsible' => 'Ana'], $token);
    $group = http_call('GET', '/admin/groups', null, $token)['body']['groups'][0];
    check_same(null, $group['message_sent_at'], 'grupo novo nao pode nascer marcado');

    $marked = http_call('POST', '/admin/groups/message-sent', ['id' => $group['id'], 'sent' => true], $token);
    check_same(200, $marked['status'], 'status ao marcar');
    check($marked['body']['message_sent_at'] !== null, 'deveria ter gravado a data do envio');

    $list = http_call('GET', '/admin/groups', null, $token);
    check($list['body']['groups'][0]['message_sent_at'] !== null, 'a marca deveria persistir');

    $unmarked = http_call('POST', '/admin/groups/message-sent', ['id' => $group['id'], 'sent' => false], $token);
    check_same(null, $unmarked['body']['message_sent_at'], 'desmarcar deveria limpar a data');
});

test('marcar mensagem de grupo inexistente devolve 404', function () {
    reset_tables();
    $token = admin_token();
    $res = http_call('POST', '/admin/groups/message-sent', ['id' => 999999, 'sent' => true], $token);
    check_same(404, $res['status'], 'status');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php apagar
```

Esperado: falhas com `404` nas rotas novas.

- [ ] **Step 3: Acrescentar os dois métodos em `GroupsController`**

```php
    public function destroy()
    {
        AdminSession::guard();

        $body = Request::json();
        $groupId = isset($body['id']) ? (int) $body['id'] : 0;

        // As pessoas do grupo somem pela FK ON DELETE CASCADE do schema — não
        // há um DELETE separado que possa ser esquecido aqui.
        $stmt = Connection::get()->prepare('DELETE FROM guest_groups WHERE id = :id');
        $stmt->execute(['id' => $groupId]);

        if ($stmt->rowCount() === 0) {
            Response::json(['error' => 'Grupo não encontrado.'], 404);
            return;
        }

        Response::json(['ok' => true]);
    }

    public function markMessageSent()
    {
        AdminSession::guard();

        $body = Request::json();
        $groupId = isset($body['id']) ? (int) $body['id'] : 0;
        $sent = isset($body['sent']) ? (bool) $body['sent'] : false;

        $pdo = Connection::get();
        $pdo->prepare('UPDATE guest_groups SET message_sent_at = :sent_at WHERE id = :id')
            ->execute([
                'sent_at' => $sent ? date('Y-m-d H:i:s') : null,
                'id' => $groupId,
            ]);

        // rowCount() do UPDATE também é 0 quando o valor já era o mesmo, então
        // quem decide se o grupo existe é esta consulta, não o rowCount.
        $check = $pdo->prepare('SELECT message_sent_at FROM guest_groups WHERE id = :id LIMIT 1');
        $check->execute(['id' => $groupId]);
        $row = $check->fetch();

        if (!$row) {
            Response::json(['error' => 'Grupo não encontrado.'], 404);
            return;
        }

        Response::json(['ok' => true, 'message_sent_at' => $row['message_sent_at']]);
    }
```

- [ ] **Step 4: Registrar as rotas em `backend/index.php`**

```php
$router->post('/admin/groups/delete', function () {
    (new GroupsController())->destroy();
});
$router->post('/admin/groups/message-sent', function () {
    (new GroupsController())->markMessageSent();
});
```

- [ ] **Step 5: Rodar e ver passar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

Esperado: `38 passaram, 0 falharam`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/Controllers/GroupsController.php backend/index.php backend/tests/cases/06-groups-delete.php
git commit -m "feat: apagar grupo e marcar convite como enviado"
```

---

### Task 8: Freio de força bruta e busca do grupo pelo código

**Files:**
- Create: `backend/src/Support/RateLimiter.php`
- Modify: `backend/src/Controllers/RsvpController.php` (reescrito — o conteúdo antigo, por email, sai inteiro)
- Modify: `backend/index.php` (a rota `GET /rsvp` passa a apontar para o método novo)
- Create: `backend/tests/cases/07-rsvp-lookup.php`

**Interfaces:**
- Consumes: `Codes::isGuid()` (Task 3), `Request::ip()` (Task 4).
- Produces: `RateLimiter::isBlocked(): bool`, `RateLimiter::registerFailure(): void`; `RsvpController::lookup()`; e o método privado `findGroup($code)` que a Task 9 reusa, devolvendo `['group_id' => int]` quando achou ou `['status' => int, 'body' => array]` quando é para responder erro.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/07-rsvp-lookup.php`:

```php
<?php

// Nome próprio para não colidir com o make_group de 05-groups-update.php — os
// arquivos de caso compartilham o mesmo escopo global do runner.
function seed_family($responsible, array $companions, $phone = '')
{
    reset_tables();
    $token = admin_token();
    http_call('POST', '/admin/groups/create', [
        'responsible' => $responsible,
        'companions' => $companions,
        'phone' => $phone,
    ], $token);

    return http_call('GET', '/admin/groups', null, $token)['body']['groups'][0];
}

test('buscar pelo guid devolve a familia com todo mundo pendente', function () {
    $group = seed_family('Ana Silva', ['João Silva']);

    $res = http_call('GET', '/rsvp?code=' . urlencode($group['guid']));
    check_same(200, $res['status'], 'status');
    check_same(true, $res['body']['found'], 'deveria ter achado');
    check_same(2, count($res['body']['members']), 'total de pessoas');
    check_same('Ana Silva', $res['body']['members'][0]['name'], 'responsavel vem primeiro');
    check_same(true, $res['body']['members'][0]['is_responsible'], 'flag de responsavel');
    check_same('pending', $res['body']['members'][1]['status'], 'status inicial');
});

test('a resposta publica nunca traz telefone, codigo curto nem id do grupo', function () {
    $group = seed_family('Ana', ['João'], '21965397036');

    $res = http_call('GET', '/rsvp?code=' . urlencode($group['guid']));
    $keys = array_keys($res['body']);
    sort($keys);
    check_same(['code', 'found', 'members'], $keys, 'chaves da resposta publica');

    check(strpos($res['raw'], '21965397036') === false, 'telefone vazou na resposta publica');
    check(strpos($res['raw'], $group['short_code']) === false, 'codigo curto vazou na resposta publica');

    foreach ($res['body']['members'] as $member) {
        $memberKeys = array_keys($member);
        sort($memberKeys);
        check_same(['id', 'is_responsible', 'name', 'status'], $memberKeys, 'chaves de cada convidado');
    }
});

test('quem entra pelo codigo curto nao recebe o guid de volta', function () {
    $group = seed_family('Ana', []);

    $res = http_call('GET', '/rsvp?code=' . $group['short_code']);
    check_same(true, $res['body']['found'], 'deveria ter achado pelo codigo curto');
    check_same($group['short_code'], $res['body']['code'], 'deveria devolver o mesmo codigo enviado');
    check(strpos($res['raw'], $group['guid']) === false, 'o guid vazou para quem usou o codigo curto');
});

test('codigo curto funciona em minusculas', function () {
    $group = seed_family('Ana', []);

    $res = http_call('GET', '/rsvp?code=' . strtolower($group['short_code']));
    check_same(true, $res['body']['found'], 'o codigo deveria valer independente da caixa');
});

test('o codigo de uma familia nunca abre o grupo de outra', function () {
    $primeira = seed_family('Ana', ['João']);
    $token = admin_token();
    http_call('POST', '/admin/groups/create', ['responsible' => 'Carlos', 'companions' => ['Bia']], $token);

    $todos = http_call('GET', '/admin/groups', null, $token)['body']['groups'];
    $segunda = $todos[0]['id'] === $primeira['id'] ? $todos[1] : $todos[0];

    $res = http_call('GET', '/rsvp?code=' . urlencode($primeira['guid']));
    $nomes = array_column($res['body']['members'], 'name');

    check(in_array('Ana', $nomes, true), 'deveria trazer a familia do codigo usado');
    check(!in_array('Carlos', $nomes, true), 'trouxe gente da outra familia');
    check(!in_array('Bia', $nomes, true), 'trouxe gente da outra familia');
    check(strpos($res['raw'], $segunda['guid']) === false, 'vazou o guid da outra familia');
});

test('codigo inexistente devolve found false, sem dizer por que', function () {
    seed_family('Ana', []);

    $res = http_call('GET', '/rsvp?code=ZZZZZZ');
    check_same(200, $res['status'], 'status');
    check_same(false, $res['body']['found'], 'nao deveria achar');
    check(!isset($res['body']['members']), 'nao pode devolver lista nenhuma');
});

test('busca sem codigo devolve 400', function () {
    $res = http_call('GET', '/rsvp?code=');
    check_same(400, $res['status'], 'status');
});

test('dez erros de codigo curto bloqueiam o proximo', function () {
    seed_family('Ana', []);

    for ($i = 0; $i < 10; $i++) {
        $res = http_call('GET', '/rsvp?code=QQQQQQ');
        check_same(200, $res['status'], "tentativa $i ainda deveria passar");
    }

    $blocked = http_call('GET', '/rsvp?code=QQQQQQ');
    check_same(429, $blocked['status'], 'a 11a tentativa deveria ser bloqueada');
});

test('o link com guid nao e afetado pelo bloqueio do codigo curto', function () {
    $group = seed_family('Ana', []);

    for ($i = 0; $i < 12; $i++) {
        http_call('GET', '/rsvp?code=QQQQQQ');
    }

    $res = http_call('GET', '/rsvp?code=' . urlencode($group['guid']));
    check_same(200, $res['status'], 'quem tem o link nao pode ser punido pelo vizinho de IP');
    check_same(true, $res['body']['found'], 'deveria achar pelo guid');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php codigo
```

Esperado: os oito novos falham (o `RsvpController` antigo espera `email` e responde 400 "Informe um email válido").

- [ ] **Step 3: Criar `backend/src/Support/RateLimiter.php`**

```php
<?php

namespace App\Support;

use App\Database\Connection;
use App\Http\Request;

// Freio de força bruta no código curto (6 caracteres, ~916 milhões de
// combinações). O GUID do link não passa por aqui: quem tem o link já tem o
// segredo, e travar por IP puniria a família inteira atrás do mesmo Wi-Fi.
class RateLimiter
{
    const MAX_FAILURES = 10;
    const WINDOW_MINUTES = 15;
    const KEEP_HOURS = 1;

    public static function isBlocked()
    {
        $pdo = Connection::get();

        // Limpeza oportunista: não há cron na hospedagem compartilhada, então é
        // aqui que a tabela para de crescer. Os números interpolados no SQL são
        // constantes desta classe — nenhum valor de cliente entra no texto.
        $pdo->exec('DELETE FROM code_attempts WHERE attempted_at < NOW() - INTERVAL ' . self::KEEP_HOURS . ' HOUR');

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS total FROM code_attempts
             WHERE ip_hash = :ip AND attempted_at > NOW() - INTERVAL ' . self::WINDOW_MINUTES . ' MINUTE'
        );
        $stmt->execute(['ip' => self::ipHash()]);
        $row = $stmt->fetch();

        return (int) $row['total'] >= self::MAX_FAILURES;
    }

    public static function registerFailure()
    {
        $stmt = Connection::get()->prepare(
            'INSERT INTO code_attempts (ip_hash, attempted_at) VALUES (:ip, NOW())'
        );
        $stmt->execute(['ip' => self::ipHash()]);
    }

    // Guarda o hash e não o IP: dá para contar tentativas do mesmo visitante sem
    // manter um registro de quem abriu o convite.
    private static function ipHash()
    {
        return hash('sha256', Request::ip());
    }
}
```

- [ ] **Step 4: Reescrever `backend/src/Controllers/RsvpController.php`**

O arquivo inteiro passa a ser (o método `confirm` entra na Task 9):

```php
<?php

namespace App\Controllers;

use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;
use App\Support\Codes;
use App\Support\RateLimiter;

class RsvpController
{
    public function lookup()
    {
        $code = trim((string) Request::query('code'));
        $found = $this->findGroup($code);

        if (!isset($found['group_id'])) {
            Response::json($found['body'], $found['status']);
            return;
        }

        Response::json([
            'found' => true,
            'code' => $code,
            'members' => $this->members($found['group_id']),
        ]);
    }

    // Devolve ['group_id' => int] quando achou; caso contrário, o par
    // status/body que o chamador deve responder. Fica em um lugar só porque
    // lookup e confirm precisam resolver o código exatamente da mesma forma —
    // duas cópias acabariam com regras de bloqueio diferentes.
    protected function findGroup($code)
    {
        if ($code === '') {
            return ['status' => 400, 'body' => ['error' => 'Informe o código do convite.']];
        }

        $pdo = Connection::get();

        if (Codes::isGuid($code)) {
            $stmt = $pdo->prepare('SELECT id FROM guest_groups WHERE guid = :code LIMIT 1');
            $stmt->execute(['code' => $code]);
            $row = $stmt->fetch();

            return $row
                ? ['group_id' => (int) $row['id']]
                : ['status' => 200, 'body' => ['found' => false]];
        }

        if (RateLimiter::isBlocked()) {
            return ['status' => 429, 'body' => ['error' => 'Muitas tentativas. Aguarde alguns minutos.']];
        }

        $stmt = $pdo->prepare('SELECT id FROM guest_groups WHERE short_code = :code LIMIT 1');
        $stmt->execute(['code' => strtoupper($code)]);
        $row = $stmt->fetch();

        if (!$row) {
            RateLimiter::registerFailure();
            return ['status' => 200, 'body' => ['found' => false]];
        }

        return ['group_id' => (int) $row['id']];
    }

    // Montado campo a campo de propósito: assim nenhuma coluna nova da tabela
    // (telefone, código curto, o que for) vaza pela API pública por esquecimento
    // de quem mexer aqui depois.
    protected function members($groupId)
    {
        $stmt = Connection::get()->prepare(
            'SELECT id, `name`, is_responsible, status FROM guest_members
             WHERE group_id = :id ORDER BY is_responsible DESC, sort_order, id'
        );
        $stmt->execute(['id' => $groupId]);

        $members = [];
        foreach ($stmt->fetchAll() as $row) {
            $members[] = [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'is_responsible' => (int) $row['is_responsible'] === 1,
                'status' => $row['status'],
            ];
        }

        return $members;
    }
}
```

- [ ] **Step 5: Ajustar as rotas de `/rsvp` em `backend/index.php`**

A rota `GET /rsvp` continua chamando `lookup()`. Remova por enquanto a rota `POST /rsvp`, que ainda aponta para o `save()` que deixou de existir — ela volta na Task 9:

```php
$router->get('/rsvp', function () {
    (new RsvpController())->lookup();
});
```

- [ ] **Step 6: Rodar e ver passar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

Esperado: `47 passaram, 0 falharam`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/Support/RateLimiter.php backend/src/Controllers/RsvpController.php backend/index.php backend/tests/cases/07-rsvp-lookup.php
git commit -m "feat: buscar grupo por guid ou codigo curto com freio de forca bruta"
```

---

### Task 9: Confirmar presença pessoa a pessoa

**Files:**
- Modify: `backend/src/Controllers/RsvpController.php` (método `confirm`)
- Modify: `backend/index.php` (rota `POST /rsvp`)
- Create: `backend/tests/cases/08-rsvp-confirm.php`

**Interfaces:**
- Consumes: `findGroup()`, `members()` (Task 8).
- Produces: `POST /rsvp` → `{ found: true, code, members: [...] }`; 400 em resposta inválida ou id de fora do grupo; 429 e `found:false` herdados do `findGroup`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/cases/08-rsvp-confirm.php`:

```php
<?php

use App\Database\Connection;

test('confirmar marca cada pessoa com o status enviado', function () {
    $group = seed_family('Ana', ['João', 'Maria']);
    $members = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];

    $res = http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [
            ['id' => $members[0]['id'], 'status' => 'yes'],
            ['id' => $members[1]['id'], 'status' => 'yes'],
            ['id' => $members[2]['id'], 'status' => 'no'],
        ],
    ]);

    check_same(200, $res['status'], 'status');
    check_same('yes', $res['body']['members'][0]['status'], 'Ana');
    check_same('yes', $res['body']['members'][1]['status'], 'Joao');
    check_same('no', $res['body']['members'][2]['status'], 'Maria');
});

test('confirmar preenche responded_at', function () {
    $group = seed_family('Ana', []);
    $members = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];

    http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [['id' => $members[0]['id'], 'status' => 'yes']],
    ]);

    $row = Connection::get()->query('SELECT responded_at FROM guest_members LIMIT 1')->fetch();
    check($row['responded_at'] !== null, 'responded_at deveria ter sido preenchido');
});

test('confirmar aceita subconjunto e nao mexe em quem nao veio no corpo', function () {
    $group = seed_family('Ana', ['João']);
    $members = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];

    $res = http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [['id' => $members[1]['id'], 'status' => 'no']],
    ]);

    check_same('pending', $res['body']['members'][0]['status'], 'Ana nao foi enviada, deveria seguir pendente');
    check_same('no', $res['body']['members'][1]['status'], 'Joao');
});

test('confirmar de novo sobrescreve, sem duplicar ninguem', function () {
    $group = seed_family('Ana', []);
    $members = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];

    http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [['id' => $members[0]['id'], 'status' => 'no']],
    ]);
    $res = http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [['id' => $members[0]['id'], 'status' => 'yes']],
    ]);

    check_same(1, count($res['body']['members']), 'nao pode ter duplicado a pessoa');
    check_same('yes', $res['body']['members'][0]['status'], 'a resposta nova deveria valer');
});

test('status invalido devolve 400 e nao grava nada', function () {
    $group = seed_family('Ana', ['João']);
    $members = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];

    $res = http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [
            ['id' => $members[0]['id'], 'status' => 'yes'],
            ['id' => $members[1]['id'], 'status' => 'talvez'],
        ],
    ]);
    check_same(400, $res['status'], 'status');

    $depois = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];
    check_same('pending', $depois[0]['status'], 'nada podia ter sido gravado');
});

test('id de pessoa de outro grupo devolve 400 e nao grava nada', function () {
    $group = seed_family('Ana', ['João']);
    $token = admin_token();
    http_call('POST', '/admin/groups/create', ['responsible' => 'Carlos'], $token);

    $todos = http_call('GET', '/admin/groups', null, $token)['body']['groups'];
    $outro = $todos[0]['id'] === $group['id'] ? $todos[1] : $todos[0];
    $carlosId = $outro['members'][0]['id'];

    $meus = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];

    $res = http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [
            ['id' => $meus[0]['id'], 'status' => 'yes'],
            ['id' => $carlosId, 'status' => 'no'],
        ],
    ]);
    check_same(400, $res['status'], 'status');

    $depois = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];
    check_same('pending', $depois[0]['status'], 'a gravacao parcial nao pode ter acontecido');

    $carlos = http_call('GET', '/admin/groups', null, $token)['body']['groups'];
    foreach ($carlos as $candidate) {
        foreach ($candidate['members'] as $member) {
            check_same('pending', $member['status'], 'ninguem podia ter sido alterado');
        }
    }
});

test('confirmar com lista de respostas vazia devolve 400', function () {
    $group = seed_family('Ana', []);
    $res = http_call('POST', '/rsvp', ['code' => $group['guid'], 'responses' => []]);
    check_same(400, $res['status'], 'status');
});

test('confirmar com codigo inexistente nao acha e nao grava', function () {
    seed_family('Ana', []);
    $res = http_call('POST', '/rsvp', [
        'code' => '99999999-9999-4999-8999-999999999999',
        'responses' => [['id' => 1, 'status' => 'yes']],
    ]);
    check_same(false, $res['body']['found'], 'nao deveria achar');
});

test('a resposta do confirm tambem nao vaza telefone', function () {
    $group = seed_family('Ana', [], '21965397036');
    $members = http_call('GET', '/rsvp?code=' . urlencode($group['guid']))['body']['members'];

    $res = http_call('POST', '/rsvp', [
        'code' => $group['guid'],
        'responses' => [['id' => $members[0]['id'], 'status' => 'yes']],
    ]);

    check(strpos($res['raw'], '21965397036') === false, 'telefone vazou na confirmacao');
    check(strpos($res['raw'], $group['short_code']) === false, 'codigo curto vazou na confirmacao');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php confirmar
```

Esperado: falhas com `404` (a rota `POST /rsvp` foi retirada na Task 8).

- [ ] **Step 3: Acrescentar `confirm` em `RsvpController`**

Logo depois de `lookup()`:

```php
    public function confirm()
    {
        $body = Request::json();
        $code = trim((string) (isset($body['code']) ? $body['code'] : ''));
        $responses = isset($body['responses']) && is_array($body['responses']) ? $body['responses'] : [];

        $found = $this->findGroup($code);
        if (!isset($found['group_id'])) {
            Response::json($found['body'], $found['status']);
            return;
        }
        $groupId = $found['group_id'];

        if (!$responses) {
            Response::json(['error' => 'Nenhuma resposta enviada.'], 400);
            return;
        }

        $clean = [];
        foreach ($responses as $response) {
            $memberId = isset($response['id']) ? (int) $response['id'] : 0;
            $status = isset($response['status']) ? (string) $response['status'] : '';

            // Só 'yes' e 'no' entram: 'pending' é estado inicial, não resposta.
            if ($memberId <= 0 || ($status !== 'yes' && $status !== 'no')) {
                Response::json(['error' => 'Resposta inválida.'], 400);
                return;
            }

            $clean[$memberId] = $status;
        }

        $pdo = Connection::get();

        $stmt = $pdo->prepare('SELECT id FROM guest_members WHERE group_id = :id');
        $stmt->execute(['id' => $groupId]);
        $ownIds = array_map('intval', array_column($stmt->fetchAll(), 'id'));

        // Conferir todos os ids ANTES de gravar qualquer um: assim um id de
        // outra família não consegue nem alterar meio grupo antes de a
        // requisição ser recusada. Ou grava tudo, ou não grava nada.
        foreach (array_keys($clean) as $memberId) {
            if (!in_array($memberId, $ownIds, true)) {
                Response::json(['error' => 'Convidado não pertence a este grupo.'], 400);
                return;
            }
        }

        $pdo->beginTransaction();
        try {
            $update = $pdo->prepare(
                'UPDATE guest_members SET status = :status, responded_at = NOW()
                 WHERE id = :id AND group_id = :group_id'
            );
            foreach ($clean as $memberId => $status) {
                $update->execute(['status' => $status, 'id' => $memberId, 'group_id' => $groupId]);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Response::json([
            'found' => true,
            'code' => $code,
            'members' => $this->members($groupId),
        ]);
    }
```

Acrescente `use Throwable;` no topo do arquivo, junto dos outros `use`.

- [ ] **Step 4: Registrar a rota em `backend/index.php`**

```php
$router->post('/rsvp', function () {
    (new RsvpController())->confirm();
});
```

- [ ] **Step 5: Rodar a suíte inteira**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

Esperado: `56 passaram, 0 falharam`.

- [ ] **Step 6: Conferir que nenhum resquício do modelo por email sobrou**

```bash
grep -rn "email\|rsvps\|companions" backend/src backend/index.php backend/database
```

Esperado: nenhuma linha. Se `companions` aparecer no `GroupsController`, é o nome do campo do payload do painel — esse pode ficar; `email` e `rsvps` não.

- [ ] **Step 7: Commit**

```bash
git add backend/src/Controllers/RsvpController.php backend/index.php backend/tests/cases/08-rsvp-confirm.php
git commit -m "feat: confirmar presenca pessoa a pessoa pelo codigo do grupo"
```

---

### Task 10: Cliente da API, conteúdo do convite e cálculo dos totais

Toda a lógica pura do frontend em uma task só: sem ela, nenhuma tela seguinte tem o que chamar. As três funções puras (`inviteMessage.js`, `groupStats.js`) são verificáveis direto no Node, sem navegador e sem instalar runner de teste nenhum.

**Files:**
- Modify: `frontend/api.js` (reescrito)
- Modify: `frontend/config.js` (acrescentar `SITE_URL` e `INVITE_MESSAGE`)
- Create: `frontend/screens/admin/inviteMessage.js`
- Create: `frontend/screens/admin/groupStats.js`

**Interfaces:**
- Consumes: as rotas das Tasks 4-9.
- Produces:
  - `api.js`: `getToken()`, `setToken(token)`, `SessionExpiredError`, `lookupGroup({code})`, `confirmGroup({code, responses})`, `adminLogin({password})`, `adminLogout()`, `fetchGroups()`, `createGroup({responsible, companions, phone})`, `updateGroup({id, responsible, companions, phone})`, `deleteGroup({id})`, `setMessageSent({id, sent})`
  - `inviteMessage.js`: `inviteLink(guid): string`, `inviteMessage({name, guid}): string`, `whatsappUrl({phone, message}): string`
  - `groupStats.js`: `GROUP_STATUS`, `GROUP_STATUS_LABEL`, `groupStatus(group): string`, `responsibleName(group): string`, `groupScore(group): {total, yes, no, pending}`, `totals(groups): {...}`

- [ ] **Step 1: Escrever a verificação que falha**

Crie `frontend/check-puro.mjs` (temporário — apagado no Step 7):

```js
// Conferência das funções puras. Roda com "node check-puro.mjs" de dentro de
// frontend/. Não é uma suíte: é o mínimo para não descobrir no navegador que a
// conta do painel está errada.
import { inviteLink, inviteMessage, whatsappUrl } from './screens/admin/inviteMessage.js'
import { GROUP_STATUS, groupStatus, responsibleName, groupScore, totals } from './screens/admin/groupStats.js'

let falhas = 0
const check = (condicao, mensagem) => {
  if (condicao) return
  falhas += 1
  console.log('FALHOU  ' + mensagem)
}

const guid = '11111111-1111-4111-8111-111111111111'

check(inviteLink(guid).endsWith(`/?c=${guid}`), 'inviteLink deveria terminar com ?c=<guid>')
check(!inviteLink(guid).includes('//?c='), 'inviteLink nao pode duplicar a barra')

const msg = inviteMessage({ name: 'Ana', guid })
check(msg.includes('Ana'), 'a mensagem deveria conter o nome')
check(msg.includes(guid), 'a mensagem deveria conter o link')
check(!msg.includes('{'), 'sobrou placeholder sem substituir na mensagem')

check(
  whatsappUrl({ phone: '21965397036', message: 'oi' }).startsWith('https://wa.me/5521965397036?text='),
  'celular de 11 digitos deveria ganhar o 55',
)
check(
  whatsappUrl({ phone: '5521965397036', message: 'oi' }).startsWith('https://wa.me/5521965397036?text='),
  'numero que ja tem o 55 nao pode ganhar outro',
)
check(
  whatsappUrl({ phone: '5533334444', message: 'oi' }).startsWith('https://wa.me/555533334444?'),
  'DDD 55 com 10 digitos ainda e local e precisa do codigo do pais',
)
check(whatsappUrl({ phone: '', message: 'oi' }) === '', 'sem telefone nao ha link de whatsapp')

const pendente = { message_sent_at: null, members: [{ status: 'pending', is_responsible: true, name: 'Ana' }] }
const enviado = { message_sent_at: '2026-08-21 10:00:00', members: [{ status: 'pending', is_responsible: true, name: 'Ana' }] }
const parcial = {
  message_sent_at: '2026-08-21 10:00:00',
  members: [
    { status: 'yes', is_responsible: true, name: 'Ana' },
    { status: 'pending', is_responsible: false, name: 'João' },
  ],
}
const respondido = {
  message_sent_at: '2026-08-21 10:00:00',
  members: [
    { status: 'yes', is_responsible: true, name: 'Ana' },
    { status: 'no', is_responsible: false, name: 'João' },
  ],
}

check(groupStatus(pendente) === GROUP_STATUS.naoEnviado, 'sem envio deveria ser nao-enviado')
check(groupStatus(enviado) === GROUP_STATUS.aguardando, 'enviado e sem resposta deveria ser aguardando')
check(groupStatus(parcial) === GROUP_STATUS.parcial, 'resposta parcial')
check(groupStatus(respondido) === GROUP_STATUS.respondido, 'todos responderam')
check(
  groupStatus({ message_sent_at: null, members: [{ status: 'yes', is_responsible: true, name: 'Ana' }] }) ===
    GROUP_STATUS.respondido,
  'quem respondeu sem eu ter marcado o envio ainda conta como respondido',
)

check(responsibleName(parcial) === 'Ana', 'nome do responsavel')
check(responsibleName({ members: [] }) === '—', 'grupo sem ninguem devolve travessao')

const score = groupScore(respondido)
check(score.total === 2 && score.yes === 1 && score.no === 1 && score.pending === 0, 'placar do grupo')

const soma = totals([pendente, enviado, parcial, respondido])
check(soma.groups === 4, 'total de grupos')
check(soma.people === 6, 'total de pessoas')
check(soma.yes === 2, 'total de confirmados')
check(soma.no === 1, 'total de recusas')
check(soma.pending === 3, 'total sem resposta')
check(soma.notSent === 1, 'grupos sem convite enviado')
check(soma.waiting === 1, 'grupos aguardando resposta')
check(soma.answeredGroups === 1, 'grupos que responderam por inteiro')
check(soma.sent === 3, 'grupos com convite ja enviado')

console.log(falhas === 0 ? 'tudo certo' : `${falhas} falharam`)
process.exit(falhas === 0 ? 0 : 1)
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && node check-puro.mjs
```

Esperado: `ERR_MODULE_NOT_FOUND` para `./screens/admin/inviteMessage.js`.

- [ ] **Step 3: Acrescentar `SITE_URL` e `INVITE_MESSAGE` em `frontend/config.js`**

No fim do arquivo:

```js
// Domínio público do convite, sem barra no fim. É daqui que sai o link exclusivo
// de cada família no painel — em produção precisa ser o domínio real, senão os
// convites saem apontando para lugar nenhum.
// TODO: troque pelo domínio real antes de publicar.
export const SITE_URL = 'https://SEU-DOMINIO.com'

// Mensagem copiada no painel para mandar no WhatsApp. Os campos entre chaves são
// preenchidos por grupo: {nome} é o responsável e {link} é o link exclusivo dele.
export const INVITE_MESSAGE = `Oi, {nome}! 💛

Você e sua família estão convidados para o meu aniversário!

📅 {data} às {hora}
👗 Traje: {traje}

Confirme a presença de cada pessoa do seu grupo por aqui:
{link}

Esse link é só da sua família — não precisa de senha nem de código. 💛`
```

- [ ] **Step 4: Criar `frontend/screens/admin/inviteMessage.js`**

```js
import {
  SITE_URL,
  INVITE_MESSAGE,
  EVENT_DATE_LABEL,
  EVENT_TIME_LABEL,
  DRESS_CODE,
} from '../../config.js'

// O link cai na raiz, não em /confirmacao: assim a família vê o vídeo de
// abertura, e o "?c=" atravessa a troca de rota junto.
export function inviteLink(guid) {
  return `${SITE_URL.replace(/\/+$/, '')}/?c=${guid}`
}

export function inviteMessage({ name, guid }) {
  return INVITE_MESSAGE.replaceAll('{nome}', name)
    .replaceAll('{link}', inviteLink(guid))
    .replaceAll('{data}', EVENT_DATE_LABEL)
    .replaceAll('{hora}', EVENT_TIME_LABEL)
    .replaceAll('{traje}', DRESS_CODE)
}

// O wa.me exige só dígitos e com código do país. O organizador digita o número
// como quiser, então o 55 entra aqui — e a decisão é pelo TAMANHO, não pelo
// começo: um celular de DDD 55 (Santa Maria) começa com 55 e mesmo assim
// precisa do código do país na frente.
export function whatsappUrl({ phone, message }) {
  const digits = String(phone || '').replace(/\D+/g, '')
  if (!digits) return ''

  const withCountry = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 5: Criar `frontend/screens/admin/groupStats.js`**

```js
// Status derivado de um grupo e os totais do painel. Em um arquivo só porque
// Visão geral, Convidados e Envios mostram os mesmos números: três cópias da
// conta acabariam divergindo em cima da mesma tabela.

export const GROUP_STATUS = {
  naoEnviado: 'nao-enviado',
  aguardando: 'aguardando',
  parcial: 'parcial',
  respondido: 'respondido',
}

export const GROUP_STATUS_LABEL = {
  [GROUP_STATUS.naoEnviado]: 'Não enviado',
  [GROUP_STATUS.aguardando]: 'Aguardando',
  [GROUP_STATUS.parcial]: 'Parcial',
  [GROUP_STATUS.respondido]: 'Respondido',
}

// A resposta vem antes do envio na ordem dos testes de propósito: se a família
// respondeu e o organizador esqueceu de marcar o check, o que interessa a ele é
// "respondido", não "não enviado".
export function groupStatus(group) {
  const members = group.members || []
  const answered = members.filter((member) => member.status !== 'pending').length

  if (members.length > 0 && answered === members.length) return GROUP_STATUS.respondido
  if (answered > 0) return GROUP_STATUS.parcial
  if (!group.message_sent_at) return GROUP_STATUS.naoEnviado
  return GROUP_STATUS.aguardando
}

export function responsibleName(group) {
  const responsible = (group.members || []).find((member) => member.is_responsible)
  return responsible ? responsible.name : '—'
}

export function groupScore(group) {
  const members = group.members || []
  return {
    total: members.length,
    yes: members.filter((member) => member.status === 'yes').length,
    no: members.filter((member) => member.status === 'no').length,
    pending: members.filter((member) => member.status === 'pending').length,
  }
}

export function totals(groups) {
  return (groups || []).reduce(
    (acc, group) => {
      const score = groupScore(group)
      const status = groupStatus(group)
      return {
        people: acc.people + score.total,
        yes: acc.yes + score.yes,
        no: acc.no + score.no,
        pending: acc.pending + score.pending,
        groups: acc.groups + 1,
        answeredGroups: acc.answeredGroups + (status === GROUP_STATUS.respondido ? 1 : 0),
        sent: acc.sent + (group.message_sent_at ? 1 : 0),
        notSent: acc.notSent + (status === GROUP_STATUS.naoEnviado ? 1 : 0),
        waiting: acc.waiting + (status === GROUP_STATUS.aguardando ? 1 : 0),
      }
    },
    {
      people: 0,
      yes: 0,
      no: 0,
      pending: 0,
      groups: 0,
      answeredGroups: 0,
      sent: 0,
      notSent: 0,
      waiting: 0,
    },
  )
}
```

- [ ] **Step 6: Reescrever `frontend/api.js`**

```js
// Cliente da API do convite (PHP + MySQL na HostGator).
// Em dev o next.config.js encaminha /api/* para o backend local (ver rewrites);
// em produção o front e a API ficam na mesma origem.

const API_BASE = '/api'
const TOKEN_KEY = 'nivergio.admin.token'

// sessionStorage e não localStorage: o token do painel morre ao fechar a aba.
// Num celular emprestado, uma sessão de organizador não fica aberta para sempre.
export function getToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (typeof window === 'undefined') return
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
  else window.sessionStorage.removeItem(TOKEN_KEY)
}

// Erro com nome próprio para o painel distinguir "sessão caiu, volte ao login"
// de "deu erro, tente de novo" sem inspecionar texto de mensagem.
export class SessionExpiredError extends Error {
  constructor() {
    super('Sessão expirada. Entre de novo.')
    this.name = 'SessionExpiredError'
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) headers.Authorization = `Bearer ${getToken()}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)

  // O 401 é tratado em um lugar só: derruba a sessão aqui, e cada tela apenas
  // reage ao erro com nome — em vez de nove componentes adivinhando o que houve.
  if (auth && res.status === 401) {
    setToken('')
    throw new SessionExpiredError()
  }
  if (!res.ok || !data) {
    throw new Error(data?.error || 'Erro ao comunicar com o servidor.')
  }
  return data
}

export function lookupGroup({ code }) {
  const params = new URLSearchParams({ code })
  return request(`/rsvp?${params.toString()}`)
}

export function confirmGroup({ code, responses }) {
  return request('/rsvp', { method: 'POST', body: { code, responses } })
}

export async function adminLogin({ password }) {
  const data = await request('/admin/login', { method: 'POST', body: { password } })
  setToken(data.token)
  return data
}

export async function adminLogout() {
  try {
    await request('/admin/logout', { method: 'POST', body: {}, auth: true })
  } finally {
    // O token sai do navegador mesmo se a chamada falhar: por o servidor já ter
    // expirado a sessão, por queda de rede, tanto faz — sair tem de sair.
    setToken('')
  }
}

export function fetchGroups() {
  return request('/admin/groups', { auth: true })
}

export function createGroup({ responsible, companions, phone }) {
  return request('/admin/groups/create', {
    method: 'POST',
    body: { responsible, companions, phone },
    auth: true,
  })
}

export function updateGroup({ id, responsible, companions, phone }) {
  return request('/admin/groups/update', {
    method: 'POST',
    body: { id, responsible, companions, phone },
    auth: true,
  })
}

export function deleteGroup({ id }) {
  return request('/admin/groups/delete', { method: 'POST', body: { id }, auth: true })
}

export function setMessageSent({ id, sent }) {
  return request('/admin/groups/message-sent', { method: 'POST', body: { id, sent }, auth: true })
}
```

- [ ] **Step 7: Rodar, ver passar e apagar o arquivo de conferência**

```bash
cd frontend && node check-puro.mjs
```

Esperado: `tudo certo`.

```bash
rm frontend/check-puro.mjs
```

- [ ] **Step 8: Lint**

```bash
cd frontend && npm run lint
```

Esperado: sem erros. (`api.js` ainda é importado pelas telas antigas, que só serão reescritas nas próximas tasks — o lint não reclama de import quebrado, mas o build sim, então **não** rode `npm run build` ainda.)

- [ ] **Step 9: Commit**

```bash
git add frontend/api.js frontend/config.js frontend/screens/admin
git commit -m "feat: cliente da API por codigo de grupo, mensagem do convite e totais do painel"
```

> **Estado intermediário conhecido:** a partir daqui e até a Task 12, `npm run build` **falha** — o `AdminPage.jsx` antigo ainda importa `fetchAdminRsvps`, que saiu do `api.js`. É esperado e não é motivo para parar. A verificação das Tasks 11 e 12 é por `npm run dev` (compila rota a rota, sob demanda) e `npm run lint`. O `npm run build` volta a ser exigido na Task 13.

---

### Task 11: Convidado confirma pelo link, pessoa a pessoa

**Files:**
- Modify: `frontend/app/(public)/page.jsx`
- Modify: `frontend/app/(public)/confirmacao/page.jsx`
- Modify: `frontend/screens/ConfirmPresencaPage.jsx` (reescrito)
- Modify: `frontend/screens/ConfirmPresencaPage.css` (reescrito)

**Interfaces:**
- Consumes: `lookupGroup`, `confirmGroup` (Task 10); `GET /rsvp`, `POST /rsvp` (Tasks 8-9).
- Produces: `<ConfirmPresencaPage code={string} onBack={fn} />` — a prop `code` é o valor de `?c=` ou string vazia.

- [ ] **Step 1: Levantar o backend e criar uma família de teste**

Com o Apache no ar e o `npm run dev` **fechado**:

```bash
curl -s -X POST http://localhost/nivergio-api/backend/admin/login -H "Content-Type: application/json" -d "{\"password\":\"$(grep -E '^ADMIN_PASSWORD=' backend/.env.local | cut -d= -f2)\"}"
```

Copie o `token` da resposta e crie a família (troque `SEU_TOKEN`):

```bash
curl -s -X POST http://localhost/nivergio-api/backend/admin/groups/create -H "Content-Type: application/json" -H "Authorization: Bearer SEU_TOKEN" -d '{"responsible":"Ana Silva","companions":["João Silva","Maria Silva"],"phone":"21965397036"}'
```

```bash
curl -s http://localhost/nivergio-api/backend/admin/groups -H "Authorization: Bearer SEU_TOKEN"
```

Anote o `guid` e o `short_code` que aparecerem — os dois são usados nos passos de verificação.

- [ ] **Step 2: Reescrever `frontend/app/(public)/page.jsx`**

```jsx
'use client'

import { useRouter } from 'next/navigation'
import VideoPage from '../../screens/VideoPage.jsx'

// A "/" é só o vídeo de abertura. Quando ele termina a navegação troca de rota,
// em vez de trocar de estado como antes: assim recarregar a página cai direto
// no convite, sem obrigar o convidado a rever o vídeo inteiro.
function AberturaPage() {
  const router = useRouter()

  // O código da família chega em "?c=..." e precisa atravessar a troca de rota.
  // Sem isso, quem abriu o link certo cairia na tela de digitar código.
  const handleFinished = () => {
    const code = new URLSearchParams(window.location.search).get('c')
    router.replace(code ? `/confirmacao/?c=${encodeURIComponent(code)}` : '/confirmacao/')
  }

  // replace, não push: o vídeo é uma abertura de uma vez só, então voltar pra
  // ele pelo botão do navegador só faria o convidado esperar de novo.
  return <VideoPage onFinished={handleFinished} />
}

export default AberturaPage
```

- [ ] **Step 3: Reescrever `frontend/app/(public)/confirmacao/page.jsx`**

```jsx
'use client'

import { useEffect, useState } from 'react'
import InfoPage from '../../../screens/InfoPage.jsx'
import GiftsPage from '../../../screens/GiftsPage.jsx'
import ConfirmPresencaPage from '../../../screens/ConfirmPresencaPage.jsx'

// Tudo que vem depois do vídeo mora nesta rota. Dentro dela a navegação continua
// sendo um `stage` só, porque presentes e confirmação são telas curtas, sempre
// abertas a partir daqui e sem link direto pra elas.
function ConfirmacaoPage() {
  const [stage, setStage] = useState('info') // 'info' | 'presentes' | 'confirmar'
  const [code, setCode] = useState('')

  // window.location e não useSearchParams: com output:'export' o useSearchParams
  // obriga a envolver a página num <Suspense> só pra o build passar, sem ganho
  // nenhum para ler uma query string.
  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get('c') || '')
  }, [])

  if (stage === 'presentes') {
    return <GiftsPage onBack={() => setStage('info')} />
  }
  if (stage === 'confirmar') {
    return <ConfirmPresencaPage code={code} onBack={() => setStage('info')} />
  }
  return (
    <InfoPage
      onOpenGifts={() => setStage('presentes')}
      onOpenConfirm={() => setStage('confirmar')}
    />
  )
}

export default ConfirmacaoPage
```

- [ ] **Step 4: Reescrever `frontend/screens/ConfirmPresencaPage.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react'
import Sparkles from '../components/Sparkles.jsx'
import { lookupGroup, confirmGroup } from '../api.js'
import './ConfirmPresencaPage.css'

const CODE_LENGTH = 6

function ConfirmPresencaPage({ code: linkCode, onBack }) {
  // Quem chegou pelo link já entra carregando; a tela de digitar código é o
  // plano B de quem perdeu a mensagem.
  const [step, setStep] = useState(linkCode ? 'loading' : 'code')
  const [code, setCode] = useState(linkCode || '')
  const [codeInput, setCodeInput] = useState('')
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (rawCode) => {
    setStep('loading')
    setErrorMessage('')
    try {
      const data = await lookupGroup({ code: rawCode })
      if (!data.found) {
        setStep('code')
        setErrorMessage('Código não encontrado. Confira o link que você recebeu.')
        return
      }
      setCode(rawCode)
      setMembers(data.members)
      setStep('list')
    } catch (err) {
      setStep('code')
      setErrorMessage(err.message)
    }
  }, [])

  useEffect(() => {
    if (linkCode) load(linkCode)
  }, [linkCode, load])

  const answered = members.filter((member) => member.status !== 'pending').length
  const missing = members.length - answered
  const going = members.filter((member) => member.status === 'yes').length
  const responsible = members.find((member) => member.is_responsible)

  const handleCodeSubmit = (event) => {
    event.preventDefault()
    const typed = codeInput.trim().toUpperCase()
    if (typed.length !== CODE_LENGTH) {
      setErrorMessage(`O código do convite tem ${CODE_LENGTH} caracteres.`)
      return
    }
    load(typed)
  }

  const answer = (id, status) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, status } : member)),
    )
  }

  const handleConfirm = async () => {
    setSaving(true)
    setErrorMessage('')
    try {
      const data = await confirmGroup({
        code,
        responses: members.map((member) => ({ id: member.id, status: member.status })),
      })
      setMembers(data.members)
      setStep('done')
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="confirm-page">
      <Sparkles />

      <div className="confirm-page__content">
        <button type="button" className="confirm-page__back" onClick={onBack}>
          ← Voltar
        </button>

        <h1 className="confirm-page__title">Confirmar presença</h1>

        {step === 'loading' && (
          <div className="confirm-page__card">
            <p className="confirm-page__hint">Buscando seu convite…</p>
          </div>
        )}

        {step === 'code' && (
          <form className="confirm-page__card" onSubmit={handleCodeSubmit}>
            <p className="confirm-page__hint">
              Digite o código que está no convite que você recebeu.
            </p>

            <label className="confirm-page__label" htmlFor="invite-code">
              Código do convite
            </label>
            <input
              id="invite-code"
              className="confirm-page__input confirm-page__input--code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={CODE_LENGTH}
              required
            />

            {errorMessage && <p className="confirm-page__error">{errorMessage}</p>}

            <button type="submit" className="confirm-page__submit">
              Abrir convite
            </button>
          </form>
        )}

        {step === 'list' && (
          <div className="confirm-page__card">
            <p className="confirm-page__greeting">
              Oi, {responsible ? responsible.name.split(' ')[0] : 'você'}! 👋
            </p>
            <p className="confirm-page__hint">Quem do seu grupo vai à festa?</p>

            <ul className="confirm-page__members">
              {members.map((member) => (
                <li className="confirm-page__member" key={member.id}>
                  <span className="confirm-page__member-name">{member.name}</span>
                  <span className="confirm-page__member-actions">
                    <button
                      type="button"
                      className={`confirm-page__answer confirm-page__answer--yes${
                        member.status === 'yes' ? ' is-active' : ''
                      }`}
                      onClick={() => answer(member.id, 'yes')}
                      aria-pressed={member.status === 'yes'}
                    >
                      Vai
                    </button>
                    <button
                      type="button"
                      className={`confirm-page__answer confirm-page__answer--no${
                        member.status === 'no' ? ' is-active' : ''
                      }`}
                      onClick={() => answer(member.id, 'no')}
                      aria-pressed={member.status === 'no'}
                    >
                      Não vai
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <p className="confirm-page__total">
              {going === 0
                ? 'Ninguém marcado ainda'
                : `${going} de ${members.length} ${going === 1 ? 'confirmado' : 'confirmados'}`}
            </p>

            {errorMessage && <p className="confirm-page__error">{errorMessage}</p>}

            <button
              type="button"
              className="confirm-page__submit"
              onClick={handleConfirm}
              disabled={saving || missing > 0}
            >
              {saving ? 'Enviando…' : 'Enviar resposta'}
            </button>

            {/* Resposta pela metade deixaria o organizador com número aberto,
                então o aviso diz exatamente quantos faltam. */}
            {missing > 0 && (
              <p className="confirm-page__pending">
                {missing === 1
                  ? 'Falta responder por 1 pessoa'
                  : `Falta responder por ${missing} pessoas`}
              </p>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="confirm-page__card">
            <p className="confirm-page__greeting">Resposta enviada! 🎉</p>
            <p className="confirm-page__hint">
              {going === 0
                ? 'Que pena! Sentiremos sua falta.'
                : `${going} ${going === 1 ? 'lugar guardado' : 'lugares guardados'}. Nos vemos na festa!`}
            </p>
            <button
              type="button"
              className="confirm-page__submit"
              onClick={() => setStep('list')}
            >
              Editar resposta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfirmPresencaPage
```

- [ ] **Step 5: Reescrever `frontend/screens/ConfirmPresencaPage.css`**

Mantenha o que já existe de `.confirm-page`, `.confirm-page__content`, `.confirm-page__back`, `.confirm-page__title`, `.confirm-page__card`, `.confirm-page__hint`, `.confirm-page__label`, `.confirm-page__input`, `.confirm-page__error`, `.confirm-page__submit`, `.confirm-page__greeting` e `.confirm-page__total`. Apague as regras `.confirm-page__companion*` e `.confirm-page__add-companion` e acrescente no fim:

```css
/* O código é curto e ditado por telefone: caixa alta, espaçado e monoespaçado
   para o convidado conferir caractere a caractere o que digitou. */
.confirm-page__input--code {
  text-transform: uppercase;
  letter-spacing: 0.35em;
  text-align: center;
  font-family: ui-monospace, 'Cascadia Mono', 'Consolas', monospace;
  font-size: 22px;
}

.confirm-page__members {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirm-page__member {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(91, 58, 122, 0.08);
}

.confirm-page__member-name {
  font-weight: 600;
  color: var(--ink);
}

.confirm-page__member-actions {
  display: flex;
  gap: 8px;
}

/* Alvo grande de propósito: a família responde isso no celular, muitas vezes
   com uma mão só. */
.confirm-page__answer {
  min-height: 40px;
  min-width: 76px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(91, 58, 122, 0.35);
  background: transparent;
  color: var(--purple-dark);
  font: inherit;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.confirm-page__answer--yes.is-active {
  background: var(--purple);
  border-color: var(--purple);
  color: var(--cream);
}

.confirm-page__answer--no.is-active {
  background: rgba(59, 42, 74, 0.75);
  border-color: rgba(59, 42, 74, 0.75);
  color: var(--cream);
}

.confirm-page__pending {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  color: var(--purple-dark);
  opacity: 0.8;
}
```

- [ ] **Step 6: Lint**

```bash
cd frontend && npm run lint
```

Esperado: sem erros.

- [ ] **Step 7: Verificar no navegador — caminho do link**

Suba o dev server (`npm run dev` dentro de `frontend/`) e abra:

```
http://localhost:3000/?c=COLE_O_GUID_AQUI
```

Confira, nesta ordem:

1. O vídeo aparece; ao terminar (ou clicando em "Continuar mesmo assim" se o vídeo não tocar), a URL vira `/confirmacao/?c=<guid>` — o `?c=` **sobreviveu** à troca de rota.
2. Clicando em "Confirmar presença", a tela abre já com **Ana Silva, João Silva e Maria Silva**, sem pedir código.
3. O botão "Enviar resposta" está **desabilitado** e abaixo dele lê-se "Falta responder por 3 pessoas".
4. Marcando *Vai* para Ana e João e *Não vai* para Maria, o aviso some, o placar mostra "2 de 3 confirmados" e o botão habilita.
5. Enviando, aparece "Resposta enviada!".
6. Recarregando `/confirmacao/?c=<guid>` e reabrindo a confirmação, as marcas **voltam como foram salvas**.

Confirme no servidor:

```bash
curl -s "http://localhost/nivergio-api/backend/rsvp?code=COLE_O_GUID_AQUI"
```

Esperado: `"status":"yes"` para dois e `"status":"no"` para um. E **não** deve aparecer `phone` nem o `short_code` na resposta.

- [ ] **Step 8: Verificar no navegador — caminho do código curto**

Abra `http://localhost:3000/confirmacao/` (sem `?c=`) e clique em "Confirmar presença".

1. Aparece o campo "Código do convite".
2. Digitando `abc` (3 letras) e enviando: "O código do convite tem 6 caracteres."
3. Digitando 6 caracteres errados (`ZZZZZZ`): "Código não encontrado. Confira o link que você recebeu."
4. Digitando o `short_code` real **em minúsculas**: abre a família certa.

- [ ] **Step 9: Commit**

```bash
git add "frontend/app/(public)/page.jsx" "frontend/app/(public)/confirmacao/page.jsx" frontend/screens/ConfirmPresencaPage.jsx frontend/screens/ConfirmPresencaPage.css
git commit -m "feat: convidado confirma pessoa a pessoa pelo link da familia"
```

---

### Task 12: Shell do painel, login por token e Visão geral

O painel passa a ser um dashboard com sidebar. Esta task entrega o shell navegável com **uma** seção real; as outras duas entram nas Tasks 13 e 14, cada uma acrescentando o próprio item ao menu. Nada de item de menu que não leva a lugar nenhum.

**Files:**
- Create: `frontend/screens/admin/adminTokens.css`, `AdminShell.jsx`, `AdminShell.css`, `LoginCard.jsx`, `LoginCard.css`, `OverviewSection.jsx`, `OverviewSection.css`
- Modify: `frontend/screens/AdminPage.jsx` (reescrito como orquestrador)
- Modify: `frontend/screens/AdminPage.css` (reescrito — sobra só o enquadramento da página)

**Interfaces:**
- Consumes: `adminLogin`, `adminLogout`, `fetchGroups`, `getToken`, `SessionExpiredError` (Task 10); `totals`, `GROUP_STATUS` (Task 10).
- Produces:
  - `<AdminShell section title sections onSection onRefresh refreshing onLogout>{children}</AdminShell>`
  - `<LoginCard onSubmit={(senha) => Promise} notice={string} />`
  - `<OverviewSection groups={array} onFilter={(status) => void} />` — `onFilter` recebe um valor de `GROUP_STATUS` e é ligado à seção Convidados na Task 13.

- [ ] **Step 1: Carregar a skill de UI**

Antes de escrever qualquer CSS, invoque a skill `anti-ai-slop-ui` e siga a direção que ela pede. Dashboard com sidebar é exatamente o tipo de tela que sai genérica por padrão; a direção deste painel está fixada abaixo e nos tokens do Step 2:

- **Ferramenta, não convite.** Superfícies escuras, densidade alta, número grande e legível de relance. Nada de `Sparkles` aqui.
- **Herda a paleta do tema Enrolados** (roxo e dourado) nos acentos, estados e destaques — não vira cinza-azulado de template.
- **Ícones em SVG inline**, nunca emoji na navegação.
- **Alvos de toque de 40px para cima** — metade do uso é no celular.

- [ ] **Step 2: Criar `frontend/screens/admin/adminTokens.css`**

```css
/* Tokens do painel, presos ao escopo .admin para não vazarem nas telas do
   convidado, que seguem com a paleta clara do index.css.

   O painel é ferramenta e não convite: fundo escuro, densidade alta e números
   legíveis de relance. O roxo e o dourado do tema entram nos acentos — é o que
   faz este painel parecer o desta festa, e não um dashboard qualquer. */
.admin {
  --admin-bg: #171326;
  --admin-surface: #1f1a33;
  --admin-surface-2: #272040;
  --admin-line: #362c55;
  --admin-text: #ece7f6;
  --admin-muted: #a99fc4;

  --admin-accent: #f0c454;          /* var(--gold) do tema */
  --admin-accent-soft: rgba(240, 196, 84, 0.14);
  --admin-purple: #8a63ad;          /* var(--purple-light) do tema */

  --admin-yes: #5fc9a0;
  --admin-no: #e07a8f;
  --admin-pending: #9a90b8;

  --admin-radius: 12px;
  --admin-gap: 16px;
  --admin-sidebar: 232px;
  --admin-topbar: 60px;
  --admin-bottombar: 64px;

  --admin-mono: ui-monospace, 'Cascadia Mono', Consolas, monospace;

  background: var(--admin-bg);
  color: var(--admin-text);
  font-family: var(--sans);
  font-size: 15px;
}
```

- [ ] **Step 3: Criar `frontend/screens/admin/AdminShell.jsx`**

```jsx
import './adminTokens.css'
import './AdminShell.css'

// SVG inline em vez de emoji: emoji na navegação muda de desenho a cada sistema
// e é o que mais entrega "template genérico" num painel.
const ICONS = {
  overview: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  guests: 'M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z',
  sends: 'M3 20.5 21 12 3 3.5 3 10l12 2-12 2v6.5Z',
}

function AdminShell({
  section,
  sections,
  title,
  onSection,
  onRefresh,
  refreshing,
  onLogout,
  children,
}) {
  return (
    <div className="admin admin-shell">
      <nav className="admin-shell__nav" aria-label="Seções do painel">
        <p className="admin-shell__brand">Painel do convite</p>

        <ul className="admin-shell__list">
          {sections.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`admin-shell__link${section === item.id ? ' is-active' : ''}`}
                onClick={() => onSection(item.id)}
                aria-current={section === item.id ? 'page' : undefined}
              >
                <svg className="admin-shell__icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICONS[item.id]} fill="currentColor" />
                </svg>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* /confirmacao e não /, senão o organizador cai no vídeo de abertura. */}
        <a className="admin-shell__see-invite" href="/confirmacao/">
          Ver o convite
        </a>
      </nav>

      <header className="admin-shell__top">
        <h1 className="admin-shell__title">{title}</h1>
        <div className="admin-shell__actions">
          <button
            type="button"
            className="admin-shell__action"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
          <button
            type="button"
            className="admin-shell__action admin-shell__action--ghost"
            onClick={onLogout}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="admin-shell__content">{children}</main>
    </div>
  )
}

export default AdminShell
```

- [ ] **Step 4: Criar `frontend/screens/admin/AdminShell.css`**

```css
.admin-shell {
  min-height: 100svh;
  display: grid;
  grid-template-columns: var(--admin-sidebar) 1fr;
  grid-template-rows: var(--admin-topbar) 1fr;
  grid-template-areas:
    'nav top'
    'nav content';
}

.admin-shell__nav {
  grid-area: nav;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 12px;
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-line);
}

.admin-shell__brand {
  padding: 0 10px 14px;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--admin-muted);
}

.admin-shell__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-shell__link {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--admin-muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.admin-shell__link:hover {
  background: var(--admin-surface-2);
  color: var(--admin-text);
}

/* O dourado marca a seção atual e nada mais na navegação — é o único ponto de
   cor forte, então não compete com os números do conteúdo. */
.admin-shell__link.is-active {
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}

.admin-shell__icon {
  width: 18px;
  height: 18px;
  flex: none;
}

.admin-shell__see-invite {
  margin-top: auto;
  padding: 10px;
  font-size: 13px;
  color: var(--admin-muted);
  text-decoration: none;
}

.admin-shell__see-invite:hover {
  color: var(--admin-text);
}

.admin-shell__top {
  grid-area: top;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-line);
}

.admin-shell__title {
  margin: 0;
  font-family: var(--sans);
  font-size: 17px;
  font-weight: 600;
  color: var(--admin-text);
}

.admin-shell__actions {
  display: flex;
  gap: 8px;
}

.admin-shell__action {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid var(--admin-line);
  background: var(--admin-surface-2);
  color: var(--admin-text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.admin-shell__action:hover:not(:disabled) {
  border-color: var(--admin-purple);
}

.admin-shell__action:disabled {
  opacity: 0.55;
  cursor: default;
}

.admin-shell__action--ghost {
  background: transparent;
  color: var(--admin-muted);
}

.admin-shell__content {
  grid-area: content;
  padding: 20px;
  overflow-x: auto;
}

/* No celular a sidebar vira barra inferior: mandar convite pelo WhatsApp é
   tarefa de telefone, e um menu escondido atrás de hambúrguer atrapalharia
   justamente a seção que mais se usa com o polegar. */
@media (max-width: 767px) {
  .admin-shell {
    grid-template-columns: 1fr;
    grid-template-rows: var(--admin-topbar) 1fr auto;
    grid-template-areas:
      'top'
      'content'
      'nav';
  }

  .admin-shell__nav {
    position: sticky;
    bottom: 0;
    flex-direction: row;
    align-items: center;
    gap: 0;
    padding: 6px;
    min-height: var(--admin-bottombar);
    border-right: 0;
    border-top: 1px solid var(--admin-line);
  }

  .admin-shell__brand,
  .admin-shell__see-invite {
    display: none;
  }

  .admin-shell__list {
    flex: 1;
    flex-direction: row;
  }

  .admin-shell__list li {
    flex: 1;
  }

  .admin-shell__link {
    flex-direction: column;
    gap: 2px;
    min-height: 52px;
    justify-content: center;
    font-size: 12px;
    text-align: center;
  }

  .admin-shell__content {
    padding: 14px;
  }
}
```

- [ ] **Step 5: Criar `frontend/screens/admin/LoginCard.jsx`**

```jsx
import { useState } from 'react'
import './adminTokens.css'
import './LoginCard.css'

function LoginCard({ onSubmit, notice }) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    try {
      await onSubmit(password)
      // A senha sai do state assim que vira token: daqui pra frente quem
      // autentica é o token, e não há motivo para ela continuar em memória.
      setPassword('')
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.message)
    }
  }

  return (
    <div className="admin login-card__wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-card__title">Painel do convite</h1>

        {notice && <p className="login-card__notice">{notice}</p>}

        <label className="login-card__label" htmlFor="admin-password">
          Senha
        </label>
        <input
          id="admin-password"
          type="password"
          className="login-card__input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        {status === 'error' && <p className="login-card__error">{errorMessage}</p>}

        <button type="submit" className="login-card__submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default LoginCard
```

- [ ] **Step 6: Criar `frontend/screens/admin/LoginCard.css`**

```css
.login-card__wrap {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 26px 24px;
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
}

.login-card__title {
  margin: 0 0 6px;
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 600;
  color: var(--admin-text);
}

.login-card__notice {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 13px;
}

.login-card__label {
  font-size: 13px;
  color: var(--admin-muted);
}

.login-card__input {
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--admin-line);
  border-radius: 9px;
  background: var(--admin-bg);
  color: var(--admin-text);
  font: inherit;
}

.login-card__input:focus {
  outline: 2px solid var(--admin-purple);
  outline-offset: 1px;
}

.login-card__error {
  font-size: 13px;
  color: var(--admin-no);
}

.login-card__submit {
  min-height: 44px;
  margin-top: 6px;
  border: 0;
  border-radius: 9px;
  background: var(--admin-accent);
  color: #2a1f12;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.login-card__submit:disabled {
  opacity: 0.6;
  cursor: default;
}
```

- [ ] **Step 7: Criar `frontend/screens/admin/OverviewSection.jsx`**

```jsx
import { useMemo } from 'react'
import { GROUP_STATUS, totals } from './groupStats.js'
import './adminTokens.css'
import './OverviewSection.css'

function Stat({ value, label, tone }) {
  return (
    <div className={`overview__stat${tone ? ` overview__stat--${tone}` : ''}`}>
      <span className="overview__stat-value">{value}</span>
      <span className="overview__stat-label">{label}</span>
    </div>
  )
}

function OverviewSection({ groups, onFilter }) {
  const stats = useMemo(() => totals(groups), [groups])

  return (
    <div className="overview">
      <section className="overview__block">
        <h2 className="overview__heading">Pessoas</h2>
        <div className="overview__stats">
          <Stat value={stats.yes} label="confirmadas" tone="yes" />
          <Stat value={stats.no} label="não vêm" tone="no" />
          <Stat value={stats.pending} label="sem resposta" tone="pending" />
          <Stat value={stats.people} label="cadastradas" />
        </div>
      </section>

      <section className="overview__block">
        <h2 className="overview__heading">Grupos</h2>
        <div className="overview__stats">
          <Stat value={stats.groups} label="cadastrados" />
          <Stat value={stats.answeredGroups} label="responderam" />
          <Stat value={stats.sent} label="convite enviado" />
        </div>
      </section>

      <section className="overview__block">
        <h2 className="overview__heading">Precisa da sua ação</h2>
        <div className="overview__actions">
          <button
            type="button"
            className="overview__action"
            onClick={() => onFilter(GROUP_STATUS.naoEnviado)}
            disabled={stats.notSent === 0}
          >
            <span className="overview__action-value">{stats.notSent}</span>
            <span className="overview__action-label">
              {stats.notSent === 1 ? 'grupo sem convite enviado' : 'grupos sem convite enviado'}
            </span>
          </button>

          <button
            type="button"
            className="overview__action"
            onClick={() => onFilter(GROUP_STATUS.aguardando)}
            disabled={stats.waiting === 0}
          >
            <span className="overview__action-value">{stats.waiting}</span>
            <span className="overview__action-label">
              {stats.waiting === 1
                ? 'grupo recebeu e não respondeu'
                : 'grupos receberam e não responderam'}
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}

export default OverviewSection
```

- [ ] **Step 8: Criar `frontend/screens/admin/OverviewSection.css`**

```css
.overview {
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 1000px;
}

.overview__heading {
  margin: 0 0 10px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--admin-muted);
}

.overview__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--admin-gap);
}

.overview__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px;
  border: 1px solid var(--admin-line);
  border-left: 3px solid var(--admin-line);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
}

/* A borda colorida à esquerda carrega o significado; o número fica claro em
   todos os cartões, para poder ser lido de relance sem o olho caçar cor. */
.overview__stat--yes { border-left-color: var(--admin-yes); }
.overview__stat--no { border-left-color: var(--admin-no); }
.overview__stat--pending { border-left-color: var(--admin-pending); }

.overview__stat-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.overview__stat-label {
  font-size: 13px;
  color: var(--admin-muted);
}

.overview__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--admin-gap);
}

.overview__action {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  color: var(--admin-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.overview__action:hover:not(:disabled) {
  border-color: var(--admin-accent);
}

.overview__action:disabled {
  opacity: 0.45;
  cursor: default;
}

.overview__action-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--admin-accent);
  font-variant-numeric: tabular-nums;
}

.overview__action-label {
  font-size: 13px;
  color: var(--admin-muted);
}
```

- [ ] **Step 9: Reescrever `frontend/screens/AdminPage.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { adminLogin, adminLogout, fetchGroups, getToken, SessionExpiredError } from '../api.js'
import AdminShell from './admin/AdminShell.jsx'
import LoginCard from './admin/LoginCard.jsx'
import OverviewSection from './admin/OverviewSection.jsx'
import './AdminPage.css'

// O menu cresce junto com as seções: item que não leva a lugar nenhum é o que
// faz uma sidebar parecer enfeite.
const SECTIONS = [{ id: 'overview', label: 'Visão geral' }]

const TITLES = {
  overview: 'Visão geral',
}

function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [notice, setNotice] = useState('')
  const [groups, setGroups] = useState([])
  const [section, setSection] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setRefreshing(true)
    setErrorMessage('')
    try {
      const data = await fetchGroups()
      setGroups(data.groups)
      setAuthed(true)
      setNotice('')
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setAuthed(false)
        setNotice(err.message)
      } else {
        setErrorMessage(err.message)
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  // O token vive no sessionStorage, então um F5 não deve pedir a senha de novo —
  // mas quem decide se ele ainda vale é o servidor, não o navegador.
  useEffect(() => {
    if (getToken()) load()
  }, [load])

  const handleLogin = async (password) => {
    await adminLogin({ password })
    await load()
  }

  const handleLogout = async () => {
    await adminLogout()
    setAuthed(false)
    setGroups([])
    setNotice('')
  }

  if (!authed) {
    return <LoginCard onSubmit={handleLogin} notice={notice} />
  }

  return (
    <AdminShell
      section={section}
      sections={SECTIONS}
      title={TITLES[section]}
      onSection={setSection}
      onRefresh={load}
      refreshing={refreshing}
      onLogout={handleLogout}
    >
      {errorMessage && <p className="admin-page__error">{errorMessage}</p>}
      {section === 'overview' && <OverviewSection groups={groups} onFilter={() => setSection('overview')} />}
    </AdminShell>
  )
}

export default AdminPage
```

- [ ] **Step 10: Reescrever `frontend/screens/AdminPage.css`**

O arquivo antigo inteiro sai (era o layout do painel claro sobre `--page-sky`). Fica só:

```css
/* O painel tem visual próprio, definido em screens/admin/. Aqui sobra o que é
   da página: o fundo escuro cobrindo a tela toda, inclusive atrás do login. */
body:has(.admin) {
  background: var(--admin-bg, #171326);
}

.admin-page__error {
  margin-bottom: var(--admin-gap);
  padding: 10px 12px;
  border-radius: var(--admin-radius);
  background: rgba(224, 122, 143, 0.14);
  color: var(--admin-no);
  font-size: 14px;
}
```

- [ ] **Step 11: Lint**

```bash
cd frontend && npm run lint
```

Esperado: sem erros.

- [ ] **Step 12: Verificar no navegador**

Com o backend no ar e `npm run dev` rodando, abra `http://localhost:3000/admin/`:

1. Aparece o cartão de senha sobre fundo escuro, **sem** sparkles.
2. Senha errada → "Senha incorreta." e nada mais acontece.
3. Senha certa → entra no painel; a sidebar mostra "Visão geral" marcada em dourado.
4. Os números batem com a família criada na Task 11 (3 pessoas cadastradas, 2 confirmadas, 1 não vem, 0 sem resposta, 1 grupo, 1 respondeu).
5. "Precisa da sua ação" mostra **1 grupo sem convite enviado** (ninguém marcou o check ainda).
6. **F5 não pede a senha de novo** (token no `sessionStorage`); fechar a aba e reabrir **pede**.
7. "Sair" volta ao login.
8. Reduza a janela para 375px de largura: a sidebar vira **barra inferior** com o mesmo item, e o conteúdo continua legível sem rolagem horizontal.

No console do navegador, confirme que nenhuma requisição leva a senha:

```
Aba Network → clique em /api/admin/groups → Headers → deve haver "Authorization: Bearer ..." e nenhum campo "password".
```

- [ ] **Step 13: Commit**

```bash
git add frontend/screens/AdminPage.jsx frontend/screens/AdminPage.css frontend/screens/admin
git commit -m "feat: painel vira dashboard com sidebar, login por token e visao geral"
```

---

### Task 13: Seção Convidados — cadastrar, editar, apagar, filtrar e exportar

**Files:**
- Create: `frontend/screens/admin/format.js`, `InviteActions.jsx`, `InviteActions.css`, `GroupForm.jsx`, `GroupForm.css`, `GroupRow.jsx`, `GroupRow.css`, `GuestsSection.jsx`, `GuestsSection.css`
- Modify: `frontend/screens/AdminPage.jsx` (acrescenta a seção ao menu e liga o filtro da Visão geral)

**Interfaces:**
- Consumes: `createGroup`, `updateGroup`, `deleteGroup`, `setMessageSent` (Task 10); `groupStatus`, `GROUP_STATUS`, `GROUP_STATUS_LABEL`, `responsibleName`, `groupScore` (Task 10); `inviteMessage`, `whatsappUrl` (Task 10).
- Produces:
  - `format.js`: `formatDateTime(value): string`, `formatPhone(value): string`
  - `<InviteActions group={obj} name={string} />` — reusado pela Task 14
  - `<GroupForm group={obj|null} onSubmit={fn} onCancel={fn} />`
  - `<GroupRow group expanded onToggle onEdit onDelete onToggleSent busy />`
  - `<GuestsSection groups filter onFilterChange onReload />`

- [ ] **Step 1: Criar `frontend/screens/admin/format.js`**

```js
// O MySQL devolve "2026-08-20 17:07:39". Formatar na mão evita o new Date() com
// string sem timezone, que nem todo navegador interpreta igual.
export function formatDateTime(value) {
  if (!value) return '—'
  const [date, time = ''] = String(value).split(' ')
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return value
  return time ? `${day}/${month}/${year} ${time.slice(0, 5)}` : `${day}/${month}/${year}`
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D+/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return digits
}
```

- [ ] **Step 2: Criar `frontend/screens/admin/InviteActions.jsx`**

```jsx
import { useState } from 'react'
import { inviteMessage, whatsappUrl } from './inviteMessage.js'
import './InviteActions.css'

// O GUID nunca aparece escrito na tela: ele é credencial, não informação. Sai
// daqui só dentro do texto copiado e do href do WhatsApp.
function InviteActions({ group, name }) {
  const [copied, setCopied] = useState(false)

  const message = inviteMessage({ name, guid: group.guid })
  const url = whatsappUrl({ phone: group.phone, message })

  const handleCopy = () => {
    navigator.clipboard
      .writeText(message)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <span className="invite-actions">
      <button type="button" className="invite-actions__button" onClick={handleCopy}>
        {copied ? 'Copiado ✓' : 'Copiar mensagem'}
      </button>

      {url ? (
        <a
          className="invite-actions__button invite-actions__button--wa"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      ) : (
        <span className="invite-actions__muted">sem telefone</span>
      )}
    </span>
  )
}

export default InviteActions
```

- [ ] **Step 3: Criar `frontend/screens/admin/InviteActions.css`**

```css
.invite-actions {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.invite-actions__button {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  background: var(--admin-surface-2);
  color: var(--admin-text);
  font: inherit;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
}

.invite-actions__button:hover {
  border-color: var(--admin-accent);
}

.invite-actions__button--wa {
  color: var(--admin-yes);
}

.invite-actions__muted {
  align-self: center;
  font-size: 12px;
  color: var(--admin-muted);
}
```

- [ ] **Step 4: Criar `frontend/screens/admin/GroupForm.jsx`**

```jsx
import { useEffect, useState } from 'react'
import './adminTokens.css'
import './GroupForm.css'

function GroupForm({ group, onSubmit, onCancel }) {
  const [responsible, setResponsible] = useState('')
  const [phone, setPhone] = useState('')
  const [companions, setCompanions] = useState([])
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Recarrega os campos quando muda o grupo editado — inclusive ao voltar para
  // o cadastro, que é `group === null`. Sem isso, editar um grupo e cancelar
  // deixaria os campos sujos com os dados dele.
  useEffect(() => {
    const members = (group && group.members) || []
    const head = members.find((member) => member.is_responsible)

    setResponsible(head ? head.name : '')
    setPhone((group && group.phone) || '')
    setCompanions(
      members
        .filter((member) => !member.is_responsible)
        .map((member) => ({ id: member.id, name: member.name })),
    )
    setErrorMessage('')
  }, [group])

  const changeCompanion = (index, name) => {
    setCompanions((prev) => prev.map((item, i) => (i === index ? { ...item, name } : item)))
  }

  const removeCompanion = (index) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    try {
      await onSubmit({
        responsible: responsible.trim(),
        phone: phone.trim(),
        // Acompanhante que já existe vai com o id: é isso que faz o backend
        // renomear em vez de recriar, preservando quem já respondeu.
        companions: companions
          .filter((item) => item.name.trim() !== '')
          .map((item) => (item.id ? { id: item.id, name: item.name.trim() } : { name: item.name.trim() })),
      })
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="group-form" onSubmit={handleSubmit}>
      <h2 className="group-form__title">{group ? 'Editar grupo' : 'Cadastrar grupo'}</h2>

      <div className="group-form__fields">
        <label className="group-form__field">
          <span className="group-form__label">Responsável</span>
          <input
            className="group-form__input"
            value={responsible}
            onChange={(event) => setResponsible(event.target.value)}
            placeholder="Nome de quem recebe o convite"
            maxLength={120}
            required
          />
        </label>

        <label className="group-form__field">
          <span className="group-form__label">
            WhatsApp <span className="group-form__optional">(opcional)</span>
          </span>
          <input
            className="group-form__input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(21) 96539-7036"
            inputMode="tel"
            maxLength={20}
          />
        </label>
      </div>

      <p className="group-form__label">Acompanhantes</p>

      {companions.length === 0 && (
        <p className="group-form__empty">Ninguém além do responsável, por enquanto.</p>
      )}

      <ul className="group-form__companions">
        {companions.map((companion, index) => (
          <li className="group-form__companion" key={companion.id || `novo-${index}`}>
            <input
              className="group-form__input"
              value={companion.name}
              onChange={(event) => changeCompanion(index, event.target.value)}
              placeholder="Nome do acompanhante"
              maxLength={120}
            />
            <button
              type="button"
              className="group-form__remove"
              onClick={() => removeCompanion(index)}
              aria-label={`Remover ${companion.name || 'acompanhante'}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="group-form__add"
        onClick={() => setCompanions((prev) => [...prev, { id: 0, name: '' }])}
      >
        + Adicionar acompanhante
      </button>

      {errorMessage && <p className="group-form__error">{errorMessage}</p>}

      <div className="group-form__actions">
        <button type="submit" className="group-form__submit" disabled={saving}>
          {saving ? 'Salvando…' : group ? 'Salvar alterações' : 'Cadastrar grupo'}
        </button>
        {group && (
          <button type="button" className="group-form__cancel" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export default GroupForm
```

- [ ] **Step 5: Criar `frontend/screens/admin/GroupForm.css`**

```css
.group-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  margin-bottom: var(--admin-gap);
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
}

.group-form__title {
  margin: 0;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
}

.group-form__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.group-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-form__label {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--admin-muted);
}

.group-form__optional {
  text-transform: none;
  letter-spacing: 0;
}

.group-form__input {
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  background: var(--admin-bg);
  color: var(--admin-text);
  font: inherit;
}

.group-form__input:focus {
  outline: 2px solid var(--admin-purple);
  outline-offset: 1px;
}

.group-form__empty {
  font-size: 13px;
  color: var(--admin-muted);
}

.group-form__companions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-form__companion {
  display: flex;
  gap: 8px;
}

.group-form__remove {
  flex: none;
  width: 40px;
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  background: transparent;
  color: var(--admin-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.group-form__remove:hover {
  color: var(--admin-no);
  border-color: var(--admin-no);
}

.group-form__add {
  align-self: flex-start;
  min-height: 36px;
  padding: 0 12px;
  border: 1px dashed var(--admin-line);
  border-radius: 8px;
  background: transparent;
  color: var(--admin-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.group-form__add:hover {
  color: var(--admin-text);
  border-color: var(--admin-purple);
}

.group-form__error {
  font-size: 13px;
  color: var(--admin-no);
}

.group-form__actions {
  display: flex;
  gap: 8px;
}

.group-form__submit {
  min-height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: var(--admin-accent);
  color: #2a1f12;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.group-form__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.group-form__cancel {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid var(--admin-line);
  border-radius: 9px;
  background: transparent;
  color: var(--admin-muted);
  font: inherit;
  cursor: pointer;
}
```

- [ ] **Step 6: Criar `frontend/screens/admin/GroupRow.jsx`**

```jsx
import InviteActions from './InviteActions.jsx'
import { GROUP_STATUS_LABEL, groupScore, groupStatus, responsibleName } from './groupStats.js'
import { formatDateTime, formatPhone } from './format.js'
import './GroupRow.css'

const STATUS_TEXT = {
  yes: 'vem',
  no: 'não vem',
  pending: 'não respondeu',
}

function GroupRow({ group, expanded, onToggle, onEdit, onDelete, onToggleSent, busy }) {
  const name = responsibleName(group)
  const score = groupScore(group)
  const status = groupStatus(group)

  return (
    <>
      <tr className="group-row">
        <td className="group-row__name">
          <button type="button" className="group-row__toggle" onClick={onToggle} aria-expanded={expanded}>
            <span className="group-row__caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
            {name}
          </button>
          {group.phone && <span className="group-row__phone">{formatPhone(group.phone)}</span>}
        </td>

        <td className="group-row__num">{score.total}</td>

        <td className="group-row__score">
          <span className="group-row__score-yes">{score.yes}</span>
          <span className="group-row__score-sep">/</span>
          <span>{score.total}</span>
        </td>

        <td>
          <span className={`group-row__pill group-row__pill--${status}`}>
            {GROUP_STATUS_LABEL[status]}
          </span>
        </td>

        {/* O código curto aparece: é o que o organizador dita por telefone
            quando alguém perde o link. O GUID, não. */}
        <td className="group-row__code">{group.short_code}</td>

        <td>
          <label className="group-row__sent">
            <input
              type="checkbox"
              checked={Boolean(group.message_sent_at)}
              onChange={(event) => onToggleSent(event.target.checked)}
              disabled={busy}
            />
            <span>{group.message_sent_at ? formatDateTime(group.message_sent_at) : 'não enviado'}</span>
          </label>
        </td>

        <td className="group-row__actions">
          <InviteActions group={group} name={name} />
          <button type="button" className="group-row__button" onClick={onEdit}>
            Editar
          </button>
          <button type="button" className="group-row__button group-row__button--danger" onClick={onDelete}>
            Apagar
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="group-row__details">
          <td colSpan={7}>
            <ul className="group-row__members">
              {group.members.map((member) => (
                <li className="group-row__member" key={member.id}>
                  <span className={`group-row__dot group-row__dot--${member.status}`} aria-hidden="true" />
                  <span className="group-row__member-name">{member.name}</span>
                  {member.is_responsible && <span className="group-row__tag">responsável</span>}
                  <span className={`group-row__member-status group-row__member-status--${member.status}`}>
                    {STATUS_TEXT[member.status]}
                  </span>
                  <span className="group-row__member-date">{formatDateTime(member.responded_at)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}

export default GroupRow
```

- [ ] **Step 7: Criar `frontend/screens/admin/GroupRow.css`**

```css
.group-row > td {
  padding: 10px 12px;
  border-top: 1px solid var(--admin-line);
  vertical-align: middle;
}

.group-row__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  border: 0;
  background: transparent;
  color: var(--admin-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.group-row__caret {
  color: var(--admin-muted);
}

.group-row__phone {
  display: block;
  font-size: 12px;
  color: var(--admin-muted);
}

.group-row__num,
.group-row__score {
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.group-row__score-yes {
  font-weight: 700;
  color: var(--admin-yes);
}

.group-row__score-sep {
  color: var(--admin-muted);
  margin: 0 2px;
}

.group-row__pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-size: 12px;
  white-space: nowrap;
}

.group-row__pill--nao-enviado { color: var(--admin-muted); }
.group-row__pill--aguardando { color: var(--admin-accent); }
.group-row__pill--parcial { color: var(--admin-purple); }
.group-row__pill--respondido { color: var(--admin-yes); }

.group-row__code {
  font-family: var(--admin-mono);
  letter-spacing: 0.12em;
  color: var(--admin-muted);
}

.group-row__sent {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--admin-muted);
  cursor: pointer;
}

.group-row__sent input {
  width: 18px;
  height: 18px;
  accent-color: var(--admin-accent);
}

.group-row__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.group-row__button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  background: transparent;
  color: var(--admin-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.group-row__button:hover {
  color: var(--admin-text);
  border-color: var(--admin-purple);
}

.group-row__button--danger:hover {
  color: var(--admin-no);
  border-color: var(--admin-no);
}

.group-row__details > td {
  padding: 0 12px 12px 34px;
  background: var(--admin-surface-2);
}

.group-row__members {
  list-style: none;
  margin: 0;
  padding: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-row__member {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 14px;
}

.group-row__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}

.group-row__dot--yes { background: var(--admin-yes); }
.group-row__dot--no { background: var(--admin-no); }
.group-row__dot--pending { background: var(--admin-pending); }

.group-row__tag {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 11px;
}

.group-row__member-status--yes { color: var(--admin-yes); }
.group-row__member-status--no { color: var(--admin-no); }
.group-row__member-status--pending { color: var(--admin-pending); }

.group-row__member-date {
  margin-left: auto;
  font-size: 12px;
  color: var(--admin-muted);
}
```

- [ ] **Step 8: Criar `frontend/screens/admin/GuestsSection.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { createGroup, deleteGroup, setMessageSent, updateGroup } from '../../api.js'
import GroupForm from './GroupForm.jsx'
import GroupRow from './GroupRow.jsx'
import { GROUP_STATUS, GROUP_STATUS_LABEL, groupStatus, responsibleName } from './groupStats.js'
import { formatDateTime, formatPhone } from './format.js'
import './GuestsSection.css'

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: GROUP_STATUS.naoEnviado, label: GROUP_STATUS_LABEL[GROUP_STATUS.naoEnviado] },
  { id: GROUP_STATUS.aguardando, label: GROUP_STATUS_LABEL[GROUP_STATUS.aguardando] },
  { id: GROUP_STATUS.parcial, label: GROUP_STATUS_LABEL[GROUP_STATUS.parcial] },
  { id: GROUP_STATUS.respondido, label: GROUP_STATUS_LABEL[GROUP_STATUS.respondido] },
]

const STATUS_CSV = { yes: 'vem', no: 'nao vem', pending: 'nao respondeu' }

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function GuestsSection({ groups, filter, onFilterChange, onReload }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [expandedId, setExpandedId] = useState(0)
  const [busyId, setBusyId] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (groups || []).filter((group) => {
      if (filter !== 'todos' && groupStatus(group) !== filter) return false
      if (!term) return true
      return group.members.map((member) => member.name).join(' ').toLowerCase().includes(term)
    })
  }, [groups, filter, search])

  const run = async (action) => {
    setErrorMessage('')
    try {
      await action()
      await onReload()
    } catch (err) {
      setErrorMessage(err.message)
      throw err
    }
  }

  const handleSubmit = async (values) => {
    if (editing) {
      await run(() => updateGroup({ id: editing.id, ...values }))
      setEditing(null)
      return
    }
    await run(() => createGroup(values))
  }

  const handleDelete = (group) => {
    // confirm() nativo porque apagar é irreversível e leva os convidados junto:
    // um clique errado numa lista densa não pode custar uma família inteira.
    if (!window.confirm(`Apagar o grupo de ${responsibleName(group)} e todos os convidados dele?`)) {
      return
    }
    run(() => deleteGroup({ id: group.id })).catch(() => {})
  }

  const handleToggleSent = (group, sent) => {
    setBusyId(group.id)
    run(() => setMessageSent({ id: group.id, sent }))
      .catch(() => {})
      .finally(() => setBusyId(0))
  }

  const handleExportCsv = () => {
    const header = [
      'Responsavel',
      'Codigo curto',
      'Telefone',
      'Pessoa',
      'E responsavel',
      'Status',
      'Respondido em',
      'Convite enviado em',
    ]

    // Uma linha por pessoa: é assim que dá para somar e filtrar no Excel. E sem
    // o GUID de propósito — planilha circula por email e grupo, e quem tem o
    // GUID confirma presença pela família.
    const rows = []
    filtered.forEach((group) => {
      const head = responsibleName(group)
      group.members.forEach((member) => {
        rows.push([
          head,
          group.short_code,
          formatPhone(group.phone),
          member.name,
          member.is_responsible ? 'sim' : 'nao',
          STATUS_CSV[member.status],
          formatDateTime(member.responded_at),
          formatDateTime(group.message_sent_at),
        ])
      })
    })

    // BOM + ponto e vírgula: é assim que o Excel em pt-BR abre com acento certo.
    const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'convidados.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="guests">
      <GroupForm group={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />

      <div className="guests__toolbar">
        <input
          className="guests__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome…"
          autoComplete="off"
        />

        <div className="guests__filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`guests__filter${filter === item.id ? ' is-active' : ''}`}
              onClick={() => onFilterChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="guests__export"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
        >
          Exportar CSV
        </button>
      </div>

      {errorMessage && <p className="guests__error">{errorMessage}</p>}

      {(filter !== 'todos' || search) && (
        <p className="guests__note">
          Mostrando {filtered.length} de {groups.length} grupos · o CSV exporta só o que está
          filtrado.
        </p>
      )}

      <div className="guests__table-wrap">
        <table className="guests__table">
          <thead>
            <tr>
              <th>Responsável</th>
              <th className="guests__num">Pessoas</th>
              <th className="guests__num">Confirmados</th>
              <th>Status</th>
              <th>Código</th>
              <th>Convite enviado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                expanded={expandedId === group.id}
                busy={busyId === group.id}
                onToggle={() => setExpandedId(expandedId === group.id ? 0 : group.id)}
                onEdit={() => setEditing(group)}
                onDelete={() => handleDelete(group)}
                onToggleSent={(sent) => handleToggleSent(group, sent)}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="guests__empty">
            {groups.length === 0
              ? 'Nenhum grupo cadastrado ainda. Comece pelo formulário acima.'
              : 'Nenhum grupo para esse filtro.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default GuestsSection
```

- [ ] **Step 9: Criar `frontend/screens/admin/GuestsSection.css`**

```css
.guests {
  max-width: 1200px;
}

.guests__toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
}

.guests__search {
  flex: 1 1 220px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--admin-line);
  border-radius: 9px;
  background: var(--admin-surface);
  color: var(--admin-text);
  font: inherit;
}

.guests__filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.guests__filter {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--admin-line);
  border-radius: 999px;
  background: transparent;
  color: var(--admin-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.guests__filter.is-active {
  background: var(--admin-accent-soft);
  border-color: var(--admin-accent);
  color: var(--admin-accent);
}

.guests__export {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--admin-line);
  border-radius: 9px;
  background: var(--admin-surface-2);
  color: var(--admin-text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.guests__export:disabled {
  opacity: 0.5;
  cursor: default;
}

.guests__error {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: var(--admin-radius);
  background: rgba(224, 122, 143, 0.14);
  color: var(--admin-no);
  font-size: 14px;
}

.guests__note {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--admin-muted);
}

/* A tabela é larga de propósito; quem rola na horizontal é este contêiner, não
   a página — barra horizontal no body deixa o painel desconfortável no celular. */
.guests__table-wrap {
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  overflow-x: auto;
}

.guests__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.guests__table th {
  padding: 10px 12px;
  text-align: left;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--admin-muted);
  white-space: nowrap;
}

.guests__num {
  text-align: center;
}

.guests__empty {
  padding: 22px 14px;
  text-align: center;
  color: var(--admin-muted);
  font-size: 14px;
}
```

- [ ] **Step 10: Ligar a seção no `frontend/screens/AdminPage.jsx`**

Acrescente o import e troque as duas constantes e o corpo do `AdminShell`:

```jsx
import GuestsSection from './admin/GuestsSection.jsx'
```

```jsx
const SECTIONS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'guests', label: 'Convidados' },
]

const TITLES = {
  overview: 'Visão geral',
  guests: 'Convidados',
}
```

Acrescente o state do filtro, junto dos outros:

```jsx
  const [filter, setFilter] = useState('todos')
```

E troque o conteúdo do `AdminShell`:

```jsx
      {errorMessage && <p className="admin-page__error">{errorMessage}</p>}

      {section === 'overview' && (
        <OverviewSection
          groups={groups}
          onFilter={(status) => {
            // O bloco "precisa da sua ação" leva para a lista já filtrada: é o
            // caminho que o organizador percorre toda vez que abre o painel.
            setFilter(status)
            setSection('guests')
          }}
        />
      )}

      {section === 'guests' && (
        <GuestsSection
          groups={groups}
          filter={filter}
          onFilterChange={setFilter}
          onReload={load}
        />
      )}
```

- [ ] **Step 11: Lint e build**

```bash
cd frontend && npm run lint
```

Esperado: sem erros.

Feche o `npm run dev` (os dois disputam `frontend/.next`) e rode:

```bash
cd frontend && npm run build
```

Esperado: build conclui. Este é o primeiro build verde desde a Task 10.

- [ ] **Step 12: Verificar no navegador**

Suba o `npm run dev` de novo e entre em `http://localhost:3000/admin/` → **Convidados**:

1. Cadastre "Carlos Souza" com telefone `(11) 98888-7777` e os acompanhantes "Bia Souza" e "Léo Souza". A linha aparece com **3 pessoas**, **0/3**, status **Não enviado** e um código de 6 caracteres.
2. Expandindo a linha, os três nomes aparecem com "não respondeu".
3. **Copiar mensagem** → cole num editor: o texto traz "Carlos Souza", a data, o traje e um link `?c=<guid>`; nenhum `{` sobrou.
4. **WhatsApp** abre `wa.me/5511988887777` com o texto preenchido. **Não envie.**
5. Marque o check de convite enviado: vira a data/hora e o status passa a **Aguardando**.
6. **Editar** o grupo, renomear "Bia Souza" para "Bia S. Souza" e salvar. Abra o link da família Silva (Task 11) e confirme que **as respostas dela continuam salvas** — a edição de um grupo não pode mexer no outro.
7. Filtro **Aguardando** mostra só Carlos; **Respondido** mostra só Ana; **Todos** mostra os dois.
8. Busca por "léo" acha o grupo do Carlos (busca também nos acompanhantes).
9. **Exportar CSV** com o filtro "Todos": abra o arquivo — uma linha por pessoa, acentos corretos, e **nenhuma coluna com o GUID**.
10. **Apagar** um grupo pede confirmação; recusando, nada acontece.
11. Em 375px de largura, a tabela rola dentro do próprio quadro e o `body` **não** rola na horizontal.

- [ ] **Step 13: Commit**

```bash
git add frontend/screens/admin frontend/screens/AdminPage.jsx
git commit -m "feat: secao de convidados com cadastro, edicao, filtros e exportacao"
```

---

### Task 14: Seção Envios — o checklist de celular

Tela própria porque é tarefa diferente: o organizador está no telefone disparando mensagem atrás de mensagem, e a tabela densa da seção Convidados atrapalha nessa hora.

**Files:**
- Create: `frontend/screens/admin/SendsSection.jsx`, `SendsSection.css`
- Modify: `frontend/screens/AdminPage.jsx` (terceiro item do menu)

**Interfaces:**
- Consumes: `setMessageSent` (Task 10); `InviteActions` (Task 13); `groupStatus`, `groupScore`, `responsibleName` (Task 10); `formatDateTime`, `formatPhone` (Task 13).
- Produces: `<SendsSection groups onReload />`.

- [ ] **Step 1: Criar `frontend/screens/admin/SendsSection.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { setMessageSent } from '../../api.js'
import InviteActions from './InviteActions.jsx'
import { GROUP_STATUS, groupScore, groupStatus, responsibleName } from './groupStats.js'
import { formatDateTime, formatPhone } from './format.js'
import './SendsSection.css'

function SendsSection({ groups, onReload }) {
  const [hideSent, setHideSent] = useState(true)
  const [busyId, setBusyId] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const visible = useMemo(() => {
    const list = groups || []
    if (!hideSent) return list
    return list.filter((group) => !group.message_sent_at)
  }, [groups, hideSent])

  const pending = (groups || []).filter((group) => !group.message_sent_at).length

  const handleToggle = async (group, sent) => {
    setBusyId(group.id)
    setErrorMessage('')
    try {
      await setMessageSent({ id: group.id, sent })
      await onReload()
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setBusyId(0)
    }
  }

  return (
    <div className="sends">
      <div className="sends__head">
        <p className="sends__count">
          {pending === 0
            ? 'Todos os convites já foram enviados 🎉'
            : `${pending} ${pending === 1 ? 'convite' : 'convites'} por enviar`}
        </p>

        <label className="sends__switch">
          <input
            type="checkbox"
            checked={hideSent}
            onChange={(event) => setHideSent(event.target.checked)}
          />
          <span>Esconder quem já recebeu</span>
        </label>
      </div>

      {errorMessage && <p className="sends__error">{errorMessage}</p>}

      <ul className="sends__list">
        {visible.map((group) => {
          const name = responsibleName(group)
          const score = groupScore(group)
          const status = groupStatus(group)

          return (
            <li className="sends__item" key={group.id}>
              <div className="sends__info">
                <p className="sends__name">{name}</p>
                <p className="sends__meta">
                  {score.total} {score.total === 1 ? 'pessoa' : 'pessoas'}
                  {group.phone ? ` · ${formatPhone(group.phone)}` : ' · sem telefone'}
                  {status === GROUP_STATUS.respondido || status === GROUP_STATUS.parcial
                    ? ` · ${score.yes} de ${score.total} confirmados`
                    : ''}
                </p>
              </div>

              <InviteActions group={group} name={name} />

              {/* O check é manual de propósito: copiar o texto não é ter
                  enviado. Se ele acendesse no copiar, o painel mostraria gente
                  marcada como avisada que nunca recebeu nada. */}
              <label className="sends__check">
                <input
                  type="checkbox"
                  checked={Boolean(group.message_sent_at)}
                  onChange={(event) => handleToggle(group, event.target.checked)}
                  disabled={busyId === group.id}
                />
                <span>
                  {group.message_sent_at ? `enviado ${formatDateTime(group.message_sent_at)}` : 'marcar como enviado'}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {visible.length === 0 && (
        <p className="sends__empty">
          {(groups || []).length === 0
            ? 'Cadastre um grupo na seção Convidados para começar.'
            : 'Nada por aqui — desmarque "esconder quem já recebeu" para ver a lista toda.'}
        </p>
      )}
    </div>
  )
}

export default SendsSection
```

- [ ] **Step 2: Criar `frontend/screens/admin/SendsSection.css`**

```css
.sends {
  max-width: 760px;
}

.sends__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.sends__count {
  font-size: 16px;
  font-weight: 600;
}

.sends__switch,
.sends__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--admin-muted);
  cursor: pointer;
}

.sends__switch input,
.sends__check input {
  width: 20px;
  height: 20px;
  accent-color: var(--admin-accent);
}

.sends__error {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: var(--admin-radius);
  background: rgba(224, 122, 143, 0.14);
  color: var(--admin-no);
  font-size: 14px;
}

.sends__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Cada item é um cartão inteiro e não uma linha de tabela: no celular, com o
   polegar, alvo grande e separação clara valem mais que densidade. */
.sends__item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px;
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
}

.sends__info {
  flex: 1 1 180px;
  min-width: 0;
}

.sends__name {
  font-weight: 600;
}

.sends__meta {
  font-size: 12px;
  color: var(--admin-muted);
}

.sends__empty {
  padding: 24px 10px;
  text-align: center;
  color: var(--admin-muted);
  font-size: 14px;
}

@media (max-width: 767px) {
  .sends__item {
    align-items: stretch;
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Ligar no `frontend/screens/AdminPage.jsx`**

```jsx
import SendsSection from './admin/SendsSection.jsx'
```

```jsx
const SECTIONS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'guests', label: 'Convidados' },
  { id: 'sends', label: 'Envios' },
]

const TITLES = {
  overview: 'Visão geral',
  guests: 'Convidados',
  sends: 'Envios',
}
```

E, depois do bloco de `GuestsSection`:

```jsx
      {section === 'sends' && <SendsSection groups={groups} onReload={load} />}
```

- [ ] **Step 4: Lint e build**

```bash
cd frontend && npm run lint
```

Com o `npm run dev` fechado:

```bash
cd frontend && npm run build
```

Esperado: os dois passam.

- [ ] **Step 5: Verificar no navegador, em modo celular**

Com o `npm run dev` no ar, abra `http://localhost:3000/admin/` e reduza a janela para **375px** antes de entrar em **Envios**:

1. A barra inferior mostra os três destinos e "Envios" fica marcado ao ser tocado.
2. A lista mostra só quem ainda não recebeu (a família Silva, marcada na Task 13, não aparece).
3. Desmarcando "Esconder quem já recebeu", ela aparece com "enviado dd/mm/aaaa hh:mm".
4. Os botões de copiar e WhatsApp ocupam a largura confortável do cartão e o alvo de toque é fácil de acertar.
5. Marcando o check de um grupo, o contador do topo diminui na hora.
6. Trocando para **Visão geral**, o número de "grupos sem convite enviado" bate com o contador de Envios.
7. Nenhuma rolagem horizontal no `body`.

- [ ] **Step 6: Commit**

```bash
git add frontend/screens/admin/SendsSection.jsx frontend/screens/admin/SendsSection.css frontend/screens/AdminPage.jsx
git commit -m "feat: secao de envios em formato checklist para uso no celular"
```

---

### Task 15: Documentação, correção do ambiente descrito e verificação final

Os documentos descrevem o fluxo por email e um XAMPP que não existe mais nesta máquina (`C:\xamppv2`). Deixar assim faria o próximo leitor — humano ou agente — trabalhar contra a realidade.

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `backend/DEPLOY.md`, `frontend/DEPLOY.md`

**Interfaces:**
- Consumes: tudo. Nada produz código.

- [ ] **Step 1: `README.md` — trocar a seção "Como o convite funciona"**

Substitua os itens 3 e 5 da lista por:

```markdown
3. **Confirmar presença** — quem cadastra os convidados é o organizador, pelo
   painel. Cada família recebe um link exclusivo (`/?c=<código>`) por WhatsApp;
   abrindo esse link, a pessoa vê os nomes do próprio grupo e marca, **um a
   um**, quem vai e quem não vai. Quem perder o link pode digitar o código curto
   de 6 caracteres que o organizador dita. Não existe auto-inscrição: quem não
   recebeu convite não entra na lista.
```

```markdown
5. **`/admin`** — painel do organizador, protegido por senha, em formato de
   dashboard com três seções: **Visão geral** (totais e o que precisa de ação),
   **Convidados** (cadastrar, editar, apagar, buscar, filtrar por status e
   exportar CSV) e **Envios** (checklist de celular com copiar mensagem, abrir
   WhatsApp e marcar o convite como enviado).
```

- [ ] **Step 2: `CLAUDE.md` — reescrever a seção "RSVP model"**

Troque a seção inteira por:

```markdown
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
```

Na lista de rotas do backend, troque as linhas do `RsvpController` e do
`AdminController` por:

```markdown
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
- `tests/` — runner sem Composer: `"C:/xampp/php/php.exe" backend/tests/run.php`.
  Bate na API por HTTP e trunca as tabelas, então recusa rodar se `DB_HOST` não
  for local. **Não subir esta pasta para produção.**
```

- [ ] **Step 3: `CLAUDE.md` — corrigir a seção "Ambiente local (armadilhas conhecidas)"**

A seção inteira descreve o `C:\xamppv2`, que não existe mais. Substitua por:

```markdown
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
```

- [ ] **Step 4: `backend/DEPLOY.md`**

Três mudanças:

1. Na seção "Rodar localmente", troque o passo da *junction* e da porta 3307 pelo texto do Step 3 acima (repositório dentro do `htdocs`, API em `/nivergio-api/backend/`, PHP CLI em `C:/xampp/php/php.exe`), e troque `"C:/xamppv2/php/php.exe" -m | grep pdo_mysql` por `"C:/xampp/php/php.exe" -m | grep pdo_mysql`.
2. Acrescente, na seção de produção, antes da lista de arquivos a subir:

```markdown
> ⚠️ **HTTPS é pré-requisito.** O painel autentica por token no header
> `Authorization`; em HTTP puro ele viaja legível e qualquer um na mesma rede
> copia a sessão. Confirme o SSL do domínio no cPanel antes de publicar.
>
> **Não suba a pasta `tests/`.** Ela trunca tabelas e não tem função em
> produção. O `.htaccess` dentro dela já nega acesso por HTTP, mas o certo é
> não subir.
```

3. Onde o documento manda rodar o `schema.sql`, acrescente:

```markdown
O `schema.sql` começa com `DROP TABLE IF EXISTS rsvps` — a tabela do modelo
antigo (auto-cadastro por email). Rodá-lo num banco que ainda tenha confirmações
do modelo antigo **apaga essas confirmações**, e não há como recuperá-las: nada
nelas tem correspondente no modelo novo.

**Ordem de publicação: schema → backend → frontend.** O inverso deixa o site
pedindo tabela que ainda não existe, e o convidado vê erro de servidor.
```

- [ ] **Step 5: `frontend/DEPLOY.md`**

Acrescente na seção de produção:

```markdown
Antes de publicar, abra `frontend/config.js` e troque `SITE_URL` pelo domínio
real (sem barra no fim). É dele que sai o link exclusivo de cada família na
mensagem do WhatsApp — deixando o valor de exemplo, todos os convites saem
apontando para lugar nenhum.
```

E, na seção de ambiente local:

```markdown
Crie `frontend/.env.local` com o alvo do proxy de dev:

```
API_PROXY_TARGET=http://localhost/nivergio-api/backend
```
```

- [ ] **Step 6: Rodar a suíte inteira do backend**

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

Esperado: `56 passaram, 0 falharam`.

- [ ] **Step 7: Lint e build do frontend**

```bash
cd frontend && npm run lint
```

Com o `npm run dev` fechado:

```bash
cd frontend && npm run build
```

Esperado: os dois passam, e `frontend/out/admin/index.html` existe (o `trailingSlash`).

```bash
ls frontend/out/admin/index.html frontend/out/confirmacao/index.html
```

- [ ] **Step 8: Conferir que nada sensível entrou no git**

```bash
git status --short && git log --oneline main..HEAD
```

```bash
git diff main..HEAD --name-only | grep -E "\.env" || echo "nenhum .env no diff"
```

Esperado: `nenhum .env no diff`.

```bash
git diff main..HEAD | grep -inE "ADMIN_PASSWORD=|DB_PASS=" || echo "nenhuma credencial no diff"
```

Esperado: `nenhuma credencial no diff` (a linha `ADMIN_PASSWORD=REPLACE_ME` do `.env.example` não muda nesta branch).

- [ ] **Step 9: Passagem final pelo fluxo inteiro**

Do zero, num banco limpo:

```bash
"C:/xampp/php/php.exe" backend/tests/run.php
```

Depois, no navegador: cadastre um grupo no painel → copie a mensagem → abra o link num aba anônima → marque as pessoas → volte ao painel e confira que a Visão geral, a tabela de Convidados e o checklist de Envios mostram o mesmo número.

- [ ] **Step 10: Commit**

```bash
git add README.md CLAUDE.md backend/DEPLOY.md frontend/DEPLOY.md
git commit -m "docs: documentar confirmacao por codigo de familia e corrigir o ambiente local"
```

---

## Depois do plano

O merge para a `main` fica com o `superpowers:finishing-a-development-branch`. Antes dele, dois lembretes que não são passos de código:

1. **`SITE_URL` em `frontend/config.js` ainda é `https://SEU-DOMINIO.com`.** Trocar pelo domínio real é obrigatório antes de gerar o build de produção.
2. **O `schema.sql` apaga a tabela `rsvps`.** Se o banco de produção já tiver confirmações do modelo antigo, elas se perdem — o que é a decisão registrada na spec, não um acidente.
