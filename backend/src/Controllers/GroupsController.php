<?php

namespace App\Controllers;

use App\Auth\AdminSession;
use App\Database\Connection;
use App\Http\Request;
use App\Http\Response;
use App\Support\Codes;
use Throwable;

class GroupsController
{
    const MAX_COMPANIONS = 30;
    const MAX_NAME_LENGTH = 120;

    public function index()
    {
        AdminSession::guard();

        $pdo = Connection::get();
        $groups = $pdo->query(
            'SELECT id, guid, short_code, phone, message_sent_at, created_at
             FROM guest_groups ORDER BY created_at DESC, id DESC'
        )->fetchAll();

        if (!$groups) {
            Response::json(['ok' => true, 'groups' => []]);
            return;
        }

        // Uma consulta só para todas as pessoas, agrupadas em PHP: um SELECT por
        // grupo seria N+1 idas ao banco a cada carga do painel.
        $members = $pdo->query(
            'SELECT id, group_id, `name`, is_responsible, status, responded_at
             FROM guest_members ORDER BY group_id, is_responsible DESC, sort_order, id'
        )->fetchAll();

        $byGroup = [];
        foreach ($members as $member) {
            $byGroup[(int) $member['group_id']][] = [
                'id' => (int) $member['id'],
                'name' => $member['name'],
                'is_responsible' => (int) $member['is_responsible'] === 1,
                'status' => $member['status'],
                'responded_at' => $member['responded_at'],
            ];
        }

        $out = [];
        foreach ($groups as $group) {
            $id = (int) $group['id'];
            $out[] = [
                'id' => $id,
                'guid' => $group['guid'],
                'short_code' => $group['short_code'],
                'phone' => $group['phone'],
                'message_sent_at' => $group['message_sent_at'],
                'created_at' => $group['created_at'],
                'members' => isset($byGroup[$id]) ? $byGroup[$id] : [],
            ];
        }

        Response::json(['ok' => true, 'groups' => $out]);
    }

    public function create()
    {
        AdminSession::guard();

        $body = Request::json();
        $rawPhone = isset($body['phone']) ? $body['phone'] : '';
        $responsible = self::cleanName(isset($body['responsible']) ? $body['responsible'] : '');
        $companions = self::cleanCompanionNames(isset($body['companions']) ? $body['companions'] : []);
        $phone = self::cleanPhone($rawPhone);

        $error = self::validate($responsible, $companions, $phone, $rawPhone);
        if ($error !== null) {
            Response::json(['error' => $error], 400);
            return;
        }

        $pdo = Connection::get();
        $codes = Codes::uniquePair($pdo);

        // Transação porque um erro no meio deixaria um grupo com código válido e
        // sem ninguém dentro — e o organizador mandaria um link para uma família
        // vazia sem perceber.
        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO guest_groups (guid, short_code, phone) VALUES (:guid, :short, :phone)')
                ->execute([
                    'guid' => $codes['guid'],
                    'short' => $codes['short_code'],
                    'phone' => $phone === '' ? null : $phone,
                ]);
            $groupId = (int) $pdo->lastInsertId();

            $insertMember = $pdo->prepare(
                'INSERT INTO guest_members (group_id, `name`, is_responsible, sort_order)
                 VALUES (:group_id, :name, :responsible, :sort_order)'
            );
            $insertMember->execute([
                'group_id' => $groupId,
                'name' => $responsible,
                'responsible' => 1,
                'sort_order' => 0,
            ]);
            foreach ($companions as $index => $name) {
                $insertMember->execute([
                    'group_id' => $groupId,
                    'name' => $name,
                    'responsible' => 0,
                    'sort_order' => $index + 1,
                ]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Response::json(['ok' => true, 'id' => $groupId]);
    }

    protected static function cleanName($value)
    {
        return trim((string) $value);
    }

    // Aceita tanto ["João"] quanto [{"id":3,"name":"João"}] — o cadastro manda a
    // primeira forma, a edição manda a segunda.
    protected static function cleanCompanionNames($value)
    {
        if (!is_array($value)) {
            return [];
        }

        $names = [];
        foreach ($value as $item) {
            $raw = is_array($item) && isset($item['name']) ? $item['name'] : $item;
            $name = trim((string) $raw);
            if ($name !== '') {
                $names[] = $name;
            }
        }

        return $names;
    }

    protected static function cleanPhone($value)
    {
        return preg_replace('/\D+/', '', (string) $value);
    }

    protected static function validate($responsible, array $companions, $phone, $rawPhone)
    {
        if ($responsible === '') {
            return 'Informe o nome do responsável.';
        }

        // mb_strlen porque o limite da coluna é em caracteres, não em bytes: um
        // nome com acentos seria cortado antes de a conta bater.
        if (mb_strlen($responsible, 'UTF-8') > self::MAX_NAME_LENGTH) {
            return 'Nome do responsável muito longo.';
        }

        foreach ($companions as $name) {
            if (mb_strlen($name, 'UTF-8') > self::MAX_NAME_LENGTH) {
                return 'Nome de acompanhante muito longo.';
            }
        }

        if (count($companions) > self::MAX_COMPANIONS) {
            return 'Máximo de ' . self::MAX_COMPANIONS . ' acompanhantes por grupo.';
        }

        if (trim((string) $rawPhone) !== '' && (strlen($phone) < 10 || strlen($phone) > 13)) {
            return 'Telefone deve ter entre 10 e 13 dígitos, com DDD.';
        }

        return null;
    }
}
