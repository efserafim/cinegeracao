/**
 * Símbolo da aranha (PNG sem fundo).
 */
export default function SpiderMark({ className = '', ...props }) {
  return (
    <img
      src="/image/aranha.png"
      alt=""
      aria-hidden
      className={`object-contain select-none ${className}`}
      {...props}
    />
  );
}
