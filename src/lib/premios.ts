/**
 * Premios: cofres en el camino (uno cada dos lecciones y otro tras el examen) y un álbum de pegatinas.
 * Un cofre da gemas y una pegatina; las gemas sirven para comprar sobres con más pegatinas.
 * Los nombres de las pegatinas van en inglés: así también se repasa.
 */
import type { TemaC } from '../contenido/cargar';
import type { Progreso } from './progreso';

export type Rareza = 'comun' | 'rara' | 'epica';

export interface Pegatina {
  id: string;
  emoji: string;
  nombre: string;
  rareza: Rareza;
}

const p = (emoji: string, nombre: string, rareza: Rareza): Pegatina => ({ id: nombre.toLowerCase().replace(/\s+/g, '-'), emoji, nombre, rareza });

export const PEGATINAS: Pegatina[] = [
  p('🐶', 'Dog', 'comun'),
  p('🐱', 'Cat', 'comun'),
  p('🐰', 'Rabbit', 'comun'),
  p('🐻', 'Bear', 'comun'),
  p('🐼', 'Panda', 'comun'),
  p('🐨', 'Koala', 'comun'),
  p('🐸', 'Frog', 'comun'),
  p('🐵', 'Monkey', 'comun'),
  p('🐷', 'Pig', 'comun'),
  p('🐮', 'Cow', 'comun'),
  p('🐔', 'Hen', 'comun'),
  p('🐢', 'Turtle', 'comun'),
  p('🦊', 'Fox', 'rara'),
  p('🦁', 'Lion', 'rara'),
  p('🐯', 'Tiger', 'rara'),
  p('🐧', 'Penguin', 'rara'),
  p('🦉', 'Owl', 'rara'),
  p('🐙', 'Octopus', 'rara'),
  p('🦋', 'Butterfly', 'rara'),
  p('🐬', 'Dolphin', 'rara'),
  p('🦄', 'Unicorn', 'epica'),
  p('🐉', 'Dragon', 'epica'),
  p('🦖', 'T-Rex', 'epica'),
  p('🐳', 'Whale', 'epica'),
];

export const NOMBRE_RAREZA: Record<Rareza, string> = { comun: 'Común', rara: 'Rara', epica: 'Épica' };
const PROBABILIDAD: Record<Rareza, number> = { comun: 0.7, rara: 0.25, epica: 0.05 };

export const PRECIO_SOBRE = 25;
/** Gemas de consuelo por una pegatina repetida. */
const GEMAS_REPETIDA = 5;

export interface Premio {
  gemas: number;
  pegatina: Pegatina;
  repetida: boolean;
}

function sortearPegatina(azar: () => number): Pegatina {
  const r = azar();
  const rareza: Rareza = r < PROBABILIDAD.epica ? 'epica' : r < PROBABILIDAD.epica + PROBABILIDAD.rara ? 'rara' : 'comun';
  const de = PEGATINAS.filter((x) => x.rareza === rareza);
  return de[Math.floor(azar() * de.length)];
}

function darPegatina(prog: Progreso, gemas: number, azar: () => number): { progreso: Progreso; premio: Premio } {
  const pegatina = sortearPegatina(azar);
  const repetida = (prog.pegatinas[pegatina.id] ?? 0) > 0;
  const total = gemas + (repetida ? GEMAS_REPETIDA : 0);
  return {
    progreso: { ...prog, gemas: prog.gemas + total, pegatinas: { ...prog.pegatinas, [pegatina.id]: (prog.pegatinas[pegatina.id] ?? 0) + 1 } },
    premio: { gemas: total, pegatina, repetida },
  };
}

/* ── Cofres ── */

export interface Cofre {
  id: string;
  /** Índice de la lección tras la que va (se abre cuando esa y todas las de antes están hechas). */
  despuesDe: number;
}

/** Un cofre cada dos lecciones, y otro al final del tema. */
export function cofresDe(tema: TemaC): Cofre[] {
  const n = tema.lecciones.length;
  const cofres: Cofre[] = [];
  for (let i = 1; i < n; i += 2) cofres.push({ id: `${tema.id}/cofre-${cofres.length + 1}`, despuesDe: i });
  if (cofres.at(-1)?.despuesDe !== n - 1) cofres.push({ id: `${tema.id}/cofre-${cofres.length + 1}`, despuesDe: n - 1 });
  return cofres;
}

export type EstadoCofre = 'cerrado' | 'listo' | 'abierto';

export function estadoCofre(tema: TemaC, c: Cofre, prog: Progreso): EstadoCofre {
  if (prog.cofres.includes(c.id)) return 'abierto';
  return tema.lecciones.slice(0, c.despuesDe + 1).every((l) => prog.lecciones[l.ruta]) ? 'listo' : 'cerrado';
}

/** El primer cofre que se puede abrir ya (para ofrecerlo al acabar una lección). */
export function cofreListo(tema: TemaC, prog: Progreso): Cofre | null {
  return cofresDe(tema).find((c) => estadoCofre(tema, c, prog) === 'listo') ?? null;
}

export function abrirCofre(prog: Progreso, id: string, azar: () => number = Math.random): { progreso: Progreso; premio: Premio } {
  const gemas = 10 + Math.floor(azar() * 11); // de 10 a 20
  const r = darPegatina(prog, gemas, azar);
  return { ...r, progreso: { ...r.progreso, cofres: [...prog.cofres, id] } };
}

/** Un sobre: una pegatina al azar a cambio de gemas. Sin gemas suficientes, nada. */
export function comprarSobre(prog: Progreso, azar: () => number = Math.random): { progreso: Progreso; premio: Premio } | null {
  if (prog.gemas < PRECIO_SOBRE) return null;
  return darPegatina({ ...prog, gemas: prog.gemas - PRECIO_SOBRE }, 0, azar);
}
