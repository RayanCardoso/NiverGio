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
