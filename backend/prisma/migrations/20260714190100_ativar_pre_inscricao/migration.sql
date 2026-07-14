-- Ativa pré-inscrição nos eventos que estavam abertos
UPDATE "eventos" SET status = 'PRE_INSCRICAO' WHERE status = 'ABERTO';
