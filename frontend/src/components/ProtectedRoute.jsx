import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, perfis }) {
  const { isAuthenticated, perfil } = useAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (Array.isArray(perfis) && perfis.length > 0 && !perfis.includes(perfil || "ADMIN")) {
    return <Navigate to="/admin/validar" replace />;
  }
  return children;
}
