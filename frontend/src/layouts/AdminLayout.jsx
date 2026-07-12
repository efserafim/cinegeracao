import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, QrCode, LogOut, Moon, Sun, ClipboardList } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { logoImg } from "../assets/brand";
import SpiderMark from "../components/SpiderMark";
const links = [
  { to: "/admin", end: true, label: "Dashboard", short: "Início", icon: LayoutDashboard },
  { to: "/admin/eventos", label: "Eventos", short: "Eventos", icon: Calendar },
  { to: "/admin/chamada", label: "Chamada", short: "Chamada", icon: ClipboardList },
  { to: "/admin/validar", label: "Validar entrada", short: "Validar", icon: QrCode }
];
export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  function handleLogout() {
    logout();
    navigate("/admin/login");
  }
  return <div className="bg-page flex min-h-screen">
      <aside className="relative hidden w-64 shrink-0 overflow-hidden border-r border-black/5 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 md:block">
        <SpiderMark className="pointer-events-none absolute -right-6 bottom-8 h-28 w-28 opacity-[0.06]" />
        <Link to="/admin" className="relative flex items-center gap-2.5">
          <span className="relative">
            <img src={logoImg} alt="" className="h-10 w-10 rounded-full ring-2 ring-[#e11d2e]/50" />
            <SpiderMark className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5" />
          </span>
          <span>
            <span className="block font-display text-lg leading-none text-[#e11d2e]">CineGeração</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] dark:text-slate-400">
              Admin
            </span>
          </span>
        </Link>

        <nav className="relative mt-8 flex flex-col gap-1.5">
          {links.map(({ to, end, label, icon: Icon }) => <NavLink
    key={to}
    to={to}
    end={end}
    className={({ isActive }) => `flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-[#e11d2e] text-white shadow-md shadow-red-900/20" : "text-[var(--color-ink-soft)] hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"}`}
  >
              <Icon size={16} />
              {label}
            </NavLink>)}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-black/5 bg-white/50 px-3 py-2.5 backdrop-blur dark:border-white/10 dark:bg-slate-950/40 sm:px-4">
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 md:hidden">
            {links.map(({ to, end, short, icon: Icon }) => <NavLink
    key={to}
    to={to}
    end={end}
    className={({ isActive }) => `inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${isActive ? "bg-[#e11d2e] text-white" : "bg-black/5 text-[var(--color-ink-soft)] dark:bg-white/10 dark:text-slate-300"}`}
  >
                <Icon size={12} />
                {short}
              </NavLink>)}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            <span className="hidden text-sm text-[var(--color-ink-soft)] sm:inline dark:text-slate-300">
              {admin?.nome}
            </span>
            <button
    type="button"
    onClick={toggle}
    className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
    aria-label="Alternar tema"
  >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
    type="button"
    onClick={handleLogout}
    className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
  >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>;
}
