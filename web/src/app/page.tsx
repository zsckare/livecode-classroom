import Link from 'next/link';
export default function Home() {
  return <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 px-6">
    <span className="text-sm font-bold uppercase tracking-widest text-blue-400">LiveCode Classroom</span>
    <h1 className="text-5xl font-bold tracking-tight">Enseña programación en tiempo real.</h1>
    <p className="max-w-2xl text-lg text-slate-400">Crea proyectos desde tu navegador y compártelos con tus alumnos mediante salas.</p>
    <div className="flex gap-3"><Link className="rounded-lg bg-blue-600 px-5 py-3 font-semibold" href="/register">Crear cuenta de profesor</Link>
    <Link className="rounded-lg border border-slate-600 px-5 py-3" href="/login">Iniciar sesión</Link></div>
    <p className="text-sm text-slate-500">El acceso de alumnos por código de sala estará disponible en el Sprint 3.</p>
  </main>;
}
