CREATE TABLE admin_tokens (
  token TEXT PRIMARY KEY
);

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  accept_from INTEGER,
  accept_until INTEGER
);
