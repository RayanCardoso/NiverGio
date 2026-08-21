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

    // Sem ancorar numa resposta que deu certo, as asserções abaixo passariam
    // até num 404: um corpo de erro também não contém telefone nenhum.
    check_same(200, $res['status'], 'status');
    check_same('yes', $res['body']['members'][0]['status'], 'a confirmacao deveria ter sido gravada');

    check(strpos($res['raw'], '21965397036') === false, 'telefone vazou na confirmacao');
    check(strpos($res['raw'], $group['short_code']) === false, 'codigo curto vazou na confirmacao');
});
