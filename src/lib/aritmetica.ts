/**
 * Las cuentas de Matemáticas: leer números como los escribe el libro («5.783»), resolver sumas y restas en columna y
 * decir en qué columna está el fallo y por qué (idea de Numeritis: los errores se trabajan, no se castigan). Los
 * fallos típicos de 3.º: olvidar la que te llevas, restar el pequeño del grande y olvidar el cero.
 */

/** «5.783», «5783» o «5 783» → 5783. Si no es un número, NaN. */
export function leerNumero(t: string): number {
  const limpio = t.trim().replace(/[.\s]/g, '');
  return /^\d+$/.test(limpio) ? Number(limpio) : NaN;
}

/** 5783 → «5.783», como en el libro (también los de cuatro cifras). */
export const escribirNumero = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Una suma (de dos o tres números) o una resta (de dos), como se escribe en el YAML: «5.783 + 2.439». */
export interface Operacion {
  numeros: number[];
  signo: '+' | '-';
  resultado: number;
}

/** «5.783 + 2.439» → la operación; null si no es una suma o una resta que se pueda hacer en columna. */
export function leerOperacion(texto: string): Operacion | null {
  const partes = texto.replace(/−/g, '-').split(/\s*([+-])\s*/);
  const numeros = partes.filter((_, i) => i % 2 === 0).map(leerNumero);
  const signos = new Set(partes.filter((_, i) => i % 2 === 1));
  if (numeros.length < 2 || numeros.some(isNaN) || signos.size !== 1) return null;
  const signo = [...signos][0] as '+' | '-';
  if (signo === '-' && (numeros.length !== 2 || numeros[0] < numeros[1])) return null;
  const resultado = signo === '+' ? numeros.reduce((a, b) => a + b, 0) : numeros[0] - numeros[1];
  return { numeros, signo, resultado };
}

/** Las cifras de un número, empezando por las unidades: 5783 → [3, 8, 7, 5]. */
export const cifras = (n: number, columnas = String(n).length) => Array.from({ length: columnas }, (_, i) => Math.floor(n / 10 ** i) % 10);

/** Cuántas columnas tiene la cuenta (las del número más largo, también el resultado). */
export const columnasDe = (o: Operacion) => Math.max(...[...o.numeros, o.resultado].map((n) => String(n).length));

export const NOMBRE_COLUMNA = ['unidades', 'decenas', 'centenas', 'unidades de millar', 'decenas de millar'];
export const SIGLA_COLUMNA = ['U', 'D', 'C', 'UM', 'DM'];

/** Lo que te llevas al pasar a cada columna (en la suma, lo que pasa de diez; en la resta, 1 si se pidió). */
export function llevadas(o: Operacion): number[] {
  const cols = columnasDe(o);
  const filas = o.numeros.map((n) => cifras(n, cols));
  const lleva = [0];
  for (let i = 0; i < cols; i++) {
    if (o.signo === '+') lleva.push(Math.floor((filas.reduce((s, f) => s + f[i], 0) + lleva[i]) / 10));
    else lleva.push(filas[0][i] < filas[1][i] + lleva[i] ? 1 : 0);
  }
  return lleva.slice(0, cols);
}

/** Cómo se hace una columna, con palabras: «8 + 3 = 11, y 1 que te llevabas, 12: pones 2 y te llevas 1». */
export function explicarColumna(o: Operacion, i: number): string {
  const cols = columnasDe(o);
  const filas = o.numeros.map((n) => cifras(n, cols));
  const lleva = llevadas(o)[i];
  const ultima = i === cols - 1 || filas.every((f) => f.slice(i + 1).every((d) => d === 0));
  // Los números que llegan a esta columna (en 68 + 85 + 72, ninguno llega a las centenas).
  const llegan = o.numeros.map((n, k) => ({ n, d: filas[k][i] })).filter((x) => x.n >= 10 ** i);
  if (o.signo === '+') {
    const suma = llegan.reduce((s, x) => s + x.d, 0);
    const total = suma + lleva;
    const cuenta = llegan.length
      ? `${llegan.map((x) => x.d).join(' + ')} = ${suma}${lleva ? `, y ${lleva} que te llevabas, ${total}` : ''}`
      : `no hay cifras que sumar, solo ${lleva} que te llevabas`;
    if (total < 10 || ultima) return `${cuenta}: pones ${total}`;
    return `${cuenta}: pones ${total % 10} y te llevas ${Math.floor(total / 10)}`;
  }
  const [arriba, abajo] = [filas[0][i], filas[1][i]];
  const resta = abajo + lleva;
  const hayAbajo = o.numeros[1] >= 10 ** i;
  const quita = lleva ? (hayAbajo ? `${abajo} + ${lleva} que te llevabas = ${resta}; ` : `abajo no hay cifra, pero te llevabas ${lleva}; `) : '';
  if (arriba >= resta) return `${quita}${arriba} − ${resta} = ${arriba - resta}`;
  return `${quita}a ${arriba} no se le puede quitar ${resta}: pides una decena, ${arriba + 10} − ${resta} = ${arriba + 10 - resta}, y te llevas 1`;
}

/** Lo que se ha escrito en cada casilla del resultado, empezando por las unidades («» si está vacía). */
export type Casillas = string[];

