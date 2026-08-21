<?php

test('rota inexistente devolve 404 em JSON, nunca HTML de erro do PHP', function () {
    $res = http_call('GET', '/rota-que-nao-existe');
    check_same(404, $res['status'], 'status');
    check(is_array($res['body']), 'corpo deveria ser JSON, veio: ' . substr($res['raw'], 0, 200));
    check(isset($res['body']['error']), 'corpo deveria ter a chave "error"');
});
