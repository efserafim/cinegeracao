export const STATUS_EVENTO = {
  PRE_INSCRICAO: {
    label: "Pré-inscrição",
    hint: "Coletando interesse sem pagamento",
    dot: "bg-[#f5c542]",
    ping: true,
    className: "bg-[#f5c542]/20 text-[#7a4b00] ring-[#f5c542]/40 dark:text-[#f5c542]",
  },
  ABERTO: {
    label: "Online",
    hint: "Inscrições abertas",
    dot: "bg-emerald-500",
    ping: true,
    className: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  },
  ENCERRADO: {
    label: "Encerrado",
    hint: "Não recebe mais inscrições",
    dot: "bg-slate-400",
    ping: false,
    className: "bg-slate-500/15 text-slate-600 ring-slate-500/20 dark:text-slate-300",
  },
  RASCUNHO: {
    label: "Rascunho",
    hint: "Ainda não publicado",
    dot: "bg-amber-400",
    ping: false,
    className: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-200",
  },
  CANCELADO: {
    label: "Cancelado",
    hint: "Evento cancelado",
    dot: "bg-red-500",
    ping: false,
    className: "bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300",
  },
};
