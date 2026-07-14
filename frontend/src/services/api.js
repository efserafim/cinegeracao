import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("cg_token");
      localStorage.removeItem("cg_admin");
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);
export default api;
export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const explicit = import.meta.env.VITE_MEDIA_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}${path}`;
  const apiBase = import.meta.env.VITE_API_URL || "";
  if (apiBase.startsWith("http")) {
    const origin = apiBase.replace(/\/api\/?$/, "");
    return `${origin}${path}`;
  }
  return path;
}
export function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  // Evento.data é DATE no Postgres (meia-noite UTC). Usar UTC evita 01/08 virar 31/07 no Brasil.
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
export const STATUS_LABELS = {
  PRE_INSCRITA: "Pré-inscrita",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  COMPROVANTE_ENVIADO: "Comprovante enviado",
  OCR_PROCESSADO: "OCR processado",
  AGUARDANDO_CONFIRMACAO: "Aguardando confirmação",
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  INGRESSO_LIBERADO: "Ingresso liberado",
  PAGAMENTO_RECUSADO: "Pagamento recusado",
  CANCELADA: "Cancelada"
};
export const ALERTA_LABELS = {
  NENHUM: "Nenhum",
  VALOR_INCORRETO: "Valor incorreto",
  NECESSITA_CONFERENCIA: "Necessita conferência",
  OCR_FALHOU: "OCR não conseguiu ler"
};
