-- Media Wall Designer — D1 schema
--
-- Components are stored NORMALISED: x_in / y_in / w_in / h_in / depth_in are
-- real columns, not JSON, so the database can be queried and reported on.
-- Type-specific fields live in props_json. A full JSON snapshot also lands in
-- `revisions` on every save, for history, restore and offline reconciliation.

CREATE TABLE IF NOT EXISTS projects (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'lead',
  customer_name     TEXT NOT NULL DEFAULT '',
  customer_address  TEXT NOT NULL DEFAULT '',
  customer_city     TEXT NOT NULL DEFAULT '',
  customer_state    TEXT NOT NULL DEFAULT '',
  customer_zip      TEXT NOT NULL DEFAULT '',
  customer_phone    TEXT NOT NULL DEFAULT '',
  customer_email    TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  tier_offered      TEXT,
  approved_revision_id TEXT,
  approved_at       TEXT,
  base_photo_id     TEXT,
  design_notes      TEXT NOT NULL DEFAULT '',
  calibration_json  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status  ON projects(status);

CREATE TABLE IF NOT EXISTS walls (
  project_id        TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  room_width_in     REAL NOT NULL,
  ceiling_height_in REAL NOT NULL,
  width_in          REAL NOT NULL,
  height_in         REAL NOT NULL,
  offset_x_in       REAL NOT NULL DEFAULT 0,
  feature_depth_in  REAL NOT NULL,
  baseboard_in      REAL NOT NULL DEFAULT 0,
  baseboard_keep    INTEGER NOT NULL DEFAULT 1,
  color_hex         TEXT NOT NULL DEFAULT '#8E8E93',
  accent_color_hex  TEXT NOT NULL DEFAULT '#F5F0E8',
  finish            TEXT NOT NULL DEFAULT 'painted_drywall',
  finish_notes      TEXT NOT NULL DEFAULT '',
  stud_spacing      INTEGER NOT NULL DEFAULT 16,
  lumber            TEXT NOT NULL DEFAULT '2x4',
  custom_lumber_depth_in REAL,
  double_top_plate  INTEGER NOT NULL DEFAULT 0,
  mid_blocking      INTEGER NOT NULL DEFAULT 1,
  pt_bottom_plate   INTEGER NOT NULL DEFAULT 0,
  drywall_thickness REAL NOT NULL DEFAULT 0.5,
  side_returns      TEXT NOT NULL DEFAULT 'both',
  waste_factor_pct  REAL NOT NULL DEFAULT 10,
  load_bearing      TEXT NOT NULL DEFAULT 'unknown',
  existing_wall_notes TEXT NOT NULL DEFAULT ''
);

-- Every dimensioned object in the design. One row per physical thing.
CREATE TABLE IF NOT EXISTS components (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  x_in         REAL NOT NULL,
  y_in         REAL NOT NULL,
  w_in         REAL NOT NULL,
  h_in         REAL NOT NULL,
  depth_in     REAL NOT NULL DEFAULT 0,
  locked       INTEGER NOT NULL DEFAULT 0,
  z            INTEGER NOT NULL DEFAULT 0,
  group_id     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  props_json   TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_components_project ON components(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_components_type    ON components(project_id, type);

CREATE TABLE IF NOT EXISTS lighting_zones (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL,
  color_mode    TEXT NOT NULL DEFAULT 'warm',
  color_hex     TEXT NOT NULL DEFAULT '#FFFFFF',
  targets_json  TEXT NOT NULL DEFAULT '[]',
  length_ft     REAL NOT NULL DEFAULT 0,
  controller    TEXT NOT NULL DEFAULT 'none',
  driver_watts  REAL NOT NULL DEFAULT 0,
  notes         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_lighting_project ON lighting_zones(project_id);

CREATE TABLE IF NOT EXISTS estimate_settings (
  project_id    TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'before',
  mime        TEXT NOT NULL DEFAULT 'image/jpeg',
  width       INTEGER NOT NULL DEFAULT 0,
  height      INTEGER NOT NULL DEFAULT 0,
  caption     TEXT NOT NULL DEFAULT '',
  storage     TEXT NOT NULL DEFAULT 'd1',   -- 'r2' | 'd1'
  storage_key TEXT,
  transform_json TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id, created_at DESC);

-- Fallback image storage when no R2 bucket is bound. Downscaled client-side.
CREATE TABLE IF NOT EXISTS photo_blobs (
  photo_id TEXT PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
  data     BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS renderings (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  variant     INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'queued',
  provider    TEXT NOT NULL DEFAULT '',
  prompt      TEXT NOT NULL DEFAULT '',
  photo_id    TEXT,
  revision_id TEXT,
  error       TEXT,
  meta_json   TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_renderings_project ON renderings(project_id, created_at DESC);

-- Full JSON snapshot per save. History, restore, and the anchor an AI
-- rendering is pinned to so a picture can always be traced to a revision.
CREATE TABLE IF NOT EXISTS revisions (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revisions_project ON revisions(project_id, created_at DESC);

-- Per-project supplier overrides for the sourcing list.
CREATE TABLE IF NOT EXISTS sourcing_overrides (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sku        TEXT NOT NULL,
  supplier   TEXT NOT NULL,
  PRIMARY KEY (project_id, sku)
);
