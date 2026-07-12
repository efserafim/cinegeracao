/**
 * Símbolo da aranha (PNG sem fundo).
 * tone="auto" = vermelha no claro / branca no escuro
 * tone="light" = sempre branca (sobre fundos escuros)
 * tone="ink" = sempre vermelha
 */
export default function SpiderMark({ className = '', tone = 'auto', glow = false, ...props }) {
  const toneClass =
    tone === 'light'
      ? ''
      : tone === 'ink'
        ? 'spider-mark-ink'
        : 'spider-mark-auto';

  const img = (
    <img
      src="/image/aranha.png"
      alt=""
      aria-hidden
      className={`object-contain select-none ${toneClass} ${glow ? '' : className}`}
      {...props}
    />
  );

  if (!glow) return img;

  return (
    <span className={`inline-flex animate-pulse-glow ${className}`}>
      <img
        src="/image/aranha.png"
        alt=""
        aria-hidden
        className={`h-full w-full object-contain select-none ${toneClass}`}
        {...props}
      />
    </span>
  );
}
