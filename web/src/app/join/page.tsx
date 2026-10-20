'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Project } from '@/lib/projects';
function JoinForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function join(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = await api<{ token: string; room: { id: string; project: Project } }>('/rooms/join', { method: 'POST', body: JSON.stringify({ code: code.trim(), name: name.trim() }) });
      sessionStorage.setItem(`livecode:guest:${data.room.id}`, data.token);
      router.push(`/classroom/${data.room.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo ingresar'); }
    finally { setLoading(false); }
  }
  return <form onSubmit={join} className="w-full max-w-sm rounded-xl bg-slate-800 p-8 space-y-5">
    <h1 className="text-2xl font-bold">Entrar a una clase</h1>
    <label className="block text-sm">Código de sala<input required minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value)} className="mt-2 w-full rounded bg-slate-900 p-3" placeholder="123456" /></label>
    <label className="block text-sm">Tu nombre<input required maxLength={60} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded bg-slate-900 p-3" placeholder="Nombre del alumno" /></label>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <button disabled={loading} className="w-full rounded bg-blue-600 p-3 font-semibold">{loading ? 'Ingresando…' : 'Entrar a la sala'}</button>
  </form>;
}
export default function JoinPage() { return <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white"><Suspense fallback={<p>Cargando…</p>}><JoinForm/></Suspense></main>; }
