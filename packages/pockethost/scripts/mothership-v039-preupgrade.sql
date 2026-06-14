-- Run against mothership data.db BEFORE first PocketBase 0.39 boot.
-- Custom SQL views block embedded v0.23 migration (passwordHash rename, view dependency chain).
-- After 0.39 boots, run pending migrations: 1781606400_restored_sql_views.js recreates the SQL views
-- (verified_users, stats, growth_by_day, etc.) for PocketBase admin browsing and dashboard stats.

DELETE FROM _collections WHERE type = 'view' AND system = 0;

DROP VIEW IF EXISTS stats;
DROP VIEW IF EXISTS subscribed_users;
DROP VIEW IF EXISTS user_growth_by_month;
DROP VIEW IF EXISTS verified_users;
DROP VIEW IF EXISTS duplicate_emails;
DROP VIEW IF EXISTS growth_by_day;
DROP VIEW IF EXISTS unverified_users;
