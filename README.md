# Restaurant Web-App V1

Web-app mobile-first para pedidos pickup de restaurante, pensada para abrirse desde WhatsApp y resolver tenant por `tenant_id` en query param.

## Stack

- Next.js App Router
- React + TypeScript
- CSS global simple, sin dependencias de UI externas
- Mocks multi-tenant y APIs internas para simular backend

## Como correrlo

1. Instala dependencias:

```bash
npm install
```

2. Levanta el entorno local:

```bash
npm run dev
```

3. Abre un tenant demo:

- `http://localhost:3000/?tenant_id=resto_demo`
- `http://localhost:3000/?tenant_id=cafe_centro`

## Flujo V1 incluido

- Carga de tenant por `tenant_id`
- Menu principal con categorias y productos en una sola pantalla scrollable
- Carrito persistido por tenant en `localStorage`
- Pantalla de carrito con edicion, datos del cliente, pickup y totales
- Pantalla separada de pago QR / transferencia
- Pantalla separada de confirmacion con recap del pedido
- Pantallas de FAQ, ubicacion y horarios

## Estructura

```text
app/
  api/webapp/...         Mock backend contracts
  cart/ payment/ ...     Rutas principales
components/
  cart/ checkout/ info/ menu/ order/ shared/
  screens/               Pantallas por ruta
context/
  cart-context.tsx       Carrito multi-tenant
hooks/
  use-bootstrap.ts
  use-tenant-id.ts
lib/
  format.ts menu.ts schedule.ts tenant.ts
mock/
  tenants.ts             Datos mock organizados por tenant
services/
  webapp-api.ts          Capa cliente para conectar backend/API
types/
  webapp.ts              Tipos compartidos
```

## Endpoints asumidos

### `GET /api/webapp/bootstrap?tenant_id=...`

Devuelve:

- `tenant`
- `content`
- `menu`
- `admin_settings`
- `payment_info`
- `open_status`

### `POST /api/webapp/uploads/payment-proof`

Recibe `multipart/form-data` con:

- `file`

Devuelve:

- `success`
- `file_reference`
- `original_name`

### `POST /api/webapp/orders/create`

Recibe:

- `tenant_id`
- `customer_name`
- `customer_phone`
- `requested_time`
- `items`
- `total_amount`
- `notes`
- `payment_proof_file`
- `source = webapp`
- `delivery_type = pickup`

Devuelve:

- `success`
- `order_id`
- `status`
- `message`

## Donde conectar tu backend real

### 1. Bootstrap del tenant

Archivo:

- [services/webapp-api.ts](/C:/Users/RENATO%20ARGOTE/Documents/New%20project/services/webapp-api.ts)

Punto a reemplazar:

- `fetchBootstrap()`

Hoy llama a la API interna mock. Cuando exista tu backend real, cambia la URL y conserva el contrato.

### 2. Upload del comprobante

Archivo:

- [services/webapp-api.ts](/C:/Users/RENATO%20ARGOTE/Documents/New%20project/services/webapp-api.ts)

Punto a reemplazar:

- `uploadPaymentProof()`

Puedes enviarlo a tu backend o a un storage manejado por backend.

### 3. Creacion del pedido

Archivo:

- [services/webapp-api.ts](/C:/Users/RENATO%20ARGOTE/Documents/New%20project/services/webapp-api.ts)

Punto a reemplazar:

- `createOrder()`

### 4. Mock backend actual

Archivos:

- [mock/tenants.ts](/C:/Users/RENATO%20ARGOTE/Documents/New%20project/mock/tenants.ts)
- [app/api/webapp/bootstrap/route.ts](/C:/Users/RENATO%20ARGOTE/Documents/New%20project/app/api/webapp/bootstrap/route.ts)
- [app/api/webapp/uploads/payment-proof/route.ts](/C:/Users/RENATO%20ARGOTE/Documents/New%20project/app/api/webapp/uploads/payment-proof/route.ts)
- [app/api/webapp/orders/create/route.ts](/C:/Users/RENATO%20ARGOTE/Documents/New%20project/app/api/webapp/orders/create/route.ts)

Estos existen solo para que el frontend funcione hoy sin backend final.

## Assumptions del backend

- El backend resuelve `tenant_id` y devuelve solo data de ese restaurante.
- `menu` puede venir completo, pero el frontend igual filtra `active = true`.
- `open_status` puede venir ya calculado desde backend. En este mock se calcula con `admin_settings`.
- `requested_time` en V1 se maneja como string `HH:mm`.
- La validacion final del pago y las notificaciones viven fuera de esta web-app.

## Base preparada para futuro

Sin implementar aun, pero la base ya deja lugar para:

- branding por tenant
- descripciones completas
- promociones
- extras o modificadores
- reservas en otra fase

## Nota de este entorno

En este workspace no estaban instalados `node`, `npm`, `git` ni `rg`, asi que no pude ejecutar build/lint localmente desde aqui. La entrega queda estructurada y lista para correr apenas el entorno tenga Node.js.

## Rutas del flujo

- `/` menu
- `/cart` carrito + pickup + datos del pedido
- `/payment` pago QR
- `/confirmation` confirmacion final

Compatibilidad:

- `/checkout` funciona como alias hacia la pantalla de pago
- `/order-status` funciona como alias hacia la confirmacion
