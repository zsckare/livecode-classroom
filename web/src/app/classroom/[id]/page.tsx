'use client';
import { use, useEffect, useRef, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { Project, ProjectNode } from '@/lib/projects';
import { Participant, SOCKET_URL } from '@/lib/rooms';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
type Event = { type: string; payload: ProjectNode | { nodeId: string } };
export default function Classroom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [cursor, setCursor] = useState<{ fileId: string; lineNumber: number; column: number } | null>(null);
  const revisions = useRef(new Map<string, number>());
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState('Conectando…');
  useEffect(() => {
    const token = sessionStorage.getItem(`livecode:guest:${id}`);
    if (!token) { setStatus('Necesitas ingresar con un código de sala.'); return; }
    const socket = io(SOCKET_URL, { reconnection: true });
    socketRef.current = socket;
    socket.on('connect', () => {
      setStatus('Sincronizando…');
      socket.emit('room:join', { roomId: id, token }, (response: { ok?: boolean; project?: Project; focus?: { fileId: string; lineNumber?: number; column?: number }; revisions?: Record<string, number> }) => {
        if (!response?.ok || !response.project) { setStatus('Acceso denegado o sala cerrada'); return; }
        revisions.current = new Map(Object.entries(response.revisions ?? {}));
        setProject(response.project);
        if (response.focus) { setFocus(response.focus.fileId); if (response.focus.lineNumber) setCursor(response.focus); }
        setStatus('En vivo');
      });
    });
    socket.on('disconnect', () => setStatus('Reconectando…'));
    socket.on('connect_error', () => setStatus('Error de conexión'));
    socket.on('room:participants', setParticipants);
    socket.on('teacher:focus', (event: { fileId: string | null }) => { setFocus(event.fileId); });
    socket.on('teacher:cursor', (position: { fileId: string; lineNumber: number; column: number }) => { setFocus(position.fileId); setCursor(position); });
    socket.on('teacher:edit', (event: { fileId: string; revision: number; changes: { rangeOffset: number; rangeLength: number; text: string }[] }) => {
      const expected = (revisions.current.get(event.fileId) ?? 0) + 1;
      if (event.revision !== expected) {
        setStatus('Recuperando archivo…');
        socket.emit('room:sync', { fileId: event.fileId }, (snapshot: { ok?: boolean; fileId: string; content: string; revision: number }) => {
          if (!snapshot?.ok) { setStatus('No se pudo sincronizar'); return; }
          revisions.current.set(snapshot.fileId, snapshot.revision);
          setProject(old => old ? { ...old, nodes: old.nodes.map(n => n.id === snapshot.fileId ? { ...n, content: snapshot.content } : n) } : old);
          setStatus('En vivo');
        });
        return;
      }
      revisions.current.set(event.fileId, event.revision);
      setProject(old => old ? { ...old, nodes: old.nodes.map(node => {
        if (node.id !== event.fileId) return node;
        let content = node.content ?? '';
        for (const change of [...event.changes].sort((a,b) => b.rangeOffset - a.rangeOffset)) content = content.slice(0, change.rangeOffset) + change.text + content.slice(change.rangeOffset + change.rangeLength);
        return { ...node, content };
      }) } : old);
    });
    socket.on('project:changed', (event: Event) => {
      setProject(old => {
        if (!old) return old;
        if (event.type === 'node:deleted') return { ...old, nodes: old.nodes.filter(n => n.id !== (event.payload as {nodeId:string}).nodeId) };
        const node = event.payload as ProjectNode;
        const exists = old.nodes.some(n => n.id === node.id);
        return { ...old, nodes: exists ? old.nodes.map(n => n.id === node.id ? (revisions.current.has(node.id) ? { ...node, content: n.content } : node) : n) : [...old.nodes, node] };
      });
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [id]);
  useEffect(() => { if (follow) setSelected(focus); }, [follow, focus]);
  useEffect(() => {
    if (follow && cursor && cursor.fileId === selected && editorRef.current) {
      editorRef.current.revealPositionInCenter({ lineNumber: cursor.lineNumber, column: cursor.column });
    }
  }, [cursor, follow, selected]);
  const nodes = project?.nodes ?? [];
  const current = nodes.find(n => n.id === selected && n.kind === 'FILE');
  function tree(parentId: string | null, depth = 0): React.ReactNode {
    return nodes.filter(n => n.parentId === parentId).sort((a,b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'FOLDER' ? -1 : 1).map(n => <div key={n.id}>
      <button style={{paddingLeft: 14 + depth*14}} onClick={() => { if(n.kind === 'FILE') {setSelected(n.id);setFollow(false);} }} className={`block w-full text-left py-1.5 pr-2 truncate text-sm hover:bg-slate-700 ${selected===n.id?'bg-slate-700':''}`}>{n.kind==='FOLDER'?'📁':'📄'} {n.name}</button>
      {n.kind==='FOLDER' && tree(n.id, depth+1)}
    </div>);
  }
  return <main className="h-screen flex flex-col bg-[#0d111c] text-slate-200">
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900 gap-3"><div className="truncate font-semibold">{project?.name ?? 'LiveCode Classroom'} <span className="text-xs text-green-400 ml-2">{status}</span></div><div className="flex items-center gap-3 text-sm"><span>{participants.length} conectados</span><button onClick={() => {setFollow(true);setSelected(focus);}} className={`rounded px-3 py-1.5 ${follow?'bg-blue-600':'bg-slate-700'}`}>{follow?'Siguiendo al profesor':'Volver al profesor'}</button><Link href="/join" className="underline">Salir</Link></div></header>
    <div className="flex flex-1 min-h-0"><aside className="w-60 shrink-0 overflow-auto border-r border-slate-700 bg-[#172033]"><p className="p-3 text-xs font-semibold text-slate-400">EXPLORADOR · SOLO LECTURA</p>{tree(null)}</aside><section className="flex-1 min-w-0">{current ? <Editor key={current.id} height="100%" theme="vs-dark" language={current.name.split('.').pop()==='tsx'?'typescript':current.name.split('.').pop()} value={current.content} onMount={editor => { editorRef.current = editor; }} options={{readOnly:true,domReadOnly:true,automaticLayout:true,minimap:{enabled:true}}}/> : <div className="flex h-full items-center justify-center text-slate-400">Selecciona un archivo o sigue al profesor.</div>}</section></div>
  </main>;
}
