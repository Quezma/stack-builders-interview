import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at     TEXT    NOT NULL,   -- ISO timestamp of the execution
  outcome        TEXT    NOT NULL,   -- ok | error
  error_message  TEXT,
  -- user interaction
  command        TEXT    NOT NULL,   -- raw argv, what the user actually typed
  filter_id      TEXT,
  filter_label   TEXT,
  limit_n        INTEGER,
  -- crawler health
  source_url     TEXT    NOT NULL,
  http_status    INTEGER,
  duration_ms    INTEGER,
  bytes          INTEGER,
  total_found    INTEGER,            -- entries present on the page
  scraped_count  INTEGER,            -- entries taken (limit)
  filtered_count INTEGER,            -- entries surviving the filter
  node_version   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS run_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      INTEGER NOT NULL REFERENCES runs(id),
  position    INTEGER NOT NULL,      -- position AFTER the filter
  hn_id       TEXT    NOT NULL,
  rank        INTEGER,
  title       TEXT    NOT NULL,
  url         TEXT,
  word_count  INTEGER NOT NULL,
  points      INTEGER NOT NULL,
  comments    INTEGER NOT NULL
);
`;

export function openDb(path = './crawler.db') {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}

export function saveRun(db, run, entries = []) {
  const insertRun = db.prepare(`
    INSERT INTO runs (
      started_at, outcome, error_message, command, filter_id, filter_label, limit_n,
      source_url, http_status, duration_ms, bytes, total_found, scraped_count,
      filtered_count, node_version
    ) VALUES (
      :started_at, :outcome, :error_message, :command, :filter_id, :filter_label, :limit_n,
      :source_url, :http_status, :duration_ms, :bytes, :total_found, :scraped_count,
      :filtered_count, :node_version
    )
  `);

  const runId = Number(insertRun.run(run).lastInsertRowid);

  const insertEntry = db.prepare(`
    INSERT INTO run_entries (
      run_id, position, hn_id, rank, title, url, word_count, points, comments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  entries.forEach((entry, index) => {
    insertEntry.run(
      runId,
      index + 1,
      entry.id,
      entry.rank,
      entry.title,
      entry.url,
      entry.wordCount,
      entry.points,
      entry.comments,
    );
  });

  return runId;
}

export function listRuns(db, limit = 10) {
  return db
    .prepare(
      `SELECT id, started_at, outcome, filter_id, scraped_count, filtered_count,
              http_status, duration_ms
       FROM runs ORDER BY id DESC LIMIT ?`,
    )
    .all(limit);
}
