<?php

namespace App\Support;

use PDO;
use RuntimeException;

// Os dois códigos de um grupo. Ambos usam gerador criptográfico (random_bytes,
// random_int) e não rand()/uniqid(): o GUID é a única coisa que separa uma
// família da outra, então precisa ser inviável de adivinhar ou de prever a
// partir de um código já conhecido.
class Codes
{
    // Sem 0/O e sem 1/I: o código curto é ditado por telefone e anotado à mão.
    const SHORT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const SHORT_LENGTH = 6;
    const MAX_TRIES = 5;

    public static function guid()
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40); // versão 4
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80); // variante RFC 4122
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    public static function shortCode()
    {
        $last = strlen(self::SHORT_ALPHABET) - 1;
        $code = '';
        for ($i = 0; $i < self::SHORT_LENGTH; $i++) {
            $code .= self::SHORT_ALPHABET[random_int(0, $last)];
        }
        return $code;
    }

    // Sorteia até achar um par que ainda não está no banco. A chance de colisão
    // é ínfima, mas o índice UNIQUE existe justamente para não confiar nisso —
    // aqui a colisão vira novo sorteio em vez de erro na cara do organizador.
    public static function uniquePair(PDO $pdo)
    {
        for ($try = 0; $try < self::MAX_TRIES; $try++) {
            $guid = self::guid();
            $short = self::shortCode();

            $stmt = $pdo->prepare(
                'SELECT 1 FROM guest_groups WHERE guid = :guid OR short_code = :short LIMIT 1'
            );
            $stmt->execute(['guid' => $guid, 'short' => $short]);

            if (!$stmt->fetch()) {
                return ['guid' => $guid, 'short_code' => $short];
            }
        }

        throw new RuntimeException('Não foi possível gerar um código único em ' . self::MAX_TRIES . ' tentativas.');
    }

    public static function isGuid($value)
    {
        return preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            (string) $value
        ) === 1;
    }
}
