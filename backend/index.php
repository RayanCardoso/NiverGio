<?php

use App\Config\Env;
use App\Controllers\AdminController;
use App\Controllers\RsvpController;
use App\Http\Request;
use App\Http\Router;

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/src/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($file)) {
        require $file;
    }
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
$router->post('/admin', function () {
    (new AdminController())->list();
});

$route = isset($_GET['route']) ? '/' . trim($_GET['route'], '/') : '/';
$router->dispatch(Request::method(), $route);
