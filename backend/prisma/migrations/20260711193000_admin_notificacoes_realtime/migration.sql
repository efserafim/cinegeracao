-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_notificacoes" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '/admin',
    "inscricao_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notificacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_notificacoes_criado_em_idx" ON "admin_notificacoes"("criado_em");

-- Realtime (Supabase)
ALTER TABLE "admin_notificacoes" REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE admin_notificacoes;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "admin_notificacoes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_notificacoes" ON "admin_notificacoes";
CREATE POLICY "select_admin_notificacoes"
  ON "admin_notificacoes"
  FOR SELECT
  USING (true);
