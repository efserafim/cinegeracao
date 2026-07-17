-- Atualiza a data do CineGeração para 2 de agosto de 2026.
UPDATE "eventos"
SET
  "data" = DATE '2026-08-02',
  "atualizado_em" = CURRENT_TIMESTAMP
WHERE
  "data" = DATE '2026-08-01'
  AND "nome" ILIKE '%Homem-Aranha%';
