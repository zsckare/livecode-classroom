'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Teacher } from '@/lib/api';
export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api<Teacher>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(mode === 'register' ? { name, email, password } : { email, password }) });
      router.replace('/dashboard');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error inesperado'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
    <Link href="/" className="text-sm text-blue-400">← LiveCode Classroom</Link>
    <h1 className="text-3xl font-bold">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta de profesor'}</h1>
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode === 'register' && <label className="space-y-2">Nombre<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} /></label>}
      <label className="space-y-2">Correo electrónico<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label className="space-y-2">Contraseña<input required type="password" minLength={mode === 'register' ? 10 : undefined} value={password} onChange={e=>setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <button disabled={busy} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold disabled:opacity-50">{busy ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Registrarme'}</button>
    </form>
    <Link className="text-blue-400" href={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}</Link>
  </main>;
}
