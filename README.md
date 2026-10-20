# LiveCode Classroom

**Teach code live. Learn together.**

LiveCode Classroom es una plataforma web educativa para enseñar programación en tiempo real. Un profesor crea y organiza proyectos desde el navegador, inicia una sala y comparte un código de acceso para que los alumnos puedan observar el código y explorar los archivos sin registrarse.

> **Estado:** MVP en desarrollo — Sprints 1–3 probados localmente; Sprint 4 incorpora sincronización incremental y requiere completar las pruebas de robustez e integración.

## Características

- **Cuentas de profesores:** registro, inicio y cierre de sesión.
- **Proyectos persistentes:** creación y gestión de proyectos, carpetas y archivos.
- **Editor Monaco:** resaltado de sintaxis, pestañas y guardado manual o automático.
- **Salas de clase:** creación de salas asociadas a proyectos y acceso mediante código.
- **Alumnos invitados:** ingreso con nombre y código, sin crear cuenta.
- **Exploración de solo lectura:** los alumnos navegan por la estructura del proyecto.
- **Tiempo real:** sincronización mediante Socket.IO; el Sprint 4 añade envío incremental durante la escritura, revisiones por archivo y recuperación de desincronizaciones.
- **Seguimiento del profesor:** eventos para compartir el archivo y la posición del cursor.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Web | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| API | NestJS 10, TypeScript |
| Comunicación en vivo | Socket.IO 4 y WebSockets |
| Datos | PostgreSQL, Prisma ORM 6 |
| Autenticación | JWT en cookie HttpOnly |
| Entorno local | Docker Compose, Node.js, npm |

## Organización del repositorio

```text
livecode-classroom/
├── backend/             # API NestJS, módulos y Prisma
│   ├── prisma/          # Esquema y migraciones
│   └── src/
│       ├── auth/        # Autenticación de profesores
│       ├── projects/    # Proyectos y árbol de archivos
│       └── rooms/       # Salas y gateway Socket.IO
├── web/                 # Aplicación Next.js
│   └── src/app/
│       ├── dashboard/   # Proyectos del profesor
│       ├── projects/    # Editor
│       ├── join/        # Acceso de invitados
│       └── classroom/   # Vista del alumno
└── infrastructure/      # Docker Compose
```

## Requisitos

- Node.js 22 LTS o superior
- npm
- Docker con Docker Compose

## Instalación y ejecución local

### 1. Iniciar PostgreSQL

Desde la raíz del repositorio:

```bash
cd infrastructure
docker compose up -d
```

### 2. Configurar e iniciar el backend

En otra terminal, desde la raíz:

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run db:deploy
npm run start:dev
```

Edita `backend/.env` y reemplaza `JWT_SECRET` por un valor aleatorio fuerte. Comprueba también que `DATABASE_URL` corresponda a la configuración de PostgreSQL.

### 3. Configurar e iniciar el frontend

En otra terminal, desde la raíz:

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

**Direcciones locales:**

- Aplicación: http://localhost:3000
- Registro de profesores: http://localhost:3000/register
- Acceso de alumnos: http://localhost:3000/join
- Estado de API: http://localhost:4000/api/health

> Los comandos de `cd` de cada sección parten de la raíz del repositorio; si ejecutas comandos consecutivos en una misma terminal, ajusta la ruta.

## Flujo de uso

### Profesor

1. Crea una cuenta o inicia sesión.
2. Desde el dashboard, crea o abre un proyecto.
3. Agrega archivos y carpetas y escribe código en Monaco.
4. Selecciona **Iniciar clase** para crear una sala vinculada al proyecto.
5. Comparte el código o enlace de acceso con tus alumnos.
6. Continúa programando; los alumnos conectados reciben las actualizaciones.

### Alumno

1. Abre el enlace de invitación o la página **/join**.
2. Introduce el código de sala y su nombre.
3. Explora el árbol de archivos y observa los cambios del profesor en modo de solo lectura.
4. Utiliza el seguimiento del profesor cuando quieras volver al archivo que está explicando.

## API HTTP principal

El backend utiliza el prefijo `/api`.

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Registrar profesor |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `GET` | `/api/auth/me` | Consultar sesión |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/health` | Comprobar API |
| `GET` / `POST` | `/api/projects` | Listar / crear proyectos |
| `GET` / `PATCH` / `DELETE` | `/api/projects/:id` | Consultar / editar / eliminar proyecto |
| `POST` | `/api/projects/:id/nodes` | Crear archivo o carpeta |
| `PATCH` / `DELETE` | `/api/projects/:id/nodes/:nodeId` | Modificar / eliminar nodo |
| `GET` / `POST` | `/api/rooms` | Listar / crear salas |
| `DELETE` | `/api/rooms/:id` | Cerrar sala |
| `POST` | `/api/rooms/join` | Ingresar como alumno invitado |

Las rutas de administración requieren una sesión válida de profesor. Los eventos Socket.IO gestionan la participación y la sincronización en vivo; no sustituyen la API de persistencia.

## Comprobaciones de desarrollo

```bash
# Backend
cd backend
npm run typecheck
npm run build

# Frontend (desde la raíz del repositorio)
cd web
npm run typecheck
npm run build
```

**Prueba manual recomendada:** abre un proyecto como profesor y la misma sala como alumno en una ventana privada. Escribe sin guardar, cambia de archivo, crea una carpeta y prueba la reconexión del alumno. Comprueba también que un invitado no pueda modificar archivos.

## Seguridad y limitaciones conocidas

- Los profesores utilizan JWT firmado en cookie HttpOnly. Para producción es necesario configurar correctamente HTTPS, cookies y orígenes permitidos.
- Los alumnos invitados deben mantener permisos de solo lectura; la autorización de cambios se valida en el servidor.
- El estado temporal de edición del Sprint 4 reside en memoria de una instancia NestJS. Los cambios sin guardar pueden perderse al reiniciar el servidor.
- El guardado REST y la edición en vivo todavía necesitan un protocolo de consolidación más estricto para evitar divergencias.
- La recuperación de revisiones y la cola de eventos reducen inconsistencias, pero no garantizan todos los casos de desconexión, timeout o concurrencia.
- Antes de producción faltan endurecimiento de CSRF, rate limiting, validación de configuración, recuperación de contraseñas, observabilidad, pruebas automatizadas y estrategia de escalado horizontal.
- **No se incluye todavía una terminal remota ni ejecución de código arbitrario.** Esas funciones necesitarían entornos aislados y límites de recursos.

## Roadmap

- [x] **Sprint 1:** monorepo, PostgreSQL y autenticación.
- [x] **Sprint 2:** Monaco Editor, proyectos y explorador de archivos.
- [x] **Sprint 3:** salas, invitados y sincronización al guardar.
- [ ] **Sprint 4:** completar validación de sincronización incremental, cursores y reconexión robusta.
- [ ] **Sprint 5:** vista previa segura de proyectos web y mejoras de experiencia educativa.
- [ ] **Futuro:** ejercicios, historial de sesiones, colaboración avanzada y despliegue multiinstancia.

## Estado del proyecto

Proyecto en desarrollo activo. Las funcionalidades descritas reflejan el MVP y los parches implementados hasta Sprint 4; **no debe considerarse todavía listo para producción**.
