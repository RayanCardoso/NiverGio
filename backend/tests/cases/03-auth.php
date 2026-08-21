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
