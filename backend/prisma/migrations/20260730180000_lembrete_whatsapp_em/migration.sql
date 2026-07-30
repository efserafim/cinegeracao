-- Evita reenvio de lembrete WhatsApp no mesmo dia.
ALTER TABLE "inscricoes" ADD COLUMN "lembrete_whatsapp_em" TIMESTAMP(3);
