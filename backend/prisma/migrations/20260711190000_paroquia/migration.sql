-- AlterTable: troca CPF por paróquia
ALTER TABLE "participantes" ADD COLUMN IF NOT EXISTS "paroquia" TEXT;

-- Preenche registros antigos sem paróquia
UPDATE "participantes" SET "paroquia" = 'Não informada' WHERE "paroquia" IS NULL OR "paroquia" = '';

ALTER TABLE "participantes" ALTER COLUMN "paroquia" SET NOT NULL;

ALTER TABLE "participantes" DROP COLUMN IF EXISTS "cpf";

CREATE INDEX IF NOT EXISTS "participantes_paroquia_idx" ON "participantes"("paroquia");
