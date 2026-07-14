-- Status dos eventos já atualizado no Supabase quando necessário.
-- Mantém UPDATE idempotente.
UPDATE "eventos" SET status = 'PRE_INSCRICAO' WHERE status = 'ABERTO';
