/** Las frases en inglés de cada ejercicio: las que graba `npm run voces` y las que la web puede decir. */
import type { EjercicioT } from '../contenido/esquema';
import { corregirElegir, fraseEscribir } from './corregir';
import { seLee } from './normalizar';

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
  }
  return f.map((x) => x.trim()).filter(seLee);
}
