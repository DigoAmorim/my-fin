# MyFin Frontend

React, TypeScript, and Vite application for MyFin.

## Styling

Tailwind CSS 4 is integrated through `@tailwindcss/vite` in `vite.config.ts`. The CSS entry point is `src/tailwind.css`, which defines the light theme, Geist font, color tokens, and the 860px `md` breakpoint. Use Tailwind utilities in components and extend the shared controls in `src/components/ui` when a style or interaction should be reused.

## Commands

- `npm run dev` starts the Vite development server.
- `npm run build` runs TypeScript checks and creates the production build.
- `npm run lint` runs Oxlint.
