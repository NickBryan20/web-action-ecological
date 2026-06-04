# web-action-ecological

Aplicacion web EcoPUCE para registrar acciones ecologicas, gestionar solicitudes, validar QR y administrar tickets de descuentos.

## Estructura

- `web-vite/`: frontend React + Vite.
- `backend/`: API Express + Prisma.

## Requisitos

- Node.js `22.9.0` (ver `.nvmrc`).
- Base de datos PostgreSQL configurada en `backend/.env`.

## Variables de entorno

No se debe subir ningun `.env` real al repositorio. Usa los archivos de ejemplo:

- `backend/.env.example`
- `web-vite/.env.example`

### CORS y cookies

La autenticacion usa cookies `HttpOnly`, por eso `CORS_ORIGIN` no debe usar `*`.

Para desarrollo local:

```env
CORS_ORIGIN="http://localhost:5173,http://127.0.0.1:5173"
```

Para produccion:

```env
CORS_ORIGIN="https://tu-dominio-frontend.com"
```

Si el frontend y backend viven en dominios distintos, configura tambien `VITE_API_URL` en `web-vite/.env` con la URL publica del backend:

```env
VITE_API_URL="https://tu-backend.com/api"
```

## Comandos utiles

```bash
npm install
npm --prefix backend install
npm --prefix web-vite install
npm run verify
npm --prefix web-vite run build
```

## Seguridad

- JWT protegido por cookie `HttpOnly`.
- CORS restringido por `CORS_ORIGIN` en produccion.
- Rate limit para API y login.
- Prisma se usa como ORM para evitar SQL manual vulnerable.
- `.env`, `node_modules`, builds y uploads quedan ignorados por Git.
