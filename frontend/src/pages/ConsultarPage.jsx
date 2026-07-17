import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Button, Input } from "../components/ui";

export default function ConsultarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function go(e) {
    e.preventDefault();
    setError("");
    const emailLimpo = String(email || "").trim();
    if (!emailLimpo) {
      setError("Informe o e-mail usado na inscrição.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/inscricoes/consultar", {
        email: emailLimpo,
      });
      navigate(`/inscricao/${data.data.codigo}`);
    } catch (err) {
      const details = err.response?.data?.errors;
      const fieldMsg = Array.isArray(details) && details[0]?.message ? details[0].message : "";
      const msg = err.response?.data?.message || "";
      if (fieldMsg.toLowerCase().includes("código") || fieldMsg.toLowerCase().includes("codigo")) {
        setError("A API ainda está atualizando. Aguarde 1–2 minutos e tente de novo.");
      } else if (msg && msg !== "Dados inválidos") {
        setError(msg);
      } else if (fieldMsg) {
        setError(fieldMsg);
      } else {
        setError(msg || "Não foi possível encontrar a inscrição.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 animate-fade-up">
      <h1 className="font-display text-2xl">Consultar inscrição</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
        Digite o e-mail cadastrado na inscrição.
      </p>
      <form onSubmit={go} className="mt-6 space-y-4">
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Buscando…" : "Consultar"}
        </Button>
      </form>
    </div>
  );
}
