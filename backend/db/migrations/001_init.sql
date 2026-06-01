-- Schema for the Road Quality Visualizer. See docs/db-schema.md.
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maps (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  visibility ENUM('private','public') DEFAULT 'private',
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_maps_owner (created_by)
);

CREATE TABLE IF NOT EXISTS paths (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  map_id      BIGINT NOT NULL,
  client_uuid CHAR(36) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  length_m    DOUBLE DEFAULT 0,
  hole_count  INT DEFAULT 0,
  score       DOUBLE,
  grade       CHAR(1),
  scanned_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES maps(id),
  INDEX idx_paths_map (map_id)
);

CREATE TABLE IF NOT EXISTS holes (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  path_id     BIGINT NOT NULL,
  client_uuid CHAR(36) UNIQUE NOT NULL,
  lat         DOUBLE NOT NULL,
  lng         DOUBLE NOT NULL,
  severity    ENUM('minor','moderate','severe') NOT NULL,
  score       DOUBLE NOT NULL,
  confidence  FLOAT,
  bbox_area   FLOAT,
  thumb_url   VARCHAR(512),
  detected_at TIMESTAMP NOT NULL,
  FOREIGN KEY (path_id) REFERENCES paths(id),
  INDEX idx_holes_path (path_id),
  INDEX idx_holes_geo (lat, lng)
);

CREATE TABLE IF NOT EXISTS path_points (
  id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  path_id BIGINT NOT NULL,
  seq     INT NOT NULL,
  lat     DOUBLE NOT NULL,
  lng     DOUBLE NOT NULL,
  ts      TIMESTAMP NOT NULL,
  FOREIGN KEY (path_id) REFERENCES paths(id),
  INDEX idx_points_path (path_id, seq)
);
