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
