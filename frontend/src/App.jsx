import { Routes, Route, Navigate, useParams } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import PagamentoPage from "./pages/PagamentoPage.jsx";
import IngressoPage from "./pages/IngressoPage.jsx";
import ConsultarPage from "./pages/ConsultarPage.jsx";
import LoginPage from "./pages/admin/LoginPage.jsx";
import DashboardPage from "./pages/admin/DashboardPage.jsx";
import EventosAdminPage from "./pages/admin/EventosAdminPage.jsx";
import EventoFormPage from "./pages/admin/EventoFormPage.jsx";
import InscritosPage from "./pages/admin/InscritosPage.jsx";
import ComprovantePage from "./pages/admin/ComprovantePage.jsx";
import ValidarPage from "./pages/admin/ValidarPage.jsx";
import ChamadaPage from "./pages/admin/ChamadaPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function RedirectToInscricao() {
  const { id } = useParams();
  const to = id ? `/?evento=${encodeURIComponent(id)}#inscricao` : "/#inscricao";
  return <Navigate to={to} replace />;
}

function DashboardOrRedirect() {
  const { isLeitor } = useAuth();
  if (isLeitor) return <Navigate to="/admin/validar" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/consultar" element={<ConsultarPage />} />
        <Route path="/evento/:id" element={<RedirectToInscricao />} />
        <Route path="/evento/:id/inscrever" element={<RedirectToInscricao />} />
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
        <Route index element={<DashboardOrRedirect />} />
        <Route path="eventos" element={<EventosAdminPage />} />
        <Route
          path="eventos/novo"
          element={
            <ProtectedRoute perfis={["ADMIN"]}>
              <EventoFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="eventos/:id/editar"
          element={
            <ProtectedRoute perfis={["ADMIN"]}>
              <EventoFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="eventos/:id/inscritos"
          element={
            <ProtectedRoute perfis={["ADMIN"]}>
              <InscritosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inscricoes/:id"
          element={
            <ProtectedRoute perfis={["ADMIN"]}>
              <ComprovantePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="chamada"
          element={
            <ProtectedRoute perfis={["ADMIN"]}>
              <ChamadaPage />
            </ProtectedRoute>
          }
        />
        <Route path="validar" element={<ValidarPage />} />
      </Route>
    </Routes>
  );
}
