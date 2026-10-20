'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Teacher } from '@/lib/api';
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Teacher | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Teacher>('/auth/me').then(setUser).catch(() => router.replace('/login'));
  }, [router]);
  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); router.replace('/login'); }
    catch { setError('No se pudo cerrar sesión. Inténtalo de nuevo.'); }
  }
  return <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
    <header className="flex items-center justify-between"><h1 className="text-2xl font-bold">LiveCode Classroom</h1><button onClick={logout} className="rounded-lg border border-slate-600 px-4 py-2">Cerrar sesión</button></header>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {!user ? <p>Verificando sesión…</p> : <section className="rounded-xl border border-slate-700 bg-slate-900 p-8">
      <h2 className="text-3xl font-bold">Hola, {user.name}</h2><p className="mt-3 text-slate-400">Tu cuenta de profesor está lista.</p>
      <p className="mt-6 text-sm text-blue-400">En el Sprint 2 agregaremos el editor, los proyectos y el explorador de archivos.</p>
    </section>}
  </main>;
}
