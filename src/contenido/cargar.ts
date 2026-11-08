/**
 * Lee y comprueba el contenido. Lo usan la web (con los archivos que mete Vite) y los scripts (con los del disco).
 * Las rutas son relativas a la carpeta del proyecto: «contenido/ingles/unit-1/tema.yaml».
 */
import { parse } from 'yaml';
import type { z } from 'zod';
import { columnasDe, cuentaCierta, leerOperacion } from '../lib/aritmetica';
import { opcionesDe, partirOpcion, textoFicha } from '../lib/frases';
import { HUECO, normalizar, partirPiezas } from '../lib/normalizar';
import { esTeoria, Leccion, Perfiles, Tema, type ColumnasT, type EjercicioT, type GraficoT, type Perfil, type RectaT } from './esquema';

type VisualesT = { columnas?: ColumnasT; recta?: RectaT; grafico?: GraficoT };

/**
 * `sinLeer`: es de un tema para quien aún no lee; `espanol`: de un tema en español (Matemáticas). Van con el ejercicio
 * también a «Repasa tus fallos».
 */
export type EjercicioC = EjercicioT & { id: string; sinLeer?: boolean; espanol?: boolean };

/** Pantallas como mucho en una lección (la teoría, «Recuerda» y el chat, cuenta). */
export const MAX_PANTALLAS = 8;
/** Mensajes como mucho en un chat de teoría: si hay más que contar, mejor otra lección. */
export const MAX_MENSAJES = 10;

export interface LeccionC {
  id: string;
  /** «ingles/unit-1/habitos»: la clave del progreso. */
  ruta: string;
  titulo: string;
  subtitulo?: string;
  emoji: string;
  ejercicios: EjercicioC[];
  examen?: { de: string[]; preguntas: number };
}

export interface TemaC {
  id: string;
  asignatura: string;
  titulo: string;
  descripcion?: string;
  enunciados: 'es' | 'en';
  sinLeer: boolean;
  idioma: 'es' | 'en';
  lecciones: LeccionC[];
}

export interface Contenido {
  perfiles: Perfil[];
  temas: Map<string, TemaC>;
  /** Todos los ejercicios por id, para repasar los fallos. */
  ejercicios: Map<string, EjercicioC>;
  errores: string[];
}

function leer<T>(esquema: z.ZodType<T>, texto: string, archivo: string, errores: string[]): T | null {
  let datos: unknown;
  try {
    datos = parse(texto);
  } catch (e) {
    errores.push(`${archivo}: YAML mal escrito (${e instanceof Error ? e.message : e})`);
    return null;
  }
  const r = esquema.safeParse(datos);
  if (!r.success) {
    for (const i of r.error.issues) errores.push(`${archivo}: ${i.path.join('.') || '(raíz)'}: ${i.message}`);
    return null;
  }
  return r.data;
}

const multiconjunto = (t: string) => normalizar(t).split(' ').sort().join(' ');
const soloLetras = (t: string) => [...t.toLowerCase().replace(/[^a-z]/g, '')].sort().join('');

/** Los dibujos de Matemáticas: que los números se lean y cuadren. */
function comprobarVisuales(v: Partial<Pick<VisualesT, 'columnas' | 'recta' | 'grafico'>>, donde: string, errores: string[]): void {
  if (v.columnas) {
    const { filas, signo, resultado } = v.columnas;
    if ([...filas, ...(resultado && resultado !== '?' ? [resultado] : [])].some((f) => !/^[\d.]+$/.test(f))) errores.push(`${donde}: en columnas solo van números`);
  }
  if (v.recta) {
    const { desde, hasta, paso, marcas } = v.recta;
    if (hasta <= desde || (hasta - desde) / paso > 20 || !Number.isInteger((hasta - desde) / paso)) errores.push(`${donde}: la recta va de ${desde} a ${hasta} de ${paso} en ${paso} (y como mucho 20 rayitas)`);
    for (const m of marcas) if (m < desde || m > hasta) errores.push(`${donde}: ${m} se sale de la recta`);
  }
  if (v.grafico) {
    for (const s of v.grafico.series) if (s.valores.length !== v.grafico.categorias.length) errores.push(`${donde}: «${s.nombre}» necesita un valor por categoría`);
  }
}

