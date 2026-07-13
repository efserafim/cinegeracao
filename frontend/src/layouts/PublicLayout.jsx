import { Link, Outlet } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { logoImg } from "../assets/brand";
import SpiderMark from "../components/SpiderMark";
import { disablePublicPwaInstall } from "../lib/pwa";

export default function PublicLayout() {
  const { theme, toggle } = useTheme();

  useEffect(() => {
    disablePublicPwaInstall();
  }, []);

  return (
    <div className="bg-page min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070a12]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="CineGeração"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#e11d2e]/80 transition group-hover:ring-[#e11d2e]"
            />
            <span className="leading-tight">
              <span className="block font-display text-base tracking-wide text-white">CINEGERAÇÃO</span>
              <span className="spidey-title mt-0.5 block font-display text-[11px] leading-none tracking-[0.06em] text-[#e11d2e] sm:text-xs">
                HOMEM-ARANHA: UM NOVO DIA
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="relative overflow-hidden bg-[#070a12] px-4 py-14 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(225,29,46,0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(26,108,255,0.18), transparent 55%)",
          }}
        />
        <SpiderMark className="pointer-events-none absolute -right-6 -top-4 h-36 w-36 rotate-12 opacity-[0.12]" />
        <SpiderMark className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 -rotate-12 opacity-[0.08]" />

        <div className="relative mx-auto max-w-lg">
          <div className="mb-4 flex justify-center">
            <SpiderMark className="h-7 w-7" glow />
          </div>
          <p className="font-display text-xl tracking-wide text-white">CINEGERAÇÃO</p>
          <p className="spidey-title mt-1.5 font-display text-sm tracking-[0.06em] text-[#e11d2e] sm:text-base">
            HOMEM-ARANHA: UM NOVO DIA
          </p>

          <p className="mt-6 text-sm font-medium tracking-wide text-white/80">
            Grupo Jovem Geração Eucarística
          </p>

          <div className="mx-auto mt-8 h-px w-16 bg-gradient-to-r from-transparent via-[#e11d2e]/70 to-transparent" />

          <p className="mt-6 text-xs leading-relaxed text-white/45">
            Paróquia Santo Antônio · Bacaxá · Saquarema/RJ
            <br />
            Dúvidas: Eduardo (22) 99247-3724 · Lavínia (22) 99818-7602
          </p>
        </div>
      </footer>
    </div>
  );
}
