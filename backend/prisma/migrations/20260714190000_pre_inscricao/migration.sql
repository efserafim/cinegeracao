-- AlterEnum (PostgreSQL)
ALTER TYPE "StatusEvento" ADD VALUE IF NOT EXISTS 'PRE_INSCRICAO';
ALTER TYPE "StatusInscricao" ADD VALUE IF NOT EXISTS 'PRE_INSCRITA';

-- Coloca eventos abertos em modo pré-inscrição (medição de interesse)
UPDATE "eventos" SET status = 'PRE_INSCRICAO' WHERE status = 'ABERTO';
