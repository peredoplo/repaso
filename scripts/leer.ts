import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { cargarContenido } from '../src/contenido/cargar';

/** Carga contenido/ desde el disco, con las mismas comprobaciones que la web. */
export function leerContenido(raiz = process.cwd()) {
  const base = join(raiz, 'contenido');
  const archivos: Record<string, string> = {};
  for (const f of readdirSync(base, { recursive: true }) as string[]) {
    if (f.endsWith('.yaml')) archivos[`contenido/${f.split(sep).join('/')}`] = readFileSync(join(base, f), 'utf8');
  }
  return cargarContenido(archivos);
}
