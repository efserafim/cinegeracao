import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';

/** Consulta rápida por código de inscrição. */
export default function ConsultarPage() {
  const [codigo, setCodigo] = useState('');
  const navigate = useNavigate();

  function go(e) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (!c) return;
    navigate(`/inscricao/${c}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 animate-fade-up">
      <h1 className="font-display text-2xl">Consultar inscrição</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)] dark:text-slate-400">
        Digite o código (ex.: INS-XXXXXXXX).
      </p>
      <form onSubmit={go} className="mt-6 space-y-4">
        <Input
          label="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="INS-XXXXXXXX"
        />
        <Button type="submit" className="w-full">Buscar</Button>
      </form>
    </div>
  );
}
