-- Run against mothership data.db BEFORE first PocketBase 0.39 boot.
-- Custom SQL views block embedded v0.23 migration (passwordHash rename, view dependency chain).
-- After 0.39 boots, views are not recreated automatically; mothership handlers query `users` directly where needed.

DELETE FROM _collections WHERE type = 'view' AND system = 0;

DROP VIEW IF EXISTS stats;
DROP VIEW IF EXISTS subscribed_users;
DROP VIEW IF EXISTS user_growth_by_month;
DROP VIEW IF EXISTS verified_users;
DROP VIEW IF EXISTS duplicate_emails;
DROP VIEW IF EXISTS growth_by_day;
DROP VIEW IF EXISTS unverified_users;
