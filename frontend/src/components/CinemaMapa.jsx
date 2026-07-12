import { MapPin, ExternalLink } from "lucide-react";
const MAPS_LINK = "https://www.google.com/maps/place/Maximovie+Bacax%C3%A1+(Saquarema)/data=!4m2!3m1!1s0x0:0xfac9b9fad0b0ae6c";
const MAPS_EMBED = "https://maps.google.com/maps?q=Maximovie+Bacax%C3%A1+Saquarema+Rua+Beatriz+Amaral+Pereira+106&hl=pt-BR&z=16&output=embed";
export default function CinemaMapa() {
  return <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e11d2e] dark:text-[#f5c542]">
            Como chegar
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-[var(--color-ink)] dark:text-white">
            <MapPin size={16} className="mt-0.5 shrink-0 text-[#e11d2e]" />
            <span>
              Cinema MaxiMovie
              <span className="mt-0.5 block text-xs font-normal text-[var(--color-ink-soft)] dark:text-white/60">
                Rua Beatriz Amaral Pereira, 106 – Bacaxá – Saquarema/RJ
              </span>
            </span>
          </p>
        </div>
        <a
    href={MAPS_LINK}
    target="_blank"
    rel="noreferrer"
    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e11d2e]/10 px-3 py-1.5 text-xs font-semibold text-[#e11d2e] hover:bg-[#e11d2e]/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
  >
          Abrir mapa <ExternalLink size={12} />
        </a>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.75rem] shadow-[0_18px_50px_rgba(11,16,32,0.12)] ring-1 ring-black/5 dark:ring-white/10">
        <div className="aspect-[16/11] w-full sm:aspect-[2/1]">
          <iframe
    title="Localização Cinema MaxiMovie Bacaxá"
    src={MAPS_EMBED}
    className="h-full w-full border-0"
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    allowFullScreen
  />
        </div>
      </div>
    </div>;
}
