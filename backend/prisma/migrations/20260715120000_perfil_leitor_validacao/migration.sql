-- Perfil de admin (ADMIN x LEITOR) + metadados de leitura de QR
DO $$ BEGIN
  CREATE TYPE "PerfilAdmin" AS ENUM ('ADMIN', 'LEITOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "perfil" "PerfilAdmin" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "aparelho_nome" TEXT;

ALTER TABLE "validacoes_ticket" ADD COLUMN IF NOT EXISTS "aparelho" TEXT;
ALTER TABLE "validacoes_ticket" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;

CREATE INDEX IF NOT EXISTS "admins_perfil_idx" ON "admins"("perfil");
CREATE INDEX IF NOT EXISTS "validacoes_ticket_admin_id_idx" ON "validacoes_ticket"("admin_id");
