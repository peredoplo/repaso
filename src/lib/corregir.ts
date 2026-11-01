import type { ElegirT, EscribirT, OrdenarT } from '../contenido/esquema';
import { distancia, normalizar, rellenar, seLee } from './normalizar';
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

  const prevista = e.errores?.find((x) => rellena.includes(normalizar(x.contiene)));
  const cerca = validas.some((v) => v.length > 4 && distancia(v, n) <= 2) || validas.some((v) => distancia(v, rellena) <= 2);
  const feedback =
    prevista?.feedback ??
    pistaDeError(rellena) ??
    (cerca ? '¡Casi! Fíjate bien en cómo se escribe cada palabra.' : undefined) ??
    e.explicacion;
  return { bien: false, tuya, solucion: completa, feedback, voz: completa };
}
