# LiveCode Classroom — Sprint 2

Se parte del ZIP original de Sprint 1. Estos cambios añaden proyectos y editor web.

## Instalación

```bash
cd infrastructure && docker compose up -d
cd ../backend
npm install
npm run prisma:generate
npm run db:deploy
npm run start:dev
```

En otra terminal:

```bash
cd web
npm install
npm run dev
```

Conserva tus archivos `.env` locales del Sprint 1. Si aún no los tienes, copia los `.env.example`.

## Prueba manual

1. Inicia sesión como profesor y crea un proyecto desde `/dashboard`.
2. Abre el proyecto; se crean `src/` y `README.md` automáticamente.
3. Crea archivos y carpetas; abre archivos en pestañas y escribe código.
4. Guarda con Ctrl/Cmd+S o espera el autoguardado (2,5 segundos).
5. Recarga la página y verifica que el contenido permanezca.
6. Renombra o elimina archivos, crea carpetas anidadas y prueba la validación de nombres duplicados.
7. Abre otro profesor y verifica que no pueda consultar el proyecto ajeno.

## Alcance y limitaciones

- Las salas, invitados, sincronización en tiempo real y colaboración son del Sprint 3.
- El guardado es por archivo; una edición sin confirmar puede perderse al cerrar el navegador inmediatamente.
- No hay ejecución de código, terminal ni vista previa en este sprint.
- La protección de acceso al proyecto se valida en el backend mediante cookie JWT.
- El límite de contenido por actualización es de 2 millones de caracteres.
- No se incluye historial de versiones ni control de conflictos de edición simultánea.
