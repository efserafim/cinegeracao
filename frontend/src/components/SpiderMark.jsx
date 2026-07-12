/**
 * Símbolo da aranha (PNG sem fundo).
 * tone="auto" = branca no escuro / vermelha no claro
 * tone="light" = sempre branca (sobre hero escuro)
 * tone="ink" = sempre vermelha/escura
 */
export default function SpiderMark({ className = '', tone = 'auto', ...props }) {
  const toneClass =
    tone === 'light'
      ? ''
      : tone === 'ink'
        ? 'spider-mark-ink'
        : 'spider-mark-auto';

  return (
    <img
      src="/image/aranha.png"
      alt=""
      aria-hidden
      className={`object-contain select-none ${toneClass} ${className}`}
      {...props}
    />
  );
}
