-- CreateEnum
CREATE TYPE "StatusEvento" AS ENUM ('RASCUNHO', 'ABERTO', 'ENCERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusInscricao" AS ENUM ('AGUARDANDO_PAGAMENTO', 'COMPROVANTE_ENVIADO', 'OCR_PROCESSADO', 'AGUARDANDO_CONFIRMACAO', 'PAGAMENTO_CONFIRMADO', 'INGRESSO_LIBERADO', 'PAGAMENTO_RECUSADO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AlertaPagamento" AS ENUM ('NENHUM', 'VALOR_INCORRETO', 'NECESSITA_CONFERENCIA', 'OCR_FALHOU');

-- CreateEnum
CREATE TYPE "StatusIngresso" AS ENUM ('VALIDO', 'UTILIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "banner_url" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL,
    "horario" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "vagas_maximas" INTEGER NOT NULL,
    "chave_pix" TEXT NOT NULL,
    "nome_favorecido" TEXT NOT NULL,
    "status" "StatusEvento" NOT NULL DEFAULT 'ABERTO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participantes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "cidade" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricoes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "status" "StatusInscricao" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "valor" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "inscricao_id" TEXT NOT NULL,
    "valor_esperado" DECIMAL(10,2) NOT NULL,
    "valor_detectado" DECIMAL(10,2),
    "data_detectada" TIMESTAMP(3),
    "hora_detectada" TEXT,
    "nome_recebedor" TEXT,
    "instituicao" TEXT,
    "id_transacao" TEXT,
    "texto_ocr" TEXT,
    "alerta" "AlertaPagamento" NOT NULL DEFAULT 'NENHUM',
    "confirmado_em" TIMESTAMP(3),
    "recusado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprovantes" (
    "id" TEXT NOT NULL,
    "pagamento_id" TEXT NOT NULL,
    "arquivo_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprovantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingressos" (
    "id" TEXT NOT NULL,
    "inscricao_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "status" "StatusIngresso" NOT NULL DEFAULT 'VALIDO',
    "liberado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingressos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validacoes_ticket" (
    "id" TEXT NOT NULL,
    "ingresso_id" TEXT NOT NULL,
    "admin_id" TEXT,
    "resultado" TEXT NOT NULL,
    "lido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,

    CONSTRAINT "validacoes_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT,
    "entidade_id" TEXT,
    "detalhes" TEXT,
    "ip" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "eventos_status_idx" ON "eventos"("status");

-- CreateIndex
CREATE INDEX "eventos_data_idx" ON "eventos"("data");

-- CreateIndex
CREATE INDEX "participantes_telefone_idx" ON "participantes"("telefone");

-- CreateIndex
CREATE INDEX "participantes_nome_idx" ON "participantes"("nome");

-- CreateIndex
CREATE INDEX "participantes_cidade_idx" ON "participantes"("cidade");

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_codigo_key" ON "inscricoes"("codigo");

-- CreateIndex
CREATE INDEX "inscricoes_evento_id_idx" ON "inscricoes"("evento_id");

-- CreateIndex
CREATE INDEX "inscricoes_status_idx" ON "inscricoes"("status");

-- CreateIndex
CREATE INDEX "inscricoes_criado_em_idx" ON "inscricoes"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_inscricao_id_key" ON "pagamentos"("inscricao_id");

-- CreateIndex
CREATE UNIQUE INDEX "comprovantes_pagamento_id_key" ON "comprovantes"("pagamento_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingressos_inscricao_id_key" ON "ingressos"("inscricao_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingressos_codigo_key" ON "ingressos"("codigo");

-- CreateIndex
CREATE INDEX "ingressos_codigo_idx" ON "ingressos"("codigo");

-- CreateIndex
CREATE INDEX "validacoes_ticket_ingresso_id_idx" ON "validacoes_ticket"("ingresso_id");

-- CreateIndex
CREATE INDEX "validacoes_ticket_lido_em_idx" ON "validacoes_ticket"("lido_em");

-- CreateIndex
CREATE INDEX "logs_acao_idx" ON "logs"("acao");

-- CreateIndex
CREATE INDEX "logs_criado_em_idx" ON "logs"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_inscricao_id_fkey" FOREIGN KEY ("inscricao_id") REFERENCES "inscricoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "pagamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingressos" ADD CONSTRAINT "ingressos_inscricao_id_fkey" FOREIGN KEY ("inscricao_id") REFERENCES "inscricoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacoes_ticket" ADD CONSTRAINT "validacoes_ticket_ingresso_id_fkey" FOREIGN KEY ("ingresso_id") REFERENCES "ingressos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacoes_ticket" ADD CONSTRAINT "validacoes_ticket_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
