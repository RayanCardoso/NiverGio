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
