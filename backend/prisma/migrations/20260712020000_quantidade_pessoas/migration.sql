-- AlterTable
ALTER TABLE "inscricoes" ADD COLUMN IF NOT EXISTS "quantidade" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE IF NOT EXISTS "inscricao_pessoas" (
    "id" TEXT NOT NULL,
    "inscricao_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "inscricao_pessoas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inscricao_pessoas_inscricao_id_idx" ON "inscricao_pessoas"("inscricao_id");

DO $$ BEGIN
  ALTER TABLE "inscricao_pessoas"
    ADD CONSTRAINT "inscricao_pessoas_inscricao_id_fkey"
    FOREIGN KEY ("inscricao_id") REFERENCES "inscricoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill one person per existing inscription
INSERT INTO "inscricao_pessoas" ("id", "inscricao_id", "nome", "ordem")
SELECT gen_random_uuid()::text, i."id", p."nome", 0
FROM "inscricoes" i
JOIN "participantes" p ON p."id" = i."participante_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "inscricao_pessoas" ip WHERE ip."inscricao_id" = i."id"
);

-- Ingressos: allow multiple per inscrição
ALTER TABLE "ingressos" DROP CONSTRAINT IF EXISTS "ingressos_inscricao_id_key";

ALTER TABLE "ingressos" ADD COLUMN IF NOT EXISTS "pessoa_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "ingressos"
    ADD CONSTRAINT "ingressos_pessoa_id_key" UNIQUE ("pessoa_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ingressos"
    ADD CONSTRAINT "ingressos_pessoa_id_fkey"
    FOREIGN KEY ("pessoa_id") REFERENCES "inscricao_pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ingressos_inscricao_id_idx" ON "ingressos"("inscricao_id");

-- Link existing tickets to the first person of each inscription
UPDATE "ingressos" ig
SET "pessoa_id" = ip."id"
FROM (
  SELECT DISTINCT ON ("inscricao_id") "id", "inscricao_id"
  FROM "inscricao_pessoas"
  ORDER BY "inscricao_id", "ordem" ASC
) ip
WHERE ig."inscricao_id" = ip."inscricao_id"
  AND ig."pessoa_id" IS NULL;
