# Development Workflow

## 1. Carpeta correcta

`C:\Users\RENATO ARGOTE\Documents\New project`

## 2. URL local oficial

[http://localhost:3001/?tenant_id=resto_demo](http://localhost:3001/?tenant_id=resto_demo)

## 3. URL producción oficial

[https://app-pedidos-rho-eight.vercel.app/?tenant_id=resto_demo](https://app-pedidos-rho-eight.vercel.app/?tenant_id=resto_demo)

## 4. Cómo arrancar local limpio

```bash
npm run dev
```

## 5. Cómo validar antes de push

```bash
npm run typecheck
npm run build
```

O en un solo comando:

```bash
npm run validate
```

## 6. Cómo matar puerto 3001 en Windows

```powershell
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 0 } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

## 7. Regla de tenant_id

Nunca probar sin `?tenant_id=resto_demo`.

## 8. Vercel

Antes de push, correr:

```bash
npm run typecheck
npm run build
```

Si Vercel falla, leer primero el error exacto de TypeScript/build antes de tocar código.

## 9. R2 / CORS

Si el presign devuelve `200` pero el `PUT` directo a R2 falla con CORS/preflight `403`, revisar la configuración CORS del bucket R2.

No tocar backend, `payment-form` ni `webapp-api` sin evidencia.

## 10. Regla de seguridad

Cambios de UI deben ir separados de cambios de workflow.

Hacer commits pequeños.
