<?php

namespace App\Database;

use App\Config\Env;
use App\Http\Response;
use PDO;
use PDOException;

class Connection
{
    private static $instance = null;

    public static function get()
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        // DB_PORT é opcional: na HostGator o MySQL atende na 3306 padrão, só o
        // ambiente local costuma precisar de outra porta.
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            Env::get('DB_HOST', 'localhost'),
            Env::get('DB_PORT', '3306'),
            Env::get('DB_NAME')
        );

        try {
            self::$instance = new PDO($dsn, Env::get('DB_USER'), Env::get('DB_PASS'), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            // A mensagem do PDO diz qual é o problema (senha, banco inexistente,
            // usuário sem acesso), mas cita credencial — fica só no log, nunca
            // na resposta.
            error_log('[nivergio-api] falha ao conectar: ' . $e->getMessage());
            Response::json(['error' => 'Falha ao conectar ao banco de dados.'], 500);
            exit;
        }

        return self::$instance;
    }
}
