import { MapPin, ExternalLink } from 'lucide-react';

const MAPS_LINK =
  'https://www.google.com/maps/place/Maximovie+Bacax%C3%A1+(Saquarema)/data=!4m2!3m1!1s0x0:0xfac9b9fad0b0ae6c';

const MAPS_EMBED =
  'https://maps.google.com/maps?q=Maximovie+Bacax%C3%A1+Saquarema+Rua+Beatriz+Amaral+Pereira+106&hl=pt-BR&z=16&output=embed';

/**
 * Mapa do Cinema MaxiMovie Bacaxá (Saquarema).
 */
export default function CinemaMapa({ variant = 'light' }) {
  const dark = variant === 'dark';

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        dark
          ? 'border-white/10 bg-white/5 text-white'
          : 'border-black/5 bg-white/90 dark:border-white/10 dark:bg-slate-900/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${dark ? 'text-[#f5c542]' : 'text-[#e11d2e]'}`}>
            Como chegar
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-sm font-medium">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span>
              Cinema MaxiMovie
              <span className={`mt-0.5 block text-xs font-normal ${dark ? 'text-white/60' : 'text-[var(--color-ink-soft)]'}`}>
                Rua Beatriz Amaral Pereira, 106 – Bacaxá – Saquarema/RJ
              </span>
            </span>
          </p>
        </div>
        <a
          href={MAPS_LINK}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            dark
              ? 'bg-white/10 text-white hover:bg-white/15'
              : 'bg-[#e11d2e]/10 text-[#e11d2e] hover:bg-[#e11d2e]/15'
          }`}
        >
          Abrir mapa <ExternalLink size={12} />
        </a>
      </div>

      <div className="mt-3 aspect-[16/10] w-full sm:aspect-[21/9]">
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
  );
}
