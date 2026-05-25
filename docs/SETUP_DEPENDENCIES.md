# Setup de dependencias y herramientas (MVP ProvEEndo)

Basado en `docs/MVP_FEATURES.md`, este documento define el stack mínimo para iniciar correctamente.

## 1) Node.js

- **Versión recomendada:** Node.js 20 LTS.
- **Verificación:**
  - `node -v`
  - `npm -v`

## 2) Backend API (Express)

Dependencias runtime mínimas:
- `express`
- `cors`
- `morgan`
- `dotenv`

Dependencias de desarrollo:
- `nodemon`

Scripts mínimos esperados:
- `npm run dev` para desarrollo con recarga
- `npm run start` para producción

## 3) Base de datos (Prisma + PostgreSQL)

Dependencias recomendadas:
- `prisma` (dev)
- `@prisma/client` (runtime)

Comandos iniciales:
- `npx prisma init`
- Definir `DATABASE_URL` en `.env`
- `npx prisma migrate dev --name init`

## 4) Frontend (Next.js)

Dependencias principales:
- `next`
- `react`
- `react-dom`

Scripts mínimos:
- `npm run dev`
- `npm run build`
- `npm run start`

## 5) Integración WhatsApp API

Opciones típicas:
- **Meta WhatsApp Cloud API** (recomendada para producción)
- Proveedores BSP (Twilio, etc.)

Configuración de entorno sugerida:
- `WHATSAPP_API_URL`
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

## 6) Checklist de arranque

1. Instalar dependencias del backend y frontend.
2. Configurar variables de entorno (`.env`).
3. Inicializar Prisma y migraciones.
4. Levantar backend (`npm run dev`) y frontend (`npm run dev`).
5. Verificar endpoint de salud y flujo básico de productos/pedidos.
