/**
 * @openapi
 * /api/eventos/publicos:
 *   get:
 *     tags: [Eventos]
 *     summary: Lista eventos abertos
 * /api/eventos/publicos/{id}:
 *   get:
 *     tags: [Eventos]
 *     summary: Detalhe de evento público
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 * /api/inscricoes/evento/{eventoId}:
 *   post:
 *     tags: [Inscrições]
 *     summary: Criar inscrição pública
 *     parameters:
 *       - in: path
 *         name: eventoId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, telefone, cidade]
 *             properties:
 *               nome: { type: string }
 *               telefone: { type: string }
 *               email: { type: string }
 *               paroquia: { type: string }
 *               cidade: { type: string }
 * /api/inscricoes/codigo/{codigo}/comprovante:
 *   post:
 *     tags: [Inscrições]
 *     summary: Enviar comprovante (PNG/JPG/PDF até 15MB)
 * /api/ingressos/validar:
 *   post:
 *     tags: [Ingressos]
 *     summary: Validar QR Code na entrada
 *     security: [{ bearerAuth: [] }]
 */

module.exports = {};
