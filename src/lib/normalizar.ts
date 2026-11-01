/** Para comparar respuestas: sin mayúsculas, sin signos de puntuación y sin espacios de más. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?¿¡;:"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const HUECO = '___';

export function rellenar(plantilla: string, hueco: string): string {
  return plantilla.replace(HUECO, hueco.trim()).replace(/\s+([.?!,])/g, '$1');
}

/** Las fichas de «always / I / my teeth / brush». */
export function partirPiezas(piezas: string): string[] {
  return piezas
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Distancia de edición (letras que hay que cambiar, quitar o poner). */
export function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = arriba;
    }
  }
  return fila[b.length];
}

/** ¿Lleva letras? (los emojis solos no se leen en voz alta). */
export const tieneLetras = (t: string) => /[a-z]/i.test(t);

/** Las tablas de `recuerda` llevan a veces una columna en español («2 veces»): esa no se lee en inglés. */
export const pareceEspanol = (t: string) =>
  /[áéíóúñ¿¡]|\b(vez|veces|siempre|nunca|normalmente|a veces|cada|día|semana|al|ella|ellos|yo|nosotros|él)\b/i.test(t);

/** ¿Se puede leer en voz alta en inglés? No: los emojis, el español y las abreviaturas como «2/week». */
export const seLee = (t: string) => tieneLetras(t) && !pareceEspanol(t) && !/\d\s*\//.test(t);
