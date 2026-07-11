import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, QrCode, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { logoImg } from '../assets/brand';

const links = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/eventos', label: 'Eventos', icon: Calendar },
  { to: '/admin/validar', label: 'Validar entrada', icon: QrCode },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="bg-page flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-black/5 bg-white/60 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-900/60 md:block">
        <Link to="/admin" className="flex items-center gap-2">
          <img src={logoImg} alt="" className="h-9 w-9 rounded-full" />
          <span className="font-display text-lg text-[#e11d2e]">CineGeração</span>
        </Link>
        <p className="mt-1 text-xs text-[var(--color-ink-soft)] dark:text-slate-400">Painel administrativo</p>
        <nav className="mt-8 flex flex-col gap-1">
          {links.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[var(--color-forest)] text-white'
                    : 'text-[var(--color-ink-soft)] hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/10">
          <div className="flex gap-2 md:hidden">
            {links.map(({ to, end, label }) => (
              <NavLink key={to} to={to} end={end} className="text-xs font-medium text-[var(--color-forest)]">
                {label}
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-[var(--color-ink-soft)] sm:inline dark:text-slate-300">
              {admin?.nome}
            </span>
            <button type="button" onClick={toggle} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
