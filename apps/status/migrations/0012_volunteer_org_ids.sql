-- Volunteer groups leave the club and committee ranges for vol-N, which closes
-- the gaps they left. Tokens and statuses follow, so nothing has to be reissued.
-- Each old id is rewritten before its new id is handed to another group.

UPDATE org_tokens SET org_id = 'vol-5' WHERE org_id = 'club-19';
UPDATE org_status SET org_id = 'vol-5' WHERE org_id = 'club-19';
UPDATE org_status_log SET org_id = 'vol-5' WHERE org_id = 'club-19';
UPDATE hidden_orgs SET org_id = 'vol-5' WHERE org_id = 'club-19';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-19"', '"vol-5"');

UPDATE org_tokens SET org_id = 'vol-4' WHERE org_id = 'club-22';
UPDATE org_status SET org_id = 'vol-4' WHERE org_id = 'club-22';
UPDATE org_status_log SET org_id = 'vol-4' WHERE org_id = 'club-22';
UPDATE hidden_orgs SET org_id = 'vol-4' WHERE org_id = 'club-22';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-22"', '"vol-4"');

UPDATE org_tokens SET org_id = 'vol-6' WHERE org_id = 'club-23';
UPDATE org_status SET org_id = 'vol-6' WHERE org_id = 'club-23';
UPDATE org_status_log SET org_id = 'vol-6' WHERE org_id = 'club-23';
UPDATE hidden_orgs SET org_id = 'vol-6' WHERE org_id = 'club-23';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-23"', '"vol-6"');

UPDATE org_tokens SET org_id = 'vol-7' WHERE org_id = 'club-24';
UPDATE org_status SET org_id = 'vol-7' WHERE org_id = 'club-24';
UPDATE org_status_log SET org_id = 'vol-7' WHERE org_id = 'club-24';
UPDATE hidden_orgs SET org_id = 'vol-7' WHERE org_id = 'club-24';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-24"', '"vol-7"');

UPDATE org_tokens SET org_id = 'vol-8' WHERE org_id = 'club-25';
UPDATE org_status SET org_id = 'vol-8' WHERE org_id = 'club-25';
UPDATE org_status_log SET org_id = 'vol-8' WHERE org_id = 'club-25';
UPDATE hidden_orgs SET org_id = 'vol-8' WHERE org_id = 'club-25';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-25"', '"vol-8"');

UPDATE org_tokens SET org_id = 'vol-9' WHERE org_id = 'club-26';
UPDATE org_status SET org_id = 'vol-9' WHERE org_id = 'club-26';
UPDATE org_status_log SET org_id = 'vol-9' WHERE org_id = 'club-26';
UPDATE hidden_orgs SET org_id = 'vol-9' WHERE org_id = 'club-26';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-26"', '"vol-9"');

UPDATE org_tokens SET org_id = 'club-19' WHERE org_id = 'club-20';
UPDATE org_status SET org_id = 'club-19' WHERE org_id = 'club-20';
UPDATE org_status_log SET org_id = 'club-19' WHERE org_id = 'club-20';
UPDATE hidden_orgs SET org_id = 'club-19' WHERE org_id = 'club-20';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-20"', '"club-19"');

UPDATE org_tokens SET org_id = 'club-20' WHERE org_id = 'club-21';
UPDATE org_status SET org_id = 'club-20' WHERE org_id = 'club-21';
UPDATE org_status_log SET org_id = 'club-20' WHERE org_id = 'club-21';
UPDATE hidden_orgs SET org_id = 'club-20' WHERE org_id = 'club-21';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"club-21"', '"club-20"');

UPDATE org_tokens SET org_id = 'vol-3' WHERE org_id = 'com-1';
UPDATE org_status SET org_id = 'vol-3' WHERE org_id = 'com-1';
UPDATE org_status_log SET org_id = 'vol-3' WHERE org_id = 'com-1';
UPDATE hidden_orgs SET org_id = 'vol-3' WHERE org_id = 'com-1';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-1"', '"vol-3"');

UPDATE org_tokens SET org_id = 'vol-2' WHERE org_id = 'com-2';
UPDATE org_status SET org_id = 'vol-2' WHERE org_id = 'com-2';
UPDATE org_status_log SET org_id = 'vol-2' WHERE org_id = 'com-2';
UPDATE hidden_orgs SET org_id = 'vol-2' WHERE org_id = 'com-2';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-2"', '"vol-2"');

UPDATE org_tokens SET org_id = 'vol-1' WHERE org_id = 'com-6';
UPDATE org_status SET org_id = 'vol-1' WHERE org_id = 'com-6';
UPDATE org_status_log SET org_id = 'vol-1' WHERE org_id = 'com-6';
UPDATE hidden_orgs SET org_id = 'vol-1' WHERE org_id = 'com-6';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-6"', '"vol-1"');

UPDATE org_tokens SET org_id = 'vol-11' WHERE org_id = 'com-7';
UPDATE org_status SET org_id = 'vol-11' WHERE org_id = 'com-7';
UPDATE org_status_log SET org_id = 'vol-11' WHERE org_id = 'com-7';
UPDATE hidden_orgs SET org_id = 'vol-11' WHERE org_id = 'com-7';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-7"', '"vol-11"');

UPDATE org_tokens SET org_id = 'vol-10' WHERE org_id = 'com-8';
UPDATE org_status SET org_id = 'vol-10' WHERE org_id = 'com-8';
UPDATE org_status_log SET org_id = 'vol-10' WHERE org_id = 'com-8';
UPDATE hidden_orgs SET org_id = 'vol-10' WHERE org_id = 'com-8';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-8"', '"vol-10"');

UPDATE org_tokens SET org_id = 'com-1' WHERE org_id = 'com-3';
UPDATE org_status SET org_id = 'com-1' WHERE org_id = 'com-3';
UPDATE org_status_log SET org_id = 'com-1' WHERE org_id = 'com-3';
UPDATE hidden_orgs SET org_id = 'com-1' WHERE org_id = 'com-3';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-3"', '"com-1"');

UPDATE org_tokens SET org_id = 'com-2' WHERE org_id = 'com-4';
UPDATE org_status SET org_id = 'com-2' WHERE org_id = 'com-4';
UPDATE org_status_log SET org_id = 'com-2' WHERE org_id = 'com-4';
UPDATE hidden_orgs SET org_id = 'com-2' WHERE org_id = 'com-4';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-4"', '"com-2"');

UPDATE org_tokens SET org_id = 'com-3' WHERE org_id = 'com-5';
UPDATE org_status SET org_id = 'com-3' WHERE org_id = 'com-5';
UPDATE org_status_log SET org_id = 'com-3' WHERE org_id = 'com-5';
UPDATE hidden_orgs SET org_id = 'com-3' WHERE org_id = 'com-5';
UPDATE signage_config SET org_ids = REPLACE(org_ids, '"com-5"', '"com-3"');
