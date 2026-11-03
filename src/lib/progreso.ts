/**
 * El progreso de cada niño o niña, guardado en este ordenador (localStorage): estrellas por lección, gemas,
 * racha de días, cofres abiertos, pegatinas y ejercicios fallados para repasar. No se manda a ningún sitio.
 */

export interface Progreso {
  gemas: number;
  racha: { dias: number; ultimo: string | null };
  /** Por ruta de lección («ingles/unit-1/habitos»): las mejores estrellas (y la mejor nota, en los exámenes). */
  lecciones: Record<string, { estrellas: number; nota?: number }>;
  /** Ids de los ejercicios fallados que aún no se han acertado después. */
  fallos: string[];
  /** Ids de los cofres ya abiertos («ingles/unit-1/cofre-2»). */
  cofres: string[];
  /** Pegatinas conseguidas: id → cuántas (las repetidas también cuentan). */
  pegatinas: Record<string, number>;
}

export const progresoVacio = (): Progreso => ({
  gemas: 0,
  racha: { dias: 0, ultimo: null },
  lecciones: {},
  fallos: [],
  cofres: [],
  pegatinas: {},
});

const clave = (perfil: string) => `repaso.progreso.${perfil}`;

export function leerProgreso(perfil: string): Progreso {
  try {
    const g = JSON.parse(localStorage.getItem(clave(perfil)) ?? 'null') as (Partial<Progreso> & { xp?: number }) | null;
    if (!g || typeof g !== 'object') return progresoVacio();
    // Antes había puntos (xp) en vez de gemas: se convierten.
    const { xp, ...resto } = g;
    return { ...progresoVacio(), ...resto, gemas: g.gemas ?? xp ?? 0 };
  } catch {
    return progresoVacio();
  }
}

export function guardarProgreso(perfil: string, p: Progreso): void {
  try {
    localStorage.setItem(clave(perfil), JSON.stringify(p));
  } catch {
    /* sin almacenamiento (modo privado): se juega igual, solo que no se recuerda */
  }
}

/** «2026-11-01», en la hora de este ordenador. */
export function hoy(fecha = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${d(fecha.getMonth() + 1)}-${d(fecha.getDate())}`;
}

function ayerDe(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  return hoy(new Date(a, m - 1, d - 1));
}

/** Los días de racha que siguen vivos hoy (si ayer no jugó, la racha se ha perdido). */
export function rachaActual(p: Progreso, dia = hoy()): number {
  return p.racha.ultimo === dia || p.racha.ultimo === ayerDe(dia) ? p.racha.dias : 0;
}

export interface Partida {
  ruta: string;
  estrellas: number;
  nota?: number;
  gemas: number;
  falladas: string[];
  acertadas: string[];
}

export function apuntarPartida(p: Progreso, partida: Partida, dia = hoy()): Progreso {
  const antes = p.lecciones[partida.ruta];
  const lecciones = { ...p.lecciones };
  if (partida.ruta) {
    lecciones[partida.ruta] = {
      estrellas: Math.max(antes?.estrellas ?? 0, partida.estrellas),
      ...(partida.nota !== undefined || antes?.nota !== undefined ? { nota: Math.max(antes?.nota ?? 0, partida.nota ?? 0) } : {}),
    };
  }
  const acertadas = new Set(partida.acertadas);
  const fallos = [...new Set([...p.fallos.filter((f) => !acertadas.has(f)), ...partida.falladas])];
  const dias = p.racha.ultimo === dia ? p.racha.dias : p.racha.ultimo === ayerDe(dia) ? p.racha.dias + 1 : 1;
  return { ...p, gemas: p.gemas + partida.gemas, racha: { dias, ultimo: dia }, lecciones, fallos };
}

/** Estrellas según los aciertos a la primera. */
export function estrellasDe(aciertos: number, total: number): number {
  if (total === 0) return 3;
  const r = aciertos / total;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
}

/** Gemas por terminar: 5, más una por estrella (o por punto de nota, en el examen). */
export function gemasDe(estrellas: number, nota?: number): number {
  return 5 + (nota !== undefined ? Math.round(nota) : estrellas);
}
