-- Estrutura do banco do convite. Rode no phpMyAdmin (aba SQL) do banco criado
-- no cPanel da HostGator, ou pelo mysql.exe no ambiente local.
--
-- ATENÇÃO: o primeiro comando apaga a tabela do modelo antigo (auto-cadastro
-- por email). Não há migração: no modelo novo quem cadastra é o organizador,
-- e nada da tabela antiga tem correspondente aqui.

DROP TABLE IF EXISTS rsvps;

CREATE TABLE guest_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  guid CHAR(36) NOT NULL,               -- código do link do convite (UUID v4)
  short_code CHAR(6) NOT NULL,          -- código ditado por telefone
  phone VARCHAR(20) NULL,               -- só dígitos; nunca sai pela API pública
  message_sent_at DATETIME NULL,        -- NULL = convite ainda não enviado
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_guid (guid),
  UNIQUE KEY uq_short_code (short_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guest_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_responsible TINYINT(1) NOT NULL DEFAULT 0,   -- exatamente um por grupo
  status ENUM('pending','yes','no') NOT NULL DEFAULT 'pending',
  responded_at DATETIME NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_group (group_id),
  CONSTRAINT fk_member_group FOREIGN KEY (group_id)
    REFERENCES guest_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Guarda o SHA-256 do token, nunca o token: quem conseguir ler esta tabela
-- ainda assim não consegue entrar no painel.
CREATE TABLE admin_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Só tentativas FALHAS de código curto, para frear força bruta. Guarda o hash
-- do IP: dá para contar tentativas do mesmo visitante sem manter um registro
-- de quem abriu o convite.
CREATE TABLE code_attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip_hash CHAR(64) NOT NULL,
  attempted_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ip_time (ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
