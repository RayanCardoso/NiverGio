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
