-- AlterEnum (PostgreSQL)
-- Valores novos só podem ser usados depois do commit desta migration.
ALTER TYPE "StatusEvento" ADD VALUE IF NOT EXISTS 'PRE_INSCRICAO';
ALTER TYPE "StatusInscricao" ADD VALUE IF NOT EXISTS 'PRE_INSCRITA';
