import { Navigate, useParams } from 'react-router-dom';

/** Página de evento removida — redireciona direto ao formulário. */
export default function EventoPage() {
  const { id } = useParams();
  return <Navigate to={`/evento/${id}/inscrever`} replace />;
}
