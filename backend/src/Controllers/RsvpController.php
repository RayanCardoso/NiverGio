<?php

namespace App\Controllers;

use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;

class RsvpController
{
    public function lookup()
    {
        $email = strtolower(Request::query('email'));

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'Informe um email válido.'], 400);
            return;
        }

        $stmt = Connection::get()->prepare(
            'SELECT email, `name`, companions FROM rsvps WHERE email = :email LIMIT 1'
        );
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::json(['found' => false]);
            return;
        }

        Response::json([
            'found' => true,
            'email' => $row['email'],
            'name' => $row['name'],
            'companions' => $row['companions'] ? json_decode($row['companions'], true) : [],
        ]);
    }

    public function save()
    {
        $body = Request::json();
        $email = strtolower(trim((string) (isset($body['email']) ? $body['email'] : '')));
        $name = trim((string) (isset($body['name']) ? $body['name'] : ''));
        $companionsInput = isset($body['companions']) && is_array($body['companions']) ? $body['companions'] : [];

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'Informe um email válido.'], 400);
            return;
        }
        if (strlen($email) > 190) {
            Response::json(['error' => 'Email muito longo.'], 400);
            return;
        }
        if ($name === '') {
            Response::json(['error' => 'Informe seu nome.'], 400);
            return;
        }
        // mb_strlen porque o limite da coluna é em caracteres, não em bytes —
        // sem isso um nome com acentos seria cortado antes da conta bater.
        if (mb_strlen($name, 'UTF-8') > 120) {
            Response::json(['error' => 'Nome muito longo.'], 400);
            return;
        }

        $companions = [];
        foreach ($companionsInput as $companion) {
            $trimmed = trim((string) $companion);
            if ($trimmed !== '') {
                $companions[] = $trimmed;
            }
        }
        $companionsJson = json_encode($companions);

        $pdo = Connection::get();

        $stmt = $pdo->prepare('SELECT id FROM rsvps WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $existing = $stmt->fetch();

        if ($existing) {
            $update = $pdo->prepare(
                'UPDATE rsvps SET `name` = :name, companions = :companions WHERE id = :id'
            );
            $update->execute([
                'name' => $name,
                'companions' => $companionsJson,
                'id' => $existing['id'],
            ]);
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO rsvps (email, `name`, companions) VALUES (:email, :name, :companions)'
            );
            $insert->execute([
                'email' => $email,
                'name' => $name,
                'companions' => $companionsJson,
            ]);
        }

        Response::json([
            'ok' => true,
            'email' => $email,
            'name' => $name,
            'companions' => $companions,
        ]);
    }
}
