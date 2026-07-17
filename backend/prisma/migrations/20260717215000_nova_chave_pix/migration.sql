-- Atualiza a chave PIX do CineGeração para o novo CNPJ.
UPDATE "eventos"
SET
  "chave_pix" = '64.451.288/0001-01',
  "atualizado_em" = CURRENT_TIMESTAMP
WHERE "nome" ILIKE '%Homem-Aranha%';
