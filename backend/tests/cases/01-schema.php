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
