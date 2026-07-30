# Evolution API — vincular WhatsApp e configurar o backend

Use **WHATSAPP-BAILEYS** (QR code / WhatsApp Web). **Não** use `WHATSAPP-BUSINESS` a menos que tenha conta Meta Business API.

## 1) Evolution API no Render

No serviço **Evolution API** no Render, copie:

| Variável Evolution | Vai para o backend como |
|--------------------|-------------------------|
| `SERVER_URL` | `WHATSAPP_API_URL` |
| `AUTHENTICATION_API_KEY` | `WHATSAPP_API_KEY` |

Abra a URL da Evolution no navegador uma vez (Render free tier “acorda” o serviço).

## 2) Vincular WhatsApp (QR code)

### Opção A — script do projeto (Windows / PowerShell)

No `backend/.env`:

```env
WHATSAPP_API_URL=https://SUA-EVOLUTION.onrender.com
WHATSAPP_API_KEY=sua_authentication_api_key
WHATSAPP_API_INSTANCE_NAME=default
```

Depois:

```powershell
cd backend
node scripts/evolution-vincular.js
```

O QR é salvo em `backend/uploads/evolution-qr-default.png`. Escaneie no celular: **WhatsApp → Aparelhos conectados → Conectar aparelho**.

### Opção B — curl (criar instância)

**PowerShell** — use aspas duplas e JSON válido (erro comum: JSON quebrado → `Expected property name or '}'`):

```powershell
$headers = @{
  "Content-Type" = "application/json"
  "apikey" = "SUA_API_KEY"
}
$body = @{
  instanceName = "default"
  qrcode = $true
  integration = "WHATSAPP-BAILEYS"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://SUA-EVOLUTION.onrender.com/instance/create" -Headers $headers -Body $body
```

### Opção C — pegar QR de instância existente

```powershell
Invoke-RestMethod -Uri "https://SUA-EVOLUTION.onrender.com/instance/connect/default" -Headers @{ apikey = "SUA_API_KEY" }
```

### Conferir conexão

```powershell
Invoke-RestMethod -Uri "https://SUA-EVOLUTION.onrender.com/instance/connectionState/default" -Headers @{ apikey = "SUA_API_KEY" }
```

Estado **`open`** = vinculado.

## 3) Backend CineGeração (Render)

No serviço **cinegeracao** (backend), mesmas 3 variáveis:

```env
WHATSAPP_API_URL=https://SUA-EVOLUTION.onrender.com
WHATSAPP_API_KEY=sua_authentication_api_key
WHATSAPP_API_INSTANCE_NAME=default
```

Salve e aguarde redeploy.

## 4) Teste de envio

```powershell
$headers = @{ "Content-Type" = "application/json"; apikey = "SUA_API_KEY" }
$body = @{ number = "5522999999999"; text = "Teste CineGeração" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://SUA-EVOLUTION.onrender.com/message/sendText/default" -Headers $headers -Body $body
```

No painel admin: **Inscritos → Lembrete por e-mail** ou **Lembrete por WhatsApp** (somente status **Aguardando pagamento**).

## 5) Problemas comuns

| Sintoma | Solução |
|---------|---------|
| `Expected property name or '}' in JSON` | JSON inválido no POST — use o script ou `ConvertTo-Json` no PowerShell |
| QR não aparece | Rode `node scripts/evolution-vincular.js` de novo; no Render Evolution, atualize `WEB_VERSION` / `CONFIG_SESSION_PHONE_VERSION` (versão do WhatsApp Web) |
| Timeout / 502 | Evolution no Render dormindo — abra a URL e espere |
| Lembrete não envia | Confirme as 3 vars no **backend** Render (não só no `.env` local) |
| `instance not found` | `WHATSAPP_API_INSTANCE_NAME` diferente do nome criado |

## 6) Segurança

- **Nunca** coloque `WHATSAPP_API_KEY` no frontend ou no GitHub.
- Use Environment Variables do Render.
