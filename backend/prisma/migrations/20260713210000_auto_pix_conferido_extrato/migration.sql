-- Auto PIX confirmation + bank reconciliation checklist
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "liberacao_automatica" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "conferido_extrato_em" TIMESTAMP(3);