function comprobarEjercicio(e: EjercicioT, donde: string, errores: string[]): void {
  if (e.tipo === 'elegir' || e.tipo === 'escribir') comprobarVisuales(e, donde, errores);
  if (e.tipo === 'chat') e.mensajes.forEach((m) => comprobarVisuales(m, donde, errores));
  switch (e.tipo) {
    case 'ordenar': {
      const piezas = partirPiezas(e.piezas);
      const sobran = new Set((e.sobran ?? []).map(normalizar));
      const usadas = piezas.filter((p) => !sobran.has(normalizar(p))).join(' ');
      for (const s of [e.solucion, ...(e.tambien ?? [])]) {
        if (multiconjunto(usadas) !== multiconjunto(s)) errores.push(`${donde}: las piezas no forman «${s}»`);
      }
      for (const s of e.sobran ?? []) {
        if (!piezas.some((p) => normalizar(p) === normalizar(s))) errores.push(`${donde}: «${s}» está en sobran pero no en piezas`);
      }
      break;
    }
    case 'elegir': {
      const textos = e.incorrectas.map((o) => normalizar(typeof o === 'string' ? o : o.texto));
      if (textos.includes(normalizar(e.correcta))) errores.push(`${donde}: la correcta está también entre las incorrectas`);
      if (new Set(textos).size !== textos.length) errores.push(`${donde}: opciones repetidas`);
      if (e.pregunta?.includes(HUECO) === false && e.pregunta.includes('__')) errores.push(`${donde}: el hueco se escribe «___»`);
      break;
    }
    case 'escribir': {
      if (e.errores?.some((x) => !x.contiene && !x.igual)) errores.push(`${donde}: cada error previsto necesita «contiene» o «igual»`);
      if (e.plantilla && e.plantilla.split(HUECO).length !== 2) errores.push(`${donde}: la plantilla necesita un hueco «___» (y solo uno)`);
      // Las letras desordenadas tienen que ser justo las de la respuesta (en la ficha, a «tsesui» le faltaba una s).
      for (const letras of [e.enunciado.match(/letters: \*\*([^*]+)\*\*/)?.[1], e.explicacion?.match(/letras \*([^*]+)\*/)?.[1]]) {
        if (letras && soloLetras(letras) !== soloLetras(e.respuestas[0])) errores.push(`${donde}: las letras «${letras}» no forman «${e.respuestas[0]}»`);
      }
      break;
    }
    case 'unir': {
      const izq = e.pares.map((p) => p[0]);
      const der = e.pares.map((p) => normalizar(p[1]));
      if (new Set(izq).size !== izq.length || new Set(der).size !== der.length) errores.push(`${donde}: parejas repetidas`);
      break;
    }
    case 'completar': {
      for (const f of e.frases) {
        if (f.frase.split(HUECO).length !== 2) errores.push(`${donde}: «${f.frase}» necesita un hueco «___» (y solo uno)`);
      }
      // Cada palabra del recuadro, una vez: si dos huecos llevaran la misma, daría igual en cuál se pone.
      const recuadro = [...e.frases.map((f) => f.respuesta), ...(e.sobran ?? [])].map(normalizar);
      if (new Set(recuadro).size !== recuadro.length) errores.push(`${donde}: palabras repetidas en el recuadro`);
      // Todo fallo, con su explicación.
      if (!e.explicacion && e.frases.some((f) => !f.feedback)) errores.push(`${donde}: cada frase necesita su feedback (o una explicacion)`);
      break;
    }
    case 'clasificar': {
      const textos = e.grupos.flatMap((g) => g.fichas.map((f) => normalizar(textoFicha(f))));
      if (new Set(textos).size !== textos.length) errores.push(`${donde}: fichas repetidas`);
      break;
    }
    case 'cuenta': {
      const o = leerOperacion(e.operacion);
      if (!o) errores.push(`${donde}: «${e.operacion}» no es una suma o una resta en columna (la resta, del grande el pequeño)`);
      else if (columnasDe(o) > 5) errores.push(`${donde}: «${e.operacion}» tiene demasiadas cifras`);
      break;
    }
    case 'calcula': {
      for (const c of e.cuentas) {
        const t = typeof c === 'string' ? c : c.cuenta;
        if (!cuentaCierta(t)) errores.push(`${donde}: «${t}» no está bien (la respuesta, entre corchetes: «6 + [4] = 10»)`);
      }
      if (!e.explicacion && e.cuentas.some((c) => typeof c === 'string')) errores.push(`${donde}: cada cuenta necesita su feedback (o una explicacion)`);
      break;
    }
    case 'recuerda':
      break;
    case 'chat':
      if (e.mensajes.length > MAX_MENSAJES) errores.push(`${donde}: el chat tiene ${e.mensajes.length} mensajes; como mucho ${MAX_MENSAJES}`);
      // Primero en español y luego, entre paréntesis, en inglés: «nutrición (*nutrition*)». Si no, la voz dice el inglés
      // seguido, y una «y» suelta entre dos palabras en inglés la leía «y griega» (revisión del autor, 3 de noviembre de 2026).
      for (const m of e.mensajes) {
        if (m.texto.replace(/\(\*[^*]+\*\)/g, '').replace(/\*\*[^*]+\*\*/g, '').includes('*')) {
          errores.push(`${donde}: «${m.texto.slice(0, 40)}…»: el inglés va entre paréntesis detrás del español, «nutrición (*nutrition*)»`);
        }
      }
      break;
  }
}

/**
 * Para quien aún no lee: solo chat, elegir y ordenar; cada opción con su dibujo (o un número) y algo que decir, y
 * cada fallo con una explicación, que es lo que se oye.
 */
