CREATE DATABASE IF NOT EXISTS agendate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agendate;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          ENUM('admin','proveedor','cliente') NOT NULL DEFAULT 'cliente',
  phone         VARCHAR(40) NULL,
  avatar_url    VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_id      INT UNSIGNED NOT NULL,
  name             VARCHAR(255) NOT NULL,
  description      TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  price            DECIMAL(12,2) NULL,
  color            VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS availability_rules (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_id INT UNSIGNED NOT NULL,
  weekday    TINYINT UNSIGNED NOT NULL COMMENT '0=Sun 1=Mon ... 6=Sat',
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_provider_weekday (provider_id, weekday),
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider_id INT UNSIGNED NOT NULL,
  exception_date DATE NOT NULL,
  is_blocked  TINYINT(1) NOT NULL DEFAULT 1,
  start_time  TIME NULL,
  end_time    TIME NULL,
  reason      VARCHAR(255) NULL,
  UNIQUE KEY uq_provider_date (provider_id, exception_date),
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_id          INT UNSIGNED NOT NULL,
  provider_id         INT UNSIGNED NOT NULL,
  client_id           INT UNSIGNED NOT NULL,
  starts_at           DATETIME NOT NULL,
  ends_at             DATETIME NOT NULL,
  status              ENUM('pending','confirmed','cancelled_by_client','cancelled_by_provider','completed','no_show') NOT NULL DEFAULT 'pending',
  notes               TEXT NULL,
  cancellation_reason TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_starts (provider_id, starts_at),
  INDEX idx_client_starts   (client_id, starts_at),
  FOREIGN KEY (service_id)   REFERENCES services(id)  ON DELETE CASCADE,
  FOREIGN KEY (provider_id)  REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (client_id)    REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB;
