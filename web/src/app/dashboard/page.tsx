'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderPlus, Code2, Trash2, LogOut, ArrowRight } from 'lucide-react';
import { api, Teacher } from '@/lib/api';
import { Project } from '@/lib/projects';
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Teacher | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Teacher>('/auth/me').then(setUser).then(() => api<Project[]>('/projects')).then(setProjects).catch(() => router.replace('/login'));
  }, [router]);
  async function create(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim() || busy) return;
    setBusy(true); setError('');
    try { const p = await api<Project>('/projects', { method: 'POST', body: JSON.stringify({ name }) }); router.push(`/projects/${p.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al crear el proyecto'); setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm('¿Eliminar este proyecto y todos sus archivos?')) return;
    try { await api(`/projects/${id}`, { method: 'DELETE' }); setProjects(p => p.filter(x => x.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al eliminar'); }
  }
  async function logout() { await api('/auth/logout', { method: 'POST' }); router.replace('/login'); }
  return <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
    <header className="flex flex-wrap justify-between items-center gap-4"><Link href="/dashboard" className="flex items-center gap-3 text-xl font-bold"><Code2 className="text-blue-400"/> LiveCode Classroom</Link><button onClick={logout} className="flex items-center gap-2 text-slate-300 hover:text-white"><LogOut size={16}/> Cerrar sesión</button></header>
    {!user ? <p>Verificando sesión…</p> : <>
      <div><p className="text-blue-400 text-sm font-semibold">WORKSPACE DEL PROFESOR</p><h1 className="text-4xl font-bold mt-2">Hola, {user.name}</h1><p className="text-slate-400 mt-2">Organiza tus proyectos y comienza a programar.</p></div>
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6"><h2 className="text-lg font-semibold mb-4">Nuevo proyecto</h2><form onSubmit={create} className="flex flex-col sm:flex-row gap-3"><input aria-label="Nombre del proyecto" placeholder="Ej. Mi primera aplicación React" value={name} onChange={e => setName(e.target.value)} maxLength={120} required/><button disabled={busy} className="shrink-0 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"><FolderPlus size={18}/> Crear proyecto</button></form></section>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <section><h2 className="text-xl font-semibold mb-4">Mis proyectos ({projects.length})</h2>{projects.length === 0 ? <p className="text-slate-400">Todavía no tienes proyectos. ¡Crea el primero!</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{projects.map(p => <div key={p.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5"><Code2 className="text-blue-400 mb-3"/><h3 className="font-semibold truncate">{p.name}</h3><p className="text-xs text-slate-400 mt-2">Actualizado {new Date(p.updatedAt).toLocaleDateString()}</p><div className="flex items-center justify-between mt-5"><Link href={`/projects/${p.id}`} className="flex items-center gap-2 text-blue-400 hover:text-blue-300">Abrir editor <ArrowRight size={16}/></Link><button aria-label={`Eliminar ${p.name}`} onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={17}/></button></div></div>)}</div>}</section>
    </>}
  </main>;
}