function comprobarSinLeer(e: EjercicioT, donde: string, errores: string[]): void {
  if (e.tipo !== 'chat' && e.tipo !== 'elegir' && e.tipo !== 'ordenar') {
    errores.push(`${donde}: en un tema sin leer solo hay chat, elegir y ordenar`);
    return;
  }
  if (e.tipo === 'elegir') {
    for (const o of opcionesDe(e)) {
      const { dibujo, nombre } = partirOpcion(o);
      if (!dibujo && !/^\d+$/.test(nombre)) errores.push(`${donde}: «${o}» necesita un dibujo (emoji), que aún no se lee`);
      if (!nombre) errores.push(`${donde}: «${o}» necesita una palabra, para decirla al tocarla`);
    }
    if (!e.explicacion && e.incorrectas.some((o) => typeof o === 'string')) errores.push(`${donde}: cada opción incorrecta necesita su feedback (o una explicacion)`);
  }
  if (e.tipo === 'ordenar' && !e.explicacion) errores.push(`${donde}: falta la explicacion, que se oye al fallar`);
  if (e.tipo === 'chat' && e.mensajes.some((m) => m.palabras)) errores.push(`${donde}: sin palabras en inglés en un tema sin leer`);
}

/** En español (Matemáticas): nada en *cursiva*, que es lo que dice la voz inglesa. */
function comprobarEspanol(e: EjercicioT, donde: string, errores: string[]): void {
  const textos = e.tipo === 'chat' ? e.mensajes.map((m) => m.texto) : 'enunciado' in e ? [e.enunciado] : [];
  for (const t of textos) if (/(^|[^*])\*[^*]+\*(?!\*)/.test(t)) errores.push(`${donde}: «${t.slice(0, 40)}…»: en español, sin cursiva (la diría la voz inglesa); para destacar, **negrita**`);
  if (e.tipo === 'chat' && e.mensajes.some((m) => m.palabras)) errores.push(`${donde}: sin palabras en inglés en un tema en español`);
}

/** `archivos`: ruta → texto. */
export function cargarContenido(archivos: Record<string, string>): Contenido {
  const errores: string[] = [];
  const temas = new Map<string, TemaC>();
  const ejercicios = new Map<string, EjercicioC>();

  const rutas = Object.keys(archivos).sort();
  for (const archivoTema of rutas.filter((r) => r.endsWith('/tema.yaml'))) {
    const carpeta = archivoTema.slice(0, -'/tema.yaml'.length);
    const id = carpeta.replace(/^contenido\//, '');
    const tema = leer(Tema, archivos[archivoTema], archivoTema, errores);
    if (!tema) continue;
    const lecciones: LeccionC[] = [];
    for (const lid of tema.lecciones) {
      const archivo = `${carpeta}/${lid}.yaml`;
      if (!(archivo in archivos)) {
        errores.push(`${archivoTema}: no existe ${archivo}`);
        continue;
      }
      const l = leer(Leccion, archivos[archivo], archivo, errores);
      if (!l) continue;
      const ruta = `${id}/${lid}`;
      const conId = l.ejercicios.map((e, i) => {
        comprobarEjercicio(e, `${archivo} (ejercicio ${i + 1})`, errores);
        if (tema.sinLeer) comprobarSinLeer(e, `${archivo} (ejercicio ${i + 1})`, errores);
        if (tema.idioma === 'es') comprobarEspanol(e, `${archivo} (ejercicio ${i + 1})`, errores);
        const c = { ...e, id: `${ruta}#${i + 1}`, ...(tema.sinLeer && { sinLeer: true }), ...(tema.idioma === 'es' && { espanol: true }) } as EjercicioC;
        ejercicios.set(c.id, c);
        return c;
      });
      if (!l.examen && conId.every(esTeoria)) errores.push(`${archivo}: no tiene ejercicios`);
      // Lecciones cortas (a Julia se le hacían pesadas las de 15): como mucho 8 pantallas.
      if (conId.length > MAX_PANTALLAS) errores.push(`${archivo}: tiene ${conId.length} pantallas; como mucho ${MAX_PANTALLAS} (pártela en dos)`);
      for (const d of l.examen?.de ?? []) {
        if (!tema.lecciones.includes(d)) errores.push(`${archivo}: el examen usa «${d}», que no está en el tema`);
      }
      lecciones.push({ id: lid, ruta, titulo: l.titulo, subtitulo: l.subtitulo, emoji: l.emoji, ejercicios: conId, examen: l.examen });
    }
    temas.set(id, { id, asignatura: tema.asignatura, titulo: tema.titulo, descripcion: tema.descripcion, enunciados: tema.enunciados, sinLeer: tema.sinLeer, idioma: tema.idioma, lecciones });
  }

  let perfiles: Perfil[] = [];
  const archivoPerfiles = 'contenido/perfiles.yaml';
  if (archivoPerfiles in archivos) {
    perfiles = leer(Perfiles, archivos[archivoPerfiles], archivoPerfiles, errores)?.perfiles ?? [];
    for (const p of perfiles) {
      for (const t of p.temas) if (!temas.has(t)) errores.push(`${archivoPerfiles}: ${p.nombre} tiene el tema «${t}», que no existe`);
    }
  } else {
    errores.push(`Falta ${archivoPerfiles}`);
  }

  return { perfiles, temas, ejercicios, errores };
}
