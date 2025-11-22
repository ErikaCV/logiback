# Logiflow MVP

Aplicación Node.js/Express para gestionar el flujo logístico del MVP “Logiflow”. Expone una API JSON protegida con JWT y un panel web en Pug con sesiones Passport para operar clientes, productos, depósitos, stock, pedidos, envíos e invoices.

## Tabla de contenidos
- [Stack y características](#stack-y-características)
- [Requerimientos](#requerimientos)
- [Instalación rápida](#instalación-rápida)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Autenticación](#autenticación)
- [Dominios disponibles](#dominios-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Base de datos y scripts](#base-de-datos-y-scripts)
- [Validación / pruebas](#validación--pruebas)
- [Despliegue](#despliegue)
- [Recursos adicionales](#recursos-adicionales)

## Stack y características
- Node.js 18+, Express 4 y MongoDB driver 6.13 con helpers propios de conexión.
- API REST modular (clientes, productos, depósitos, stock, pedidos, envíos, facturas) con validaciones en servicios.
- Panel administrativo en Express + Pug consumiendo los mismos modelos.
- Autenticación híbrida: sesiones Passport (vistas) y JWT Bearer (API JSON).
- Secuencias por colección (`counters`) para IDs enteros y únicos.
- Middlewares personalizados para control de acceso, manejo de errores y sanitización.
- Scripts utilitarios para importar datos históricos (`db.json`) y actualizar roles.

## Requerimientos
- Node.js >= 18 (el driver de Mongo requiere >=16.20.1, se recomienda 18 LTS).
- Instancia MongoDB accesible (Atlas o local).
- npm 9+ (instalado junto con Node.js).

## Instalación rápida
```bash
git clone <repo>
cd tpback
npm install
```

## Configuración
Crear un archivo `.env` en la raíz:
```env
MONGODB_URI="mongodb+srv://gonzaloalejandro720_db_user:xIXLd3HBu7r8aEh7@logiflowcluster.pp6rzqc.mongodb.net/?retryWrites=true&w=majority&appName=LogiFlowCluster"
MONGODB_DB="logiflow"
PORT="3000"
SESSION_SECRET="3cb351946ebeca65855fdcd6c273e84e1e97a9797594d959503e743386c01106"
JWT_SECRET="7ff116a4b70498e518a30a5f72176875dfdf4125c6cf0f36c75cff367dc49825"
BCRYPT_SALT_ROUNDS="10"
```

| Variable         | Obligatoria | Descripción                                               |
| ---------------- | ----------- | --------------------------------------------------------- |
| `MONGODB_URI`    | Sí          | Cadena de conexión completa al cluster/instancia.         |
| `MONGODB_DB`     | Sí          | Base de datos a utilizar (por defecto `logiflow`).        |
| `PORT`           | No          | Puerto HTTP (3000 por defecto).                           |
| `SESSION_SECRET` | Sí          | Firma de `express-session`/Passport.                      |
| `JWT_SECRET`     | Sí          | Firma de los tokens emitidos por `/auth/api/*`.           |
| `JWT_EXPIRES_IN` | No          | Tiempo de expiración de los JWT (formato `ms`, `1h`, etc).|
| `BCRYPT_SALT_ROUNDS` | No      | Rondas para hasheo de contraseñas (default 10).           |

## Ejecución
```bash
npm start          # inicia servidor Express
# o
npm run dev        # mismo comando, útil para usar con nodemon
```
Al levantar verás en consola:
```
API on http://localhost:3000
*********************************
      LOGIFLOW  GRUPO 14
*********************************
```

## Autenticación
- **Método 1 – Sesiones + Passport**: protege las vistas bajo `/views`. Los usuarios inician sesión vía `/auth/login` (HTML) y la cookie `connect.sid` se almacena en MongoDB (colección `sessions`). Middleware: `ensureSessionAuth`.
- **Método 2 – JWT**: protege la API JSON bajo `/customers`, `/products`, `/stock`, etc. Los tokens se obtienen en `/auth/api/login` o `/auth/api/signup` y deben enviarse en `Authorization: Bearer <token>`. Middleware: `requireJwtAuth`.

Ambos mecanismos comparten el modelo `users` y el servicio `auth` (`bcrypt` para hash y `jsonwebtoken` para emitir/verificar).

## Dominios disponibles
- **Clientes (`/customers`)**: CRUD con soft-delete, búsqueda paginada y consulta de pedidos asociados.
- **Productos (`/products`)**: CRUD, precios en centavos, activación/desactivación.
- **Depósitos (`/warehouses`)**: Gestión básica y validaciones contra stock.
- **Stock (`/stock`)**: Ajustes y transferencias (`/adjust`, `/move`) con verificación de disponibilidad.
- **Pedidos (`/orders`)**: Reserva de stock, cálculo de totales y estados (`allocated`, `shipped`, `delivered`, `cancelled`).
- **Envíos (`/shipments`)**: Creación desde pedidos reservados, tracking y cambios de estado permitidos.
- **Facturas (`/invoices`)**: Generación para pedidos entregados y transición de estados (`issued`, `paid`, `void`).
- **Vistas (`/views/*`)**: Panel en Pug para operar manualmente cada dominio.

La documentación funcional rápida se detalla en [Endpoints principales](#endpoints-principales-resumen); ver más abajo la estructura y servicios involucrados.

### Endpoints principales (resumen)
- `GET /customers` – lista clientes activos.
- `POST /customers` – crea nuevo cliente.
- `PATCH /customers/:id` – actualiza datos básicos.
- `DELETE /customers/:id` – baja lógica (bloquea y marca `deletedAt`).
- `GET /products`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`.
- `POST /stock/adjust` – ajusta inventario; `POST /stock/move` – transfiere entre depósitos.
- `POST /orders` – crea pedido validando stock; `PATCH /orders/:id` – edita items cuando está `allocated`; `DELETE /orders/:id` – cancela y devuelve stock.
- `POST /shipments` – genera envío desde pedido `allocated`; `PATCH /shipments/:id/status` – actualiza tracking; `DELETE /shipments/:id` – cancela.
- `POST /invoices` – factura pedidos entregados; `PATCH /invoices/:id/status` – cambia estado (`issued`, `paid`, `void`).

## Estructura del proyecto
```
src/
  controllers/   → lógica HTTP (traduce servicios a responses)
  models/        → acceso a MongoDB y operaciones de persistencia
  services/      → reglas de negocio (pedidos, envíos, invoices, auth)
  modules/       → routers Express (API y vistas)
  middleware/    → middlewares personalizados (auth, errores)
  utils/         → helpers (validaciones, httpError, etc.)
  views/         → templates Pug del panel
  config/passport.js → estrategia local + serialize/deserialize
  db/mongo.js    → conexión, índices e IDs secuenciales
scripts/
  seed-from-json.js      → importa datos históricos desde `db.json`
  update-user-roles.js   → normaliza roles existentes
docs/
  mongodb.md             → guía abreviada de conexión/configuración
db.json                  → snapshot histórico utilizado por el seed
```

## Base de datos y scripts
- **Persistencia actual**: MongoDB (Atlas/local). Se generan índices para evitar duplicados (`customers.email`, `products.sku`, etc.) y se mantiene la colección `counters` para ID incrementales.
- **Importar datos históricos**:
  ```bash
  npm run seed
  # ó configurando variables ad-hoc
  MONGODB_URI="..." MONGODB_DB="logiflow" node scripts/seed-from-json.js
  ```
  El script borra y repone las colecciones `customers`, `products`, `warehouses`, `stock`, `orders`, `shipments`, `invoices` y actualiza `counters`.
- **Actualizar roles heredados**:
  ```bash
  node scripts/update-user-roles.js --all
  node scripts/update-user-roles.js --email=usuario@dominio.com
  ```
  Útil después de migraciones antiguas que dejaban `role: "operator"`.

## Validación / pruebas
No hay pruebas automatizadas por el momento. Se recomienda cubrir manualmente:
- Alta/edición/baja de clientes y productos.
- Ajustes y transferencias de stock.
- Flujo completo pedido → envío → factura (incluyendo transiciones inválidas).
- Login HTML con Passport y login API con JWT para asegurar ambos métodos de autenticación.

## Despliegue
1. Configurar variables de entorno en el host o servicio (Docker, PM2, systemd, etc.).
2. Ejecutar `npm install`.
3. Opcional: importar datos base con `npm run seed`.
4. Iniciar con `npm start` o usar un process manager (`pm2 start src/server.js`).
5. Cuando se despliega detrás de un proxy TLS, mantener `app.set("trust proxy", 1)` (ya incluido) para que las cookies `secure` funcionen correctamente.

### Despliegue en Vercel / entornos serverless
- `src/server.js` exporta la instancia Express (`module.exports = app`) y sólo ejecuta `app.listen` cuando el archivo es el entrypoint principal. Esto permite que Vercel importe la app desde un handler (`api/index.js`) como se muestra abajo:
  ```js
  // api/index.js
  const app = require("../src/server");
  module.exports = app; // Vercel envía cada request a Express
  ```
- La conexión a MongoDB es perezosa (`ensureDb()` + `dbInitPromise`), por lo que cada función serverless reutiliza el cliente global y evita abrir sockets por invocación (commit `b703232`).
- Al igual que en otros entornos, asegurate de definir `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET` y `JWT_SECRET` como Environment Variables dentro del proyecto de Vercel.

## Recursos adicionales
- `docs/mongodb.md`: guía paso a paso para preparar la conexión a MongoDB y ejecutar el seed.
- `db.json`: dataset histórico (solo lectura) usado por el script de importación.
- Issues y mejoras pendientes: habilitar pruebas automatizadas, ampliar documentación de endpoints y añadir ejemplos de requests/responses.
