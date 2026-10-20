export type ProjectNode = { id: string; projectId: string; parentId: string | null; name: string; kind: 'FILE' | 'FOLDER'; content: string; updatedAt: string };
export type Project = { id: string; name: string; createdAt: string; updatedAt: string; nodes?: ProjectNode[] };
