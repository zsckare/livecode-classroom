# LiveCode Classroom

MVP de plataforma educativa de programación en tiempo real. Sprint 1: monorepo, PostgreSQL, autenticación de profesores y base web.

## Requisitos
- Node.js 22 LTS o superior
- npm
- Docker con Docker Compose

## Inicio
```bash
cd infrastructure && docker compose up -d
cd ../backend
cp .env.example .env
# Cambiar JWT_SECRET por un valor aleatorio fuerte antes de iniciar
npm install
npm run prisma:generate
npm run db:deploy
npm run start:dev
```

En otra terminal:
```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health
- Registro: http://localhost:3000/register

## API Sprint 1
- `POST /api/auth/register` `{ "name": "Docente", "email": "teacher@example.com", "password": "secure-password" }`
- `POST /api/auth/login` `{ "email": "teacher@example.com", "password": "secure-password" }`
- `GET /api/auth/me` (cookie de sesión)
- `POST /api/auth/logout`
- `GET /api/health`

## Seguridad y límites actuales
- Las sesiones usan JWT firmado en cookie HttpOnly, SameSite=Lax; en producción requiere HTTPS y dominios configurados correctamente.
- El prototipo asume frontend y API en el mismo sitio (localhost con puertos distintos en desarrollo).
- Antes de producción: CSRF explícito, rate limiting, verificación de email, recuperación de contraseña, auditoría, pruebas automatizadas, validación de configuración y despliegue seguro.
- Las salas, los invitados, Monaco y WebSockets están planificados para sprints siguientes, no implementados todavía.
