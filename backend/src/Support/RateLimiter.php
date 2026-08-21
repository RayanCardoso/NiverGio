<?php

namespace App\Support;

use App\Database\Connection;
use App\Http\Request;

// Freio de força bruta no código curto (6 caracteres, ~916 milhões de
// combinações). O GUID do link não passa por aqui: quem tem o link já tem o
// segredo, e travar por IP puniria a família inteira atrás do mesmo Wi-Fi.
class RateLimiter
{
    const MAX_FAILURES = 10;
    const WINDOW_MINUTES = 15;
    const KEEP_HOURS = 1;

    public static function isBlocked()
    {
        $pdo = Connection::get();

        // Limpeza oportunista: não há cron na hospedagem compartilhada, então é
        // aqui que a tabela para de crescer. Os números interpolados no SQL são
        // constantes desta classe — nenhum valor de cliente entra no texto.
        $pdo->exec('DELETE FROM code_attempts WHERE attempted_at < NOW() - INTERVAL ' . self::KEEP_HOURS . ' HOUR');

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS total FROM code_attempts
             WHERE ip_hash = :ip AND attempted_at > NOW() - INTERVAL ' . self::WINDOW_MINUTES . ' MINUTE'
        );
        $stmt->execute(['ip' => self::ipHash()]);
        $row = $stmt->fetch();

        return (int) $row['total'] >= self::MAX_FAILURES;
    }

    public static function registerFailure()
    {
        $stmt = Connection::get()->prepare(
            'INSERT INTO code_attempts (ip_hash, attempted_at) VALUES (:ip, NOW())'
        );
        $stmt->execute(['ip' => self::ipHash()]);
    }

    // Guarda o hash e não o IP: dá para contar tentativas do mesmo visitante sem
    // manter um registro de quem abriu o convite.
    private static function ipHash()
    {
        return hash('sha256', Request::ip());
    }
}
