<?php

namespace App\Http;

class Request
{
    public static function method()
    {
        return $_SERVER['REQUEST_METHOD'];
    }

    public static function query($key, $default = '')
    {
        return isset($_GET[$key]) ? trim((string) $_GET[$key]) : $default;
    }

    public static function json()
    {
        $data = json_decode(file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }

    // O mod_rewrite da HostGator costuma descartar o header Authorization. Com
    // a linha E=HTTP_AUTHORIZATION no .htaccess ele reaparece com o prefixo
    // REDIRECT_. Ler os dois nomes é o que faz o painel funcionar tanto no
    // XAMPP quanto em produção — testar só localmente esconde esse problema.
    public static function bearerToken()
    {
        $header = '';
        foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $key) {
            if (!empty($_SERVER[$key])) {
                $header = (string) $_SERVER[$key];
                break;
            }
        }

        if (stripos($header, 'Bearer ') !== 0) {
            return '';
        }

        return trim(substr($header, 7));
    }

    public static function ip()
    {
        return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    }
}
