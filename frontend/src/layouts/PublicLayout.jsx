import { Link, Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { logoImg } from '../assets/brand';

export default function PublicLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="bg-page min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#070a12]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 lg:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="CineGeração"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#f5c542]/60"
            />
            <span className="leading-tight">
              <span className="block font-display text-base text-white">CineGeração</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#f5c542]">Homem-Aranha: Um novo dia</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggle}
              className="rounded-full p-2 text-white/70 hover:bg-white/10"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-black/5 px-4 py-8 dark:border-white/10">
        <div className="mx-auto max-w-md text-center text-xs text-[var(--color-ink-soft)] dark:text-slate-400">
          <p className="font-display text-base text-[var(--color-ink)] dark:text-white">CineGeração</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#e11d2e]/80">Homem-Aranha: Um novo dia</p>
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
