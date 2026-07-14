import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Minus, Plus, Ticket } from "lucide-react";
import api, { formatMoney } from "../services/api";
import { Button, StatusBadge } from "./ui";
import SpiderMark from "./SpiderMark";

const MAX_INGRESSOS = 10;

const fieldClass =
  "w-full rounded-[1.25rem] border border-black/10 bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:ring-2 focus:ring-[#e11d2e] dark:border-white/15 dark:bg-slate-900 dark:text-white";

const panelClass =
  "rounded-[1.25rem] bg-white/80 p-4 shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10";

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function InscricaoForm({ evento }) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      metodoPagamento: "PIX",
      quantidade: 1,
      pessoas: [],
    },
  });
  const metodoPagamento = watch("metodoPagamento");
  const quantidade = Number(watch("quantidade") || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicata, setDuplicata] = useState(null);
  const guestsRef = useRef(null);

  const maxQtd = Math.min(MAX_INGRESSOS, Math.max(1, evento.vagasRestantes || 1));
  const total = Number(evento.valor) * quantidade;
  const esgotado = evento.vagasRestantes <= 0;
  const isPre = evento.status === "PRE_INSCRICAO" || evento.preInscricao === true;

  useEffect(() => {
    const extras = Math.max(0, quantidade - 1);
    const atual = [...(getValues("pessoas") || [])];
    while (atual.length < extras) atual.push("");
    while (atual.length > extras) atual.pop();
    setValue("pessoas", atual);
  }, [quantidade, getValues, setValue]);

  useEffect(() => {
    if (quantidade <= 1 || !guestsRef.current) return;
    const t = window.setTimeout(() => {
      guestsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [quantidade]);

  function alterarQuantidade(delta) {
    const next = Math.min(maxQtd, Math.max(1, quantidade + delta));
    setValue("quantidade", next);
  }

  async function onSubmit(values) {
    setLoading(true);
    setError("");
    setDuplicata(null);
    try {
      const qtd = Number(values.quantidade) || 1;
      const responsavel = String(values.nome || "").trim();
      const telefone = onlyDigits(values.telefone);
      const extras = (values.pessoas || []).slice(0, Math.max(0, qtd - 1)).map((p) => String(p || "").trim());
      const listaPessoas = [responsavel, ...extras];

      if (!responsavel || listaPessoas.length !== qtd || listaPessoas.some((p) => !p)) {
        setError(qtd === 1 ? "Informe o nome do responsável" : `Informe o nome de cada uma das ${qtd} pessoas`);
        return;
      }

      const payload = {
        ...values,
        telefone,
        quantidade: qtd,
        pessoas: listaPessoas,
        nome: responsavel,
      };
      const { data } = await api.post(`/inscricoes/evento/${evento.id}`, payload);
      navigate(`/inscricao/${data.data.inscricao.codigo}`);
    } catch (err) {
      const payload = err.response?.data;
      if (err.response?.status === 409 && payload?.data?.duplicada) {
        setDuplicata(payload.data);
        setError("");
      } else {
        setError(payload?.message || "Erro ao criar inscrição");
      }
    } finally {
      setLoading(false);
    }
  }

  if (esgotado) {
    return (
      <p className="rounded-[1.25rem] bg-amber-50 px-5 py-4 text-center text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        Vagas esgotadas para este evento.
      </p>
    );
  }

  if (duplicata) {
    return (
      <div className="space-y-4 rounded-[1.75rem] bg-[#f5c542]/12 p-5 ring-1 ring-[#f5c542]/35">
        <div className="flex items-start gap-3">
          <Ticket className="mt-0.5 shrink-0 text-[#e11d2e]" size={20} />
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)] dark:text-white">
              {duplicata.status === "PRE_INSCRITA" ? "Você já está pré-inscrito(a)" : "Você já está inscrito(a)"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-300">
              Encontramos um cadastro com este WhatsApp
              {duplicata.nome ? <> ({duplicata.nome})</> : null}. Use o código abaixo ou fale com Eduardo ou Lavínia.
            </p>
          </div>
        </div>
        <div className="rounded-[1.25rem] bg-white/80 px-4 py-4 text-center dark:bg-white/5">
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-soft)]">Seu código</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-[#e11d2e]">{duplicata.codigo}</p>
          {duplicata.status && (
            <p className="mt-2 flex justify-center">
              <StatusBadge status={duplicata.status} />
            </p>
          )}
        </div>
        <Button className="w-full !rounded-full" onClick={() => navigate(`/inscricao/${duplicata.codigo}`)}>
          Continuar com este código
        </Button>
        <button
          type="button"
          className="w-full text-center text-xs text-[var(--color-ink-soft)] underline dark:text-slate-400"
          onClick={() => setDuplicata(null)}
        >
          Tentar com outro WhatsApp
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nome do responsável" error={errors.nome?.message}>
        <input className={fieldClass} {...register("nome", { required: "Obrigatório" })} />
      </Field>
      <Field label="WhatsApp (com DDD)" error={errors.telefone?.message}>
        <input
          className={fieldClass}
          inputMode="numeric"
          placeholder="22999999999"
          {...register("telefone", {
            required: "Obrigatório",
            validate: (v) => {
              const d = onlyDigits(v);
              return (d.length >= 10 && d.length <= 11) || "Informe DDD + número (10 ou 11 dígitos)";
            },
          })}
        />
      </Field>
      <Field label="E-mail" error={errors.email?.message}>
        <input
          type="email"
          className={fieldClass}
          {...register("email", {
            required: "Obrigatório para receber a confirmação",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "E-mail inválido" },
          })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paróquia" error={errors.paroquia?.message}>
          <input className={fieldClass} {...register("paroquia", { required: "Obrigatório" })} />
        </Field>
        <Field label="Cidade" error={errors.cidade?.message}>
          <input className={fieldClass} {...register("cidade", { required: "Obrigatório" })} />
        </Field>
      </div>

      {!isPre && (
        <Field
          label="Chave PIX para devolução"
          error={errors.chavePixDevolucao?.message}
        >
          <input
            className={fieldClass}
            placeholder="CPF, celular, e-mail ou chave aleatória"
            {...register("chavePixDevolucao", {
              required: "Obrigatório — usamos só se precisar devolver o valor",
              validate: (v) => String(v || "").trim().length >= 5 || "Informe uma chave PIX válida",
            })}
          />
          <p className="mt-2 rounded-xl bg-[#f5c542]/25 px-3 py-2.5 text-sm font-semibold leading-snug text-[#7a4b00] ring-1 ring-[#f5c542]/50 dark:bg-[#f5c542]/15 dark:text-[#f5c542] dark:ring-[#f5c542]/35">
            Importante: em caso de problema (cancelamento, evento alterado etc.),{" "}
            <span className="underline decoration-2 underline-offset-2">devolvemos o pagamento nesta chave</span>.
          </p>
        </Field>
      )}

      <div className={panelClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-slate-400">
              {isPre ? "Quantidade de pessoas" : "Quantidade de ingressos"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink)] dark:text-white">
              {isPre ? (
                <>Previsão de vagas · valor se confirmar: <strong className="text-[#e11d2e]">{formatMoney(total)}</strong></>
              ) : (
                <>Total: <strong className="text-[#e11d2e]">{formatMoney(total)}</strong></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alterarQuantidade(-1)}
              disabled={quantidade <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e11d2e]/10 text-[#e11d2e] disabled:opacity-40"
              aria-label="Diminuir"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[2rem] text-center font-display text-2xl text-[var(--color-ink)] dark:text-white">
              {quantidade}
            </span>
            <button
              type="button"
              onClick={() => alterarQuantidade(1)}
              disabled={quantidade >= maxQtd}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e11d2e] text-white disabled:opacity-40"
              aria-label="Aumentar"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <input type="hidden" {...register("quantidade", { valueAsNumber: true })} />
      </div>

      {quantidade > 1 && (
        <div
          ref={guestsRef}
          data-scroll-anchor
          className="overflow-hidden rounded-[1.35rem] ring-2 ring-[#e11d2e]/45 dark:ring-[#e11d2e]/50"
        >
          <div className="bg-gradient-to-r from-[#e11d2e] to-[#b01422] px-4 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white">
              Nome das outras pessoas
            </p>
          </div>
          <div className="space-y-3 bg-[#e11d2e]/[0.06] p-4 dark:bg-[#e11d2e]/15">
            <p className="rounded-xl bg-[#f5c542]/20 px-3 py-2 text-sm font-semibold leading-snug text-[#7a4b00] dark:bg-[#f5c542]/15 dark:text-[#f5c542]">
              A pessoa 1 usa o nome do responsável. Informe quem mais vai:
            </p>
            {Array.from({ length: quantidade - 1 }).map((_, idx) => (
              <Field key={idx} label={`Pessoa ${idx + 2}`} error={errors.pessoas?.[idx]?.message}>
                <input className={fieldClass} {...register(`pessoas.${idx}`, { required: "Obrigatório" })} />
              </Field>
            ))}
          </div>
        </div>
      )}

      {!isPre && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-slate-400">
            Forma de pagamento
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { id: "PIX", title: "PIX", hint: "Pague e envie o comprovante" },
              { id: "DINHEIRO", title: "Dinheiro", hint: "Entregue a Eduardo ou Lavínia" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setValue("metodoPagamento", opt.id)}
                className={`rounded-[1.25rem] px-4 py-3 text-left text-sm transition ring-1 ${
                  metodoPagamento === opt.id
                    ? "bg-[#e11d2e]/10 ring-[#e11d2e] font-semibold text-[var(--color-ink)] dark:text-white"
                    : "bg-white/70 ring-black/5 dark:bg-white/5 dark:ring-white/10"
                }`}
              >
                <span className="block font-semibold">{opt.title}</span>
                <span className="mt-0.5 block text-xs text-[var(--color-ink-soft)] dark:text-slate-400">{opt.hint}</span>
              </button>
            ))}
          </div>
          <input type="hidden" {...register("metodoPagamento")} />
        </div>
      )}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading} className="mt-2 w-full !rounded-full py-3.5 shadow-md shadow-red-900/15">
        <SpiderMark tone="light" className="h-4 w-4" />
        {loading
          ? isPre
            ? "Registrando…"
            : "Gerando..."
          : isPre
            ? `Confirmar pré-inscrição · ${quantidade} pessoa${quantidade > 1 ? "s" : ""}`
            : metodoPagamento === "DINHEIRO"
              ? `Confirmar ${quantidade} ingresso${quantidade > 1 ? "s" : ""} em dinheiro`
              : `Continuar para o PIX · ${formatMoney(total)}`}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-[var(--color-ink-soft)] dark:text-slate-400">
        {isPre
          ? "Sem pagamento por enquanto. Se a meta for atingida, avisamos para concluir a inscrição."
          : "Já se inscreveu? Consulte com o código e o e-mail da inscrição."}
      </p>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-slate-400">
        {label}
      </span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
