# Evolution API — deployment & backend configuration

Este documento descreve os passos mínimos para configurar a Evolution API (rodando no Render ou localmente) e apontar o backend do CineGeração para ela.

1) Se você já tem a Evolution API no Render

- Na página do serviço Evolution API no Render, copie o valor de `AUTHENTICATION_API_KEY` exibido em Environment Variables — essa é a chave que autoriza chamadas ao endpoint da Evolution.
- Copie também a `SERVER_URL` (ex: `https://evolution-api-b4r0.onrender.com`).

2) Criar a instância WhatsApp (uma vez)

Use o `AUTHENTICATION_API_KEY` para criar uma instância WhatsApp na sua Evolution API:

```bash
curl -X POST "https://<EVOLUTION_URL>/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: <AUTHENTICATION_API_KEY>" \
  -d '{
    "instanceName":"default",
    "token":"<META_PERMANENT_TOKEN_OU_BAILEYS_TOKEN>",
    "number":"<55XXXXXXXXX>",
    "businessId":"<BUSINESS_ID_SE_APLICA>",
    "qrcode":false,
    "integration":"WHATSAPP-BUSINESS"
  }'
```

Se a criação for bem-sucedida, confirme o `instanceName` e use-o no backend.

3) Configurar o backend (onde roda o `backend` do CineGeração)

- No serviço do BACKEND (Render, Railway, Vercel, etc), adicione as variáveis de ambiente:
  - `WHATSAPP_API_URL=https://<EVOLUTION_URL>`
  - `WHATSAPP_API_KEY=<AUTHENTICATION_API_KEY>`
  - `WHATSAPP_API_INSTANCE_NAME=default`
- Reinicie o serviço do backend.

4) Testes rápidos

- Teste enviar mensagem diretamente para a Evolution API:
```bash
curl -X POST "https://<EVOLUTION_URL>/message/sendText/default" \
  -H "Content-Type: application/json" \
  -H "apikey: <AUTHENTICATION_API_KEY>" \
  -d '{"number":"5511999999999","textMessage":{"text":"Teste"}}'
```

- Teste seu endpoint no backend (requere admin auth):
```bash
curl -X POST "https://<SEU_BACKEND>/api/inscricoes/evento/<EVENTO_ID>/lembrete-pagamento" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json"
```

5) Notas de segurança

- NUNCA exponha `WHATSAPP_API_KEY` no frontend. Coloque somente no backend.
- Use variáveis de ambiente do host (Render Dashboard → Environment) — não comite chaves em repositórios.
