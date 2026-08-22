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
