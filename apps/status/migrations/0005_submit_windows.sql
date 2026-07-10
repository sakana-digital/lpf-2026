CREATE TABLE submit_windows (
  day INTEGER PRIMARY KEY CHECK (day IN (1, 2)),
  accept_from INTEGER,
  accept_until INTEGER
);

INSERT INTO submit_windows (day, accept_from, accept_until)
  SELECT 1, accept_from, accept_until FROM app_settings WHERE id = 1;

DROP TABLE app_settings;
