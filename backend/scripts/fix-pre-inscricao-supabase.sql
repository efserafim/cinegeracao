-- 1) Abra o Supabase → SQL Editor → New query
-- 2) Cole este script e rode (Run)
-- 3) No Render: Manual Deploy → Clear build cache & deploy
--
-- Desbloqueia o erro P3009 e configura a pré-inscrição.

DELETE FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260714190000_pre_inscricao',
  '20260714190001_pre_inscricao_status',
  '20260714190100_ativar_pre_inscricao'
);

ALTER TYPE "StatusEvento" ADD VALUE IF NOT EXISTS 'PRE_INSCRICAO';
ALTER TYPE "StatusInscricao" ADD VALUE IF NOT EXISTS 'PRE_INSCRITA';

UPDATE "eventos" SET status = 'PRE_INSCRICAO' WHERE status = 'ABERTO';
