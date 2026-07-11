import { Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import EventoPage from './pages/EventoPage.jsx';
import InscricaoPage from './pages/InscricaoPage.jsx';
import PagamentoPage from './pages/PagamentoPage.jsx';
import IngressoPage from './pages/IngressoPage.jsx';
import ConsultarPage from './pages/ConsultarPage.jsx';
import LoginPage from './pages/admin/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import EventosAdminPage from './pages/admin/EventosAdminPage.jsx';
import EventoFormPage from './pages/admin/EventoFormPage.jsx';
import InscritosPage from './pages/admin/InscritosPage.jsx';
import ComprovantePage from './pages/admin/ComprovantePage.jsx';
import ValidarPage from './pages/admin/ValidarPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/consultar" element={<ConsultarPage />} />
        <Route path="/evento/:id" element={<EventoPage />} />
        <Route path="/evento/:id/inscrever" element={<InscricaoPage />} />
        <Route path="/inscricao/:codigo" element={<PagamentoPage />} />
        <Route path="/ingresso/:codigoInscricao" element={<IngressoPage />} />
      </Route>

      <Route path="/admin/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="eventos" element={<EventosAdminPage />} />
        <Route path="eventos/novo" element={<EventoFormPage />} />
        <Route path="eventos/:id/editar" element={<EventoFormPage />} />
        <Route path="eventos/:id/inscritos" element={<InscritosPage />} />
        <Route path="inscricoes/:id" element={<ComprovantePage />} />
        <Route path="validar" element={<ValidarPage />} />
      </Route>
    </Routes>
  );
}
