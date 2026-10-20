'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronRight, Code2, FilePlus2, FolderPlus, Save, Trash2, Pencil, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Room, SOCKET_URL, Participant } from '@/lib/rooms';
import { io, Socket } from 'socket.io-client';
import { Project, ProjectNode } from '@/lib/projects';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const language = (name: string) => ({ ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', css: 'css', html: 'html', md: 'markdown', py: 'python', java: 'java', kt: 'kotlin', sql: 'sql' }[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'plaintext');
export default function ProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tabs, setTabs] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [width, setWidth] = useState(260);
  const [dirty, setDirty] = useState<string[]>([]);
  const projectRef = useRef<Project | null>(null);
  const dirtyRef = useRef<Set<string>>(new Set());
  const savingRef = useRef(false);
  const load = useCallback(async () => { try { const p = await api<Project>(`/projects/${id}`); projectRef.current = p; setProject(p); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el proyecto'); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    api<Room[]>('/rooms').then(rooms => setRoom(rooms.find(r => r.projectId === id && r.active) ?? null)).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (!room) return;
    const socket = io(SOCKET_URL, { withCredentials: true, reconnection: true });
    socketRef.current = socket;
    const join = () => socket.emit('room:join', { roomId: room.id }, (response: { ok?: boolean }) => {
      if (!response?.ok) setError('No se pudo conectar a la sala');
    });
    socket.on('connect', join);
    socket.on('room:participants', (users: Participant[]) => setParticipants(users));
    socket.on('project:changed', () => {});
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [room]);
  useEffect(() => { if (room && socketRef.current?.connected) socketRef.current.emit('teacher:focus', { fileId: selected }); }, [room, selected]);
  async function createRoom() {
    const name = window.prompt('Nombre de la sala:', `Clase: ${project?.name ?? 'Proyecto'}`);
    if (!name) return;
    try { const created = await api<Room>('/rooms', { method: 'POST', body: JSON.stringify({ name, projectId: id }) }); setRoom(created); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la sala'); }
  }
  async function closeRoom() {
    if (!room || !window.confirm('¿Cerrar la sala para todos los alumnos?')) return;
    try { await api(`/rooms/${room.id}`, { method: 'DELETE' }); setRoom(null); setParticipants([]); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cerrar la sala'); }
  }
  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    const ids = [...dirtyRef.current];
    try {
      for (const nodeId of ids) {
        const node = projectRef.current?.nodes?.find(n => n.id === nodeId);
        if (!node) continue;
        await api(`/projects/${id}/nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify({ content: node.content }) });
        if (projectRef.current?.nodes?.find(n => n.id === nodeId)?.content === node.content) dirtyRef.current.delete(nodeId);
      }
      setDirty([...dirtyRef.current]); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { savingRef.current = false; setSaving(false); }
  }, [id]);
  useEffect(() => { const timer = setInterval(() => { if (dirtyRef.current.size) void save(); }, 2500); return () => clearInterval(timer); }, [save]);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [save]);
  function updateContent(content: string | undefined) {
    if (!selected || content === undefined || !projectRef.current) return;
    const p = { ...projectRef.current, nodes: projectRef.current.nodes?.map(n => n.id === selected ? { ...n, content } : n) };
    projectRef.current = p; setProject(p); dirtyRef.current.add(selected); setDirty([...dirtyRef.current]);
  }
  function openNode(node: ProjectNode) {
    if (node.kind === 'FOLDER') { setExpanded(v => v.includes(node.id) ? v.filter(x => x !== node.id) : [...v, node.id]); return; }
    setSelected(node.id); setTabs(v => v.includes(node.id) ? v : [...v, node.id]);
  }
  async function mutate(action: () => Promise<unknown>) { try { await save(); await action(); await load(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Operación fallida'); } }
  async function add(kind: 'FILE' | 'FOLDER', parentId?: string) {
    const name = window.prompt(kind === 'FILE' ? 'Nombre del archivo:' : 'Nombre de la carpeta:'); if (!name) return;
    await mutate(async () => { const node = await api<ProjectNode>(`/projects/${id}/nodes`, { method: 'POST', body: JSON.stringify({ name, kind, parentId }) }); if (parentId) setExpanded(v => [...new Set([...v, parentId])]); if (kind === 'FILE') openNode(node); });
  }
  async function rename(node: ProjectNode) { const name = window.prompt('Nuevo nombre:', node.name); if (!name || name === node.name) return; await mutate(() => api(`/projects/${id}/nodes/${node.id}`, { method: 'PATCH', body: JSON.stringify({ name }) })); }
  async function remove(node: ProjectNode) { if (!window.confirm(`¿Eliminar ${node.name} y su contenido?`)) return; await mutate(() => api(`/projects/${id}/nodes/${node.id}`, { method: 'DELETE' })); setTabs(t => t.filter(x => x !== node.id)); if (selected === node.id) setSelected(null); }
  const nodes = project?.nodes ?? [];
  const current = nodes.find(n => n.id === selected && n.kind === 'FILE');
  function renderTree(parentId: string | null, depth = 0): React.ReactNode {
    return nodes.filter(n => n.parentId === parentId).sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'FOLDER' ? -1 : 1)).map(n => <div key={n.id}>
      <div style={{ paddingLeft: 12 + depth * 14 }} className={`group flex items-center gap-1 pr-2 hover:bg-slate-700/60 ${selected === n.id ? 'bg-slate-700' : ''}`}>
        <button title={n.name} className="flex-1 min-w-0 flex items-center gap-1.5 py-1.5 text-left text-sm" onClick={() => openNode(n)}>{n.kind === 'FOLDER' ? (expanded.includes(n.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>) : <Code2 size={13} className="text-blue-400"/>}<span className="truncate">{n.name}</span></button>
        <button title="Renombrar" onClick={() => rename(n)} className="opacity-0 group-hover:opacity-100 focus:opacity-100"><Pencil size={12}/></button>
        {n.kind === 'FOLDER' && <><button title="Nuevo archivo" onClick={() => add('FILE', n.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100"><FilePlus2 size={13}/></button><button title="Nueva carpeta" onClick={() => add('FOLDER', n.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100"><FolderPlus size={13}/></button></>}
        <button title="Eliminar" onClick={() => remove(n)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-400"><Trash2 size={12}/></button>
      </div>
      {n.kind === 'FOLDER' && expanded.includes(n.id) && renderTree(n.id, depth + 1)}
    </div>);
  }
  return <main className="h-screen flex flex-col bg-[#0d111c] text-slate-200 overflow-hidden">
    <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-slate-700 bg-[#161e2e]"><div className="flex items-center gap-3 min-w-0"><Link href="/dashboard" title="Volver al dashboard" className="text-blue-400"><Code2 size={21}/></Link><span className="text-sm font-semibold truncate">{project?.name ?? 'Cargando…'}</span><span className="hidden sm:inline text-xs text-slate-500">/ Editor</span></div><div className="flex items-center gap-3">{room ? <div className="flex items-center gap-2 text-xs"><span className="text-green-400">Sala {room.code}</span><button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?code=${room.code}`)} className="underline">Copiar enlace</button><span>{participants.length} conectados</span><button onClick={closeRoom} className="text-red-300">Cerrar sala</button></div> : <button onClick={createRoom} className="rounded border border-blue-500 px-2 py-1 text-xs">Iniciar clase</button>}<span className="text-xs text-slate-400">{saving ? 'Guardando…' : dirty.length ? 'Sin guardar' : 'Guardado'}</span><button onClick={() => void save()} className="flex items-center gap-2 rounded bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs"><Save size={14}/> Guardar</button></div></header>
    {error && <div role="alert" className="px-4 py-2 text-xs bg-red-950 text-red-300">{error} <button onClick={() => setError('')} className="ml-3 underline">Cerrar</button></div>}
    <div className="flex flex-1 min-h-0">
      {sidebar && <aside style={{ width }} className="shrink-0 bg-[#172033] border-r border-slate-700 flex flex-col min-w-[180px]"><div className="h-10 px-3 flex items-center justify-between text-xs font-bold text-slate-400"><span>EXPLORADOR</span><div className="flex gap-3"><button title="Nuevo archivo" onClick={() => add('FILE')}><FilePlus2 size={16}/></button><button title="Nueva carpeta" onClick={() => add('FOLDER')}><FolderPlus size={16}/></button></div></div><div className="overflow-auto flex-1">{renderTree(null)}</div></aside>}
      {sidebar && <div role="separator" aria-label="Redimensionar explorador" className="w-1 cursor-col-resize hover:bg-blue-500" onPointerDown={e => { const startX = e.clientX, start = width; const move = (event: PointerEvent) => setWidth(Math.max(180, Math.min(520, start + event.clientX - startX))); const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); }}/>} 
      <section className="flex flex-col min-w-0 flex-1"><div className="h-10 flex items-center border-b border-slate-700 bg-[#141c2a]"><button title="Mostrar/ocultar explorador" className="px-3 text-slate-400" onClick={() => setSidebar(v => !v)}>{sidebar ? <PanelLeftClose size={16}/> : <PanelLeftOpen size={16}/>}</button><div className="flex overflow-x-auto flex-1">{tabs.map(tabId => { const n = nodes.find(x => x.id === tabId); if (!n) return null; return <div key={tabId} className={`flex items-center border-r border-slate-700 text-xs ${selected === tabId ? 'bg-[#0d111c]' : 'bg-[#202b3d]'}`}><button onClick={() => setSelected(tabId)} className="px-3 py-3 whitespace-nowrap">{n.name}{dirty.includes(tabId) ? ' ●' : ''}</button><button title="Cerrar pestaña" className="pr-2 text-slate-400" onClick={() => { const next = tabs.filter(x => x !== tabId); setTabs(next); if (selected === tabId) setSelected(next.at(-1) ?? null); }}><X size={13}/></button></div>; })}</div></div>
      <div className="flex-1 min-h-0">{current ? <Editor key={current.id} height="100%" theme="vs-dark" path={current.name} language={language(current.name)} value={current.content} onChange={updateContent} options={{ minimap: { enabled: true }, fontSize: 14, automaticLayout: true, wordWrap: 'on', scrollBeyondLastLine: false }}/>: <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500"><Code2 size={48}/><p>Selecciona un archivo o crea uno nuevo.</p></div>}</div></section>
    </div><footer className="h-6 px-4 flex items-center justify-between bg-blue-700 text-xs"><span>LiveCode Classroom · Sprint 3</span><span>{current ? language(current.name) : 'Sin archivo'} · {nodes.length} elementos</span></footer>
  </main>;
}
