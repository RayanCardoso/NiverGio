<?php

namespace App\Config;

// Carregador simples de .env — sem depender de Composer/pacotes externos,
// pra funcionar em qualquer hospedagem compartilhada assim que o .env existir.
class Env
{
    private static $vars = [];

    // Pode ser chamado mais de uma vez, e quem carrega primeiro vence. É assim
    // que o index.php deixa o ".env.local" (máquina do dev) sobrescrever o
    // ".env" (produção) — na HostGator só o ".env" existe e nada muda.
    public static function load($path)
    {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            $parts = explode('=', $line, 2);
            $key = trim($parts[0]);
            if ($key === '' || array_key_exists($key, self::$vars)) {
                continue;
            }
            self::$vars[$key] = isset($parts[1]) ? trim($parts[1]) : '';
        }
    }

    public static function get($key, $default = null)
    {
        return isset(self::$vars[$key]) ? self::$vars[$key] : $default;
    }
}
