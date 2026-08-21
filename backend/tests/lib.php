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
