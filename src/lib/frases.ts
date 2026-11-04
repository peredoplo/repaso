/** Las frases en inglés de cada ejercicio: las que graba `npm run voces` y las que la web puede decir. */
import type { EjercicioT } from '../contenido/esquema';
import { corregirElegir, fraseEscribir } from './corregir';
import { HUECO, seLee } from './normalizar';

export function frasesInglesas(e: EjercicioT): string[] {
  const f: string[] = [];
  switch (e.tipo) {
    case 'elegir': {
      // Las opciones no se oyen al tocarlas (muchas están mal a propósito); al contestar se oye la buena.
      if (e.pregunta && !e.pregunta.includes('___')) f.push(e.pregunta);
      if (e.tarjeta) f.push(e.tarjeta.texto);
      const voz = corregirElegir(e, e.correcta).voz;
      if (voz) f.push(voz);
      break;
    }
    case 'ordenar':
      if (e.pregunta) f.push(e.pregunta);
      if (e.debajo) f.push(e.debajo);
      if (e.tarjeta) f.push(e.tarjeta.texto);
      f.push(e.solucion);
      break;
    case 'escribir':
      if (e.pregunta) f.push(e.pregunta);
      if (e.debajo) f.push(e.debajo);
      if (e.tarjeta) f.push(e.tarjeta.texto);
      f.push(fraseEscribir(e));
      break;
    case 'unir':
      e.pares.forEach(([a, b]) => f.push(a, b));
      break;
    case 'recuerda':
      f.push(...(e.ejemplos ?? []));
      e.tabla?.forEach(([a, b]) => f.push(a, b));
      break;
    case 'chat':
      e.mensajes.forEach((m) => m.palabras?.forEach(([en]) => f.push(en)));
      break;
  }
  return f.map((x) => x.trim()).filter(seLee);
}

/** Lo que se oye solo al llegar a un ejercicio: la orden y, detrás, sus frases en inglés. */
export interface Inicio {
  enunciado: string;
  /** Las frases que se ven (o la de escuchar), en orden; el hueco «___» se dice como un silencio. */
  frases: string[];
  /** Los de escuchar suenan aunque esté quitado el sonido. */
  siempre: boolean;
}

/**
 * Petición del autor (4 de noviembre de 2026): al llegar al ejercicio se oye directamente, sin tocar el altavoz, la
 * orden y lo que hay que leer, también las frases con hueco. Las opciones no (las incorrectas no se leen nunca).
 */
export function alEmpezar(e: EjercicioT): Inicio | null {
  const tarjeta = 'tarjeta' in e ? e.tarjeta?.texto : undefined;
  let frases: (string | undefined)[] = [];
  let siempre = false;
  switch (e.tipo) {
    case 'elegir':
      if (e.escuchar) [frases, siempre] = [[e.escuchar], true];
      else frases = [tarjeta, e.pregunta];
      break;
    case 'ordenar':
      if (e.escuchar) [frases, siempre] = [[e.solucion], true];
      else frases = [tarjeta, e.pregunta, e.debajo];
      break;
    case 'escribir':
      frases = [tarjeta, e.pregunta, e.plantilla, e.debajo];
      break;
    case 'unir':
      break;
    default:
      return null;
  }
  return { enunciado: e.enunciado.trim(), frases: frases.filter((f): f is string => !!f && seLee(f)).map((f) => f.trim()), siempre };
}

/** Con qué se busca su grabación (la hace `npm run voces`, que sabe en qué idioma va la orden). */
export const claveInicio = (i: Inicio) => ['inicio', i.enunciado, ...i.frases].join('|');

/** Para la voz del navegador, si aún no está grabado. */
export const textoInicio = (i: Inicio) => [sinMarcas(i.enunciado), ...i.frases.map((f) => f.replaceAll(HUECO, '…'))].join(' ');

/** Los mensajes del chat, que dice cada personaje con su voz. */
export function mensajesHablados(e: EjercicioT): { de: string; texto: string }[] {
  return e.tipo === 'chat' ? e.mensajes.map(({ de, texto }) => ({ de, texto })) : [];
}

/** Con qué se busca la grabación de un mensaje: el mismo texto puede decirlo otro personaje, con otra voz. */
export const claveMensaje = (de: string, texto: string) => `${de}|${texto.trim()}`;

/** Todo lo que se oye en un ejercicio, para precargarlo. */
export const todoLoQueSeOye = (e: EjercicioT) => {
  const inicio = alEmpezar(e);
  return [...frasesInglesas(e), ...mensajesHablados(e).map((m) => claveMensaje(m.de, m.texto)), ...(inicio ? [claveInicio(inicio)] : [])];
};

/** El texto tal como se dice: sin las marcas de la negrita y la cursiva. */
export const sinMarcas = (t: string) => t.replace(/\*\*?([^*]+)\*\*?/g, '$1').trim();
