<?php

namespace App\Auth;

use App\Config\Env;
use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;

// Sessão do painel: a senha é trocada uma vez por um token aleatório com prazo.
// O banco guarda só o SHA-256 do token, e o token viaja no header — não na URL,
// que apareceria no log de acesso do Apache e no histórico do navegador.
class AdminSession
{
    const LIFETIME_HOURS = 12;

    public static function login($password)
    {
        $expected = (string) Env::get('ADMIN_PASSWORD', '');

        // hash_equals compara em tempo constante. Sem isso o tempo de resposta
        // entrega quantos caracteres do começo da senha já estão certos.
        if ($expected === '' || !hash_equals($expected, (string) $password)) {
            return null;
        }

        $pdo = Connection::get();

        // Limpeza oportunista: não há cron na hospedagem compartilhada, então é
        // aqui que as sessões vencidas somem em vez de acumularem para sempre.
        $pdo->exec('DELETE FROM admin_sessions WHERE expires_at < NOW()');

        $token = bin2hex(random_bytes(32));

        // Vencimento vem do relógio do banco, não do PHP: é o mesmo NOW() com
        // que o isValid() compara. Com fusos diferentes entre PHP e MySQL na
        // hospedagem, a sessão duraria mais ou menos que as 12h combinadas.
        $expiresAt = $pdo
            ->query('SELECT DATE_ADD(NOW(), INTERVAL ' . self::LIFETIME_HOURS . ' HOUR) AS expires_at')
            ->fetch()['expires_at'];

        $stmt = $pdo->prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (:hash, :expires)');
        $stmt->execute(['hash' => hash('sha256', $token), 'expires' => $expiresAt]);

        return ['token' => $token, 'expires_at' => $expiresAt];
    }

    public static function logout()
    {
        $token = Request::bearerToken();
        if ($token === '') {
            return;
        }

        $stmt = Connection::get()->prepare('DELETE FROM admin_sessions WHERE token_hash = :hash');
        $stmt->execute(['hash' => hash('sha256', $token)]);
    }

    public static function isValid()
    {
        $token = Request::bearerToken();
        if ($token === '') {
            return false;
        }

        $stmt = Connection::get()->prepare(
            'SELECT 1 FROM admin_sessions WHERE token_hash = :hash AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['hash' => hash('sha256', $token)]);

        return (bool) $stmt->fetch();
    }

    // Primeira linha de toda rota do painel. Encerra a requisição em 401 em vez
    // de devolver um booleano: assim nenhum controller pode esquecer de checar
    // o retorno e servir dados sem sessão.
    public static function guard()
    {
        if (self::isValid()) {
            return;
        }

        Response::json(['error' => 'Sessão inválida ou expirada.'], 401);
        exit;
    }
}
