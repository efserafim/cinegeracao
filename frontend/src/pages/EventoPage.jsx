import { Navigate, useParams } from "react-router-dom";
export default function EventoPage() {
  const { id } = useParams();
  return <Navigate to={`/evento/${id}/inscrever`} replace />;
}
