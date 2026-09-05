# Nexo Klar — Frontend React

Frontend productivo en React + Vite para Nexo Klar. La interfaz pública se organiza por secciones y la aplicación privada por módulos, perfiles y permisos.

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

El servidor de desarrollo corre en `http://localhost:5173` y redirige `/api` al backend en `:8088`.

## Build para producción

```bash
npm run build
```

Genera los estáticos en `nexo-v2/dist/`. En producción, el contenedor configura `FRONTEND_MODE=react` y Express entrega este build para las rutas públicas y privadas.

## Despliegue

El `Dockerfile` hace el build de React en una etapa separada antes de crear el contenedor de API. No se versionan `node_modules` ni `dist`.

## Estructura

```
src/
  components/
    layout/     ← Sidebar, Header, AppLayout
    private/    ← catálogo, formularios y relación de módulos privados
    public/     ← navegación y secciones del sitio público
  pages/        ← una por módulo (Dashboard, Trabajadores, Contratos...)
  services/
    api.js      ← todas las llamadas al backend
    auth.jsx    ← contexto de sesión
  config/       ← alias y navegación de módulos
```

## Lineamiento UX aplicado

Ver `docs/UI_UX_STYLE_GUIDE_NEXO_KLAR.md` en la raíz del repositorio.
