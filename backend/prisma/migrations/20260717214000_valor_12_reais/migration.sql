-- Atualiza o valor do ingresso do CineGeração de R$ 10 para R$ 12.
UPDATE "eventos"
SET
  "valor" = 12,
  "atualizado_em" = CURRENT_TIMESTAMP
WHERE
  "valor" = 10
  AND "nome" ILIKE '%Homem-Aranha%';
