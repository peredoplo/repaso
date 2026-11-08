import type { CalculaT, CompletarT, CuentaT, ElegirT, EscribirT, OrdenarT } from '../contenido/esquema';
import { corregirCuenta as corregirColumnas, cuentaCompleta, escribirNumero, leerNumero, leerOperacion, partirHueco, type Casillas } from './aritmetica';
import { distancia, normalizar, rellenar, seLee, tieneLetras } from './normalizar';
import { pistaDeError } from './pistas';

export interface Resultado {
  bien: boolean;
  /** Lo que contestó el alumno, para el resumen del examen. */
  tuya?: string;
  /** La respuesta correcta, para enseñarla al fallar. */
  solucion?: string;
  feedback?: string;
  /** La frase en inglés que se oye al contestar. */
  voz?: string;
}

export function corregirElegir(e: ElegirT, elegida: string): Resultado {
  const completa = e.pregunta?.includes('___') ? rellenar(e.pregunta, e.correcta) : undefined;
  const voz = completa ?? e.escuchar ?? (seLee(e.correcta) ? e.correcta : undefined);
  // En el resumen del examen, la frase entera con lo que eligió: «I sometimes makes my bed.».
  const tuya = completa ? rellenar(e.pregunta!, elegida) : elegida;
  if (normalizar(elegida) === normalizar(e.correcta)) return { bien: true, tuya, voz };
  const opcion = e.incorrectas.find((o) => typeof o !== 'string' && normalizar(o.texto) === normalizar(elegida));
  return {
    bien: false,
    tuya,
    solucion: completa ?? e.correcta,
    feedback: (opcion && typeof opcion !== 'string' ? opcion.feedback : undefined) ?? e.explicacion,
    voz,
  };
}

export function corregirOrdenar(e: OrdenarT, frase: string): Resultado {
  const n = normalizar(frase);
  if ([e.solucion, ...(e.tambien ?? [])].some((s) => normalizar(s) === n)) return { bien: true, tuya: frase, voz: e.solucion };
  return { bien: false, tuya: frase, solucion: e.solucion, feedback: pistaDeError(n) ?? e.explicacion, voz: e.solucion };
}

/** Las frases de completar, con su palabra en el hueco. */
export const frasesCompletar = (e: CompletarT) => e.frases.map((f) => rellenar(f.frase, f.respuesta));

/** `puestas`: la palabra de cada hueco, en el orden de las frases. Está bien si lo están todas. */
export function corregirCompletar(e: CompletarT, puestas: (string | null)[]): Resultado {
  const mal = e.frases.filter((f, i) => normalizar(puestas[i] ?? '') !== normalizar(f.respuesta));
  const tuya = e.frases.map((f, i) => rellenar(f.frase, puestas[i] ?? '…')).join(' ');
  if (!mal.length) return { bien: true, tuya };
  const feedback = [...new Set(mal.map((f) => f.feedback ?? e.explicacion).filter(Boolean))].join(' ');
  // Solo las frases falladas, para que no se haga largo.
  return { bien: false, tuya, solucion: mal.map((f) => rellenar(f.frase, f.respuesta)).join(' '), feedback: feedback || undefined };
}

/** La frase entera que se enseña y se oye. */
export function fraseEscribir(e: EscribirT, respuesta = e.respuestas[0]): string {
  return e.plantilla ? rellenar(e.plantilla, respuesta) : respuesta;
}

export function corregirEscribir(e: EscribirT, escrito: string): Resultado {
  const n = normalizar(escrito);
  const completa = fraseEscribir(e);
  // Vale lo del hueco y también la frase entera, por si la escribe completa.
  const validas = e.respuestas.flatMap((r) => [normalizar(r), normalizar(fraseEscribir(e, r))]);
  const tuya = e.plantilla ? rellenar(e.plantilla, escrito) : escrito;
  const rellena = normalizar(tuya);
  if (validas.includes(n) || validas.includes(rellena)) return { bien: true, tuya, voz: completa };

  const prevista = e.errores?.find((x) => (x.igual !== undefined ? [n, rellena].includes(normalizar(x.igual)) : rellena.includes(normalizar(x.contiene ?? ''))));
  // «¡Casi!» es para las palabras mal escritas; en un número, una cifra mal es un fallo de verdad.
  const cerca = tieneLetras(n) && (validas.some((v) => v.length > 4 && distancia(v, n) <= 2) || validas.some((v) => distancia(v, rellena) <= 2));
  const feedback =
    prevista?.feedback ??
    pistaDeError(rellena) ??
    (cerca ? '¡Casi! Fíjate bien en cómo se escribe cada palabra.' : undefined) ??
    e.explicacion;
  return { bien: false, tuya, solucion: completa, feedback, voz: completa };
}

/** Una suma o una resta en columna: `casillas`, lo escrito en cada casilla del resultado, desde las unidades. */
export function corregirCuenta(e: CuentaT, casillas: Casillas): Resultado & { columna?: number } {
  const o = leerOperacion(e.operacion)!;
  const tuya = casillas.map((c) => c.trim() || ' ').reverse().join('').trim();
  const c = corregirColumnas(o, casillas);
  const solucion = escribirNumero(o.resultado);
  return c.bien ? { bien: true, tuya } : { bien: false, tuya, solucion, feedback: c.feedback ?? e.explicacion, columna: c.columna };
}

/** Las cuentas de cálculo mental: `escritas`, lo de cada hueco. Está bien si lo están todas. */
export function corregirCalcula(e: CalculaT, escritas: string[]): Resultado & { bienCada: boolean[] } {
  const cuentas = e.cuentas.map((c) => (typeof c === 'string' ? { cuenta: c, feedback: undefined } : c));
  const bienCada = cuentas.map((c, i) => leerNumero(escritas[i] ?? '') === leerNumero(partirHueco(c.cuenta)!.respuesta));
  const tuya = cuentas.map((c, i) => cuentaCompleta(c.cuenta, escritas[i]?.trim() || '…')).join('   ');
  if (bienCada.every(Boolean)) return { bien: true, tuya, bienCada };
  const mal = cuentas.filter((_, i) => !bienCada[i]);
  const feedback = [...new Set(mal.map((c) => c.feedback ?? e.explicacion).filter(Boolean))].join(' ');
  return { bien: false, tuya, solucion: mal.map((c) => cuentaCompleta(c.cuenta)).join('   '), feedback: feedback || undefined, bienCada };
}
