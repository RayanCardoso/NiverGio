<?php

namespace App\Controllers;

use App\Config\Env;
use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;

class AdminController
{
    public function list()
    {
        $body = Request::json();
        $password = isset($body['password']) ? (string) $body['password'] : '';

        if (!hash_equals((string) Env::get('ADMIN_PASSWORD', ''), $password)) {
            Response::json(['ok' => false, 'error' => 'Senha incorreta.'], 401);
            return;
        }

        // O painel calcula os totais em cima desta lista, então aqui só devolve
        // as linhas cruas — uma fonte de verdade só.
        $stmt = Connection::get()->query(
            'SELECT email, `name`, companions, created_at, updated_at
             FROM rsvps ORDER BY updated_at DESC'
        );

        $rsvps = [];
        foreach ($stmt->fetchAll() as $row) {
            $rsvps[] = [
                'email' => $row['email'],
                'name' => $row['name'],
                'companions' => $row['companions'] ? json_decode($row['companions'], true) : [],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
            ];
        }

        Response::json(['ok' => true, 'rsvps' => $rsvps]);
    }
}
