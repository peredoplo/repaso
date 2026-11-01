import { cargarContenido } from './cargar';

// Vite mete los YAML en la web como texto; se leen y comprueban al arrancar.
const crudos = import.meta.glob('../../contenido/**/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const contenido = cargarContenido(
  Object.fromEntries(Object.entries(crudos).map(([ruta, texto]) => [ruta.replace(/^(\.\.\/)+/, ''), texto])),
);
