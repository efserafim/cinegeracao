-- AlterEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'DINHEIRO');

-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN "metodo" "MetodoPagamento" NOT NULL DEFAULT 'PIX';
