<?php

// Autoloader PSR-4 manual (o projeto não usa Composer): App\Foo\Bar vira
// src/Foo/Bar.php. Em arquivo próprio porque o index.php e o runner de testes
// precisam exatamente do mesmo — duplicar as duas cópias sairiam de sincronia.
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});
