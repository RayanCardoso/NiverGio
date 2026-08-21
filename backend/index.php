<?php

use App\Config\Env;
use App\Controllers\AdminAuthController;
use App\Controllers\GroupsController;
use App\Controllers\RsvpController;
use App\Http\Request;
use App\Http\Response;
use App\Http\Router;

require __DIR__ . '/src/autoload.php';

// A API só fala JSON: aviso ou stack trace impresso no corpo quebra o
// res.json() do front e ainda vaza caminho de arquivo do servidor. Então erro
// nenhum vai pra resposta — vai todo pro log de erros da conta (na HostGator,
// cPanel → Erros, ou o arquivo "error_log" que aparece ao lado do index.php).
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Sem isto, qualquer erro fora do connect — coluna que não existe, tabela que
// não existe, privilégio faltando no usuário do banco — vira fatal do PHP: o
// Apache devolve 500 de corpo vazio e não sobra pista nenhuma pra quem olha de
// fora. Aqui o motivo real fica no log e o cliente ainda recebe JSON.
set_exception_handler(function ($e) {
    error_log(sprintf(
        '[nivergio-api] %s: %s em %s:%d',
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));
    Response::json(['error' => 'Erro interno no servidor.'], 500);
});

// .env.local (opcional, só na máquina do dev) tem prioridade sobre o .env.
Env::load(__DIR__ . '/.env.local');
Env::load(__DIR__ . '/.env');

$router = new Router();
$router->get('/rsvp', function () {
    (new RsvpController())->lookup();
});
$router->post('/rsvp', function () {
    (new RsvpController())->save();
});
$router->post('/admin/login', function () {
    (new AdminAuthController())->login();
});
$router->post('/admin/logout', function () {
    (new AdminAuthController())->logout();
});
$router->get('/admin/groups', function () {
    (new GroupsController())->index();
});
$router->post('/admin/groups/create', function () {
    (new GroupsController())->create();
});

$route = isset($_GET['route']) ? '/' . trim($_GET['route'], '/') : '/';
$router->dispatch(Request::method(), $route);
