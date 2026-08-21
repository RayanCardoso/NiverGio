<?php

namespace App\Controllers;

use App\Auth\AdminSession;
use App\Http\Request;
use App\Http\Response;

class AdminAuthController
{
    public function login()
    {
        $body = Request::json();
        $password = isset($body['password']) ? (string) $body['password'] : '';

        $session = AdminSession::login($password);
        if ($session === null) {
            Response::json(['error' => 'Senha incorreta.'], 401);
            return;
        }

        Response::json([
            'ok' => true,
            'token' => $session['token'],
            'expires_at' => $session['expires_at'],
        ]);
    }

    public function logout()
    {
        AdminSession::logout();
        Response::json(['ok' => true]);
    }
}
