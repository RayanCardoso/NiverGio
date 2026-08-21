-- Tabela de confirmações de presença (RSVP).
-- Rode isto no phpMyAdmin (aba SQL) do banco criado no cPanel da HostGator.

CREATE TABLE rsvps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(120) NOT NULL,           -- quem confirmou; conta como convidado
  companions TEXT NULL,                 -- array JSON, ex: ["João Silva","Ana Silva"]
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Se o banco já tinha a versão antiga da tabela (sem a coluna "name"), não
-- rode o CREATE acima: rode só a linha abaixo, que preserva o que já existe.
-- ALTER TABLE rsvps ADD COLUMN name VARCHAR(120) NOT NULL DEFAULT '' AFTER email;
