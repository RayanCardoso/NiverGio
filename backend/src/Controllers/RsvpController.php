<?php

namespace App\Controllers;

use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;
use App\Support\Codes;
use App\Support\RateLimiter;

class RsvpController
{
    public function lookup()
    {
        $code = trim((string) Request::query('code'));
        $found = $this->findGroup($code);

        if (!isset($found['group_id'])) {
            Response::json($found['body'], $found['status']);
            return;
        }

        Response::json([
            'found' => true,
            'code' => $code,
            'members' => $this->members($found['group_id']),
        ]);
    }

    // Devolve ['group_id' => int] quando achou; caso contrário, o par
    // status/body que o chamador deve responder. Fica em um lugar só porque
    // lookup e confirm precisam resolver o código exatamente da mesma forma —
    // duas cópias acabariam com regras de bloqueio diferentes.
    protected function findGroup($code)
    {
        if ($code === '') {
            return ['status' => 400, 'body' => ['error' => 'Informe o código do convite.']];
        }

        $pdo = Connection::get();

        if (Codes::isGuid($code)) {
            $stmt = $pdo->prepare('SELECT id FROM guest_groups WHERE guid = :code LIMIT 1');
            $stmt->execute(['code' => $code]);
            $row = $stmt->fetch();

            return $row
                ? ['group_id' => (int) $row['id']]
                : ['status' => 200, 'body' => ['found' => false]];
        }

        if (RateLimiter::isBlocked()) {
            return ['status' => 429, 'body' => ['error' => 'Muitas tentativas. Aguarde alguns minutos.']];
        }

        $stmt = $pdo->prepare('SELECT id FROM guest_groups WHERE short_code = :code LIMIT 1');
        $stmt->execute(['code' => strtoupper($code)]);
        $row = $stmt->fetch();

        if (!$row) {
            RateLimiter::registerFailure();
            return ['status' => 200, 'body' => ['found' => false]];
        }

        return ['group_id' => (int) $row['id']];
    }

    // Montado campo a campo de propósito: assim nenhuma coluna nova da tabela
    // (telefone, código curto, o que for) vaza pela API pública por esquecimento
    // de quem mexer aqui depois.
    protected function members($groupId)
    {
        $stmt = Connection::get()->prepare(
            'SELECT id, `name`, is_responsible, status FROM guest_members
             WHERE group_id = :id ORDER BY is_responsible DESC, sort_order, id'
        );
        $stmt->execute(['id' => $groupId]);

        $members = [];
        foreach ($stmt->fetchAll() as $row) {
            $members[] = [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'is_responsible' => (int) $row['is_responsible'] === 1,
                'status' => $row['status'],
            ];
        }

        return $members;
    }
}
