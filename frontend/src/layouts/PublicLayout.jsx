import { Link, Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { logoImg } from '../assets/brand';
import SpiderMark from '../components/SpiderMark';

export default function PublicLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="bg-page min-h-screen">
      <header className="fixed inset-x-0 top-0 z-20 bg-gradient-to-b from-[#070a12]/95 via-[#070a12]/70 to-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="CineGeração"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#e11d2e]/80"
            />
            <span className="leading-tight">
              <span className="block font-display text-base tracking-wide text-white">CINEGERAÇÃO</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#f5c542]">
                Homem-Aranha: Um novo dia
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="relative overflow-hidden border-t border-[#e11d2e]/15 px-4 py-12 dark:border-[#e11d2e]/25">
        <SpiderMark className="pointer-events-none absolute -right-6 -top-4 h-36 w-36 rotate-12 opacity-[0.1]" />
        <SpiderMark className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 -rotate-12 opacity-[0.07]" />
        <div className="relative mx-auto max-w-md text-center text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
          <div className="mb-3 flex items-center justify-center gap-2">
            <SpiderMark className="h-6 w-6" glow />
          </div>
          <p className="font-display text-lg tracking-wide text-[var(--color-ink)] dark:text-white">CINEGERAÇÃO</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#e11d2e]">Homem-Aranha: Um novo dia</p>
          <p className="mt-3 leading-relaxed">
            Paróquia Santo Antônio · Bacaxá · Saquarema/RJ
            <br />
            Dúvidas: Eduardo (22) 99247-3724 · Lavínia (22) 99818-7602
          </p>
        </div>
      </footer>
    </div>
  );
}
