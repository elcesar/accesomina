# Nexo by Domian — Frontend v2

Frontend moderno en React + Vite + Tailwind para Nexo by Domian.


## Stack

- **React 18** — UI por componentes
- **Vite** — build tool y dev server
- **React Router v6** — navegación SPA
- **Tailwind CSS** — estilos utilitarios
- **Tabler Icons React** — iconografía outline

## Desarrollo local

```bash
cd nexo-v2
npm install
npm run dev
```

El dev server corre en `http://localhost:5173/v2/` y hace proxy de `/api` al backend en `:8088`.

## Build para producción

```bash
npm run build
```

Genera los estáticos en `../public/v2/` (carpeta servida por el backend Express).

## Despliegue

El workflow `.github/workflows/deploy-v2.yml` se activa automáticamente al hacer push a `main` con cambios en `nexo-v2/**`.

Sube el build a `s3://domian.cl/nexo/v2/` y lo publica en `https://nexo.domian.cl/v2`.

## Estructura

```
src/
  components/
    layout/     ← Sidebar, Header, AppLayout
    ui/         ← componentes reutilizables (Button, Badge, Table...)
  pages/        ← una por módulo (Dashboard, Trabajadores, Contratos...)
  services/
    api.js      ← todas las llamadas al backend
    auth.jsx    ← contexto de sesión
  hooks/        ← hooks personalizados
```

## Lineamiento UX aplicado

Ver `docs/UX_GUIDELINES.md` en la raíz del repositorio.