/** Las casillas → el número; null si hay un hueco entre cifras o algo que no es una cifra. */
export function leerCasillas(casillas: Casillas): number | null {
  const puestas = casillas.map((c) => c.trim());
  const ultima = puestas.reduce((u, c, i) => (c ? i : u), -1);
  if (ultima < 0) return null;
  const usadas = puestas.slice(0, ultima + 1);
  if (usadas.some((c) => !/^\d$/.test(c))) return null;
  return Number([...usadas].reverse().join(''));
}

export interface Correccion {
  bien: boolean;
  feedback?: string;
  /** La columna mal, empezando por las unidades (para marcarla). */
  columna?: number;
}

/**
 * Corrige el resultado y, si está mal, busca el fallo típico (olvidar la que te llevas, restar el pequeño del grande)
 * o, si no, explica la primera columna que está mal, empezando por las unidades.
 */
export function corregirCuenta(o: Operacion, casillas: Casillas): Correccion {
  const cols = columnasDe(o);
  const tuyo = leerCasillas(casillas);
  if (tuyo === o.resultado) return { bien: true };
  if (tuyo === null) return { bien: false, feedback: 'Te falta alguna cifra: cada columna lleva la suya, sin huecos en medio.' };

  const filas = o.numeros.map((n) => cifras(n, cols));
  const lleva = llevadas(o);
  const primeraLlevada = lleva.findIndex((l) => l > 0);
  const tuyas = cifras(tuyo, cols);
  const mal = Array.from({ length: cols }, (_, i) => i).find((i) => tuyas[i] !== cifras(o.resultado, cols)[i]) ?? 0;

  if (o.signo === '+') {
    // Cada columna por separado, sin sumar lo que te llevas.
    const sinLlevar = cifras(0, cols).map((_, i) => {
      const s = filas.reduce((t, f) => t + f[i], 0);
      return i === cols - 1 ? s : s % 10;
    });
    if (primeraLlevada > 0 && tuyo === Number([...sinLlevar].reverse().join(''))) {
      const i = primeraLlevada - 1;
      return {
        bien: false,
        columna: primeraLlevada,
        feedback: `Te has olvidado de **las que te llevas**. En las ${NOMBRE_COLUMNA[i]}, ${explicarColumna(o, i)}. Lo que te llevas se suma en las ${NOMBRE_COLUMNA[i + 1]}.`,
      };
    }
  } else {
    // Restar el pequeño del grande en cada columna, sin pedir.
    const alReves = cifras(0, cols).map((_, i) => Math.abs(filas[0][i] - filas[1][i]));
    if (primeraLlevada > 0 && tuyo === Number([...alReves].reverse().join(''))) {
      const i = primeraLlevada - 1;
      return {
        bien: false,
        columna: i,
        feedback: `En las ${NOMBRE_COLUMNA[i]} has restado **el pequeño del grande**, ${filas[1][i]} − ${filas[0][i]}. Pero siempre se quita el de abajo al de arriba. Aquí, ${explicarColumna(o, i)}.`,
      };
    }
    // Pedir, pero olvidar la que te llevas en la columna siguiente.
    const olvido = cifras(0, cols).map((_, i) => {
      const pide = filas[0][i] < filas[1][i] ? 10 : 0;
      return filas[0][i] + pide - filas[1][i];
    });
    if (primeraLlevada > 0 && tuyo === Number([...olvido].reverse().join(''))) {
      return {
        bien: false,
        columna: primeraLlevada,
        feedback: `Te has olvidado de **la que te llevas**. En las ${NOMBRE_COLUMNA[primeraLlevada]}, ${explicarColumna(o, primeraLlevada)}.`,
      };
    }
  }
  return { bien: false, columna: mal, feedback: `Mira las ${NOMBRE_COLUMNA[mal]}: ${explicarColumna(o, mal)}.` };
}

/* ── Cálculo mental: «80 + 30 = [110]», «6 + [4] = 10» ── */

/** «45 + 32 - 7» → 70 (de izquierda a derecha); NaN si no se puede leer. */
export function evaluar(expresion: string): number {
  const partes = expresion.replace(/−/g, '-').trim().split(/\s*([+-])\s*/);
  let total = leerNumero(partes[0]);
  for (let i = 1; i < partes.length; i += 2) {
    const n = leerNumero(partes[i + 1]);
    total = partes[i] === '+' ? total + n : total - n;
  }
  return total;
}

/** «6 + [4] = 10»: lo que va antes y después del hueco, y la respuesta. */
export function partirHueco(cuenta: string): { antes: string; despues: string; respuesta: string } | null {
  const m = cuenta.match(/^(.*)\[([^\]]+)\](.*)$/);
  return m ? { antes: m[1], despues: m[3], respuesta: m[2].trim() } : null;
}

/** ¿Es verdad la igualdad con la respuesta puesta? (lo comprueba el validador). */
export function cuentaCierta(cuenta: string): boolean {
  const h = partirHueco(cuenta);
  if (!h) return false;
  const completa = `${h.antes}${h.respuesta}${h.despues}`;
  const lados = completa.split('=');
  if (lados.length !== 2) return false;
  const [a, b] = lados.map(evaluar);
  return !isNaN(a) && a === b;
}

/** «6 + [4] = 10» → «6 + 4 = 10». */
export const cuentaCompleta = (cuenta: string, relleno?: string) => {
  const h = partirHueco(cuenta);
  return h ? `${h.antes}${relleno ?? h.respuesta}${h.despues}` : cuenta;
};
