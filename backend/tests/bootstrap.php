<?php

use App\Config\Env;

require __DIR__ . '/../src/autoload.php';

// Mesma ordem do index.php: o .env.local da máquina do dev vence o .env.
Env::load(__DIR__ . '/../.env.local');
Env::load(__DIR__ . '/../.env');

// Os testes truncam as tabelas. Se o .env apontar para um banco que não seja
// local, abortar: rodar isto contra a HostGator apagaria a lista de convidados
// da festa inteira.
$host = strtolower(trim((string) Env::get('DB_HOST', '')));
if ($host !== 'localhost' && $host !== '127.0.0.1') {
    fwrite(STDERR, "ABORTADO: DB_HOST nao e local. Os testes apagam dados.\n");
    exit(1);
}
