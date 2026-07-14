-- Rode ZERO no Supabase (uma vez) se o Render ainda falhar com
-- "enum label PRE_INSCRICAO already exists" / P3018 / P3009:

DELETE FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260714190000_pre_inscricao',
  '20260714190001_pre_inscricao_status',
  '20260714190100_ativar_pre_inscricao'
);
