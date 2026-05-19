-- ============================================================
-- 010: Remove mara_number from firms table
-- MARA numbers belong to individual agents, not firms
-- ============================================================

alter table firms drop column if exists mara_number;
