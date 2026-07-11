import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import { logoImg } from '../../assets/brand';

export default function LoginPage() {
  const { login, supabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: 'efserafimflu@gmail.com' },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit({ email, senha }) {
    setLoading(true);
    setError('');
    try {
      await login(email, senha);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-page flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="animate-fade-up w-full max-w-md space-y-4 rounded-2xl border border-black/5 bg-white/90 p-8 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
      >
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="" className="h-14 w-14 rounded-full ring-2 ring-[#f5c542]/70" />
          <div>
            <p className="font-display text-2xl text-[#e11d2e]">CineGeração</p>
            <h1 className="text-sm font-medium text-[var(--color-ink-soft)]">
              {supabaseConfigured ? 'Login (Supabase)' : 'Acesso administrativo'}
            </h1>
          </div>
        </div>

        <Input
          label="E-mail"
          type="email"
          {...register('email', { required: 'Obrigatório' })}
          error={errors.email?.message}
        />
        <Input
          label="Senha"
          type="password"
          {...register('senha', { required: 'Obrigatório' })}
          error={errors.senha?.message}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
        <p className="text-center text-xs text-[var(--color-ink-soft)]">
          {supabaseConfigured
            ? 'Use o usuário criado em Authentication no Supabase (ou o admin local).'
            : <>Use <strong>admin@cinegeracao.local</strong> / <strong>Admin@123</strong></>}
        </p>
      </form>
    </div>
  );
}
