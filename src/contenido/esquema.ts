/**
 * El formato del contenido (YAML en contenido/). Regla de idiomas: `enunciado`, `feedback`, `explicacion` y los textos
 * de `recuerda` y `chat` van en español; `pregunta`, `opciones`, `solucion`, `respuestas`, `debajo`, los `ejemplos` y
 * las `palabras` del chat, en inglés (son lo que se oye con la voz). Los dibujos son emojis, nunca imágenes del libro.
 */
import { z } from 'zod';

const quien = z.enum(['i', 'you', 'he', 'she', 'we', 'they']);

/** Como en «Look and complete»: el dibujo, el hábito y cuántas veces. */
export const Tarjeta = z
  .object({
    dibujo: z.string(),
    hora: z.string().optional(),
    texto: z.string(),
    veces: z.string().optional(),
    quien: quien.optional(),
  })
  .strict();

const Opcion = z.union([z.string(), z.object({ texto: z.string(), feedback: z.string() }).strict()]);

const comunes = {
  /** Pista que se ve al fallar si no hay otra más concreta. */
  explicacion: z.string().optional(),
};

export const Elegir = z
  .object({
    tipo: z.literal('elegir'),
    enunciado: z.string(),
    /** En inglés. Con «___», al contestar se oye completa. */
    pregunta: z.string().optional(),
    dibujo: z.string().optional(),
    hora: z.string().optional(),
    tarjeta: Tarjeta.optional(),
    /** Frase que se oye y no se ve (ejercicio de escuchar). */
    escuchar: z.string().optional(),
    correcta: z.string(),
    incorrectas: z.array(Opcion).min(1).max(3),
    ...comunes,
  })
  .strict();

export const Ordenar = z
  .object({
    tipo: z.literal('ordenar'),
    enunciado: z.string().default('Ordena las palabras para formar la frase.'),
    /** Las fichas, separadas por «/», como en la ficha del cole: «always / I / my teeth / brush». */
    piezas: z.string(),
    solucion: z.string(),
    tambien: z.array(z.string()).optional(),
    /** Fichas de más, que no van en la frase. */
    sobran: z.array(z.string()).optional(),
    /** Primero se oye la frase. */
    escuchar: z.boolean().optional(),
    dibujo: z.string().optional(),
    /** Como en escribir: para contestar o preguntar con fichas, sin tener que escribir la frase entera. */
    tarjeta: Tarjeta.optional(),
    pregunta: z.string().optional(),
    debajo: z.string().optional(),
    ...comunes,
  })
  .strict();

export const Escribir = z
  .object({
    tipo: z.literal('escribir'),
    enunciado: z.string(),
    tarjeta: Tarjeta.optional(),
    dibujo: z.string().optional(),
    /** Línea en inglés encima del hueco (la pregunta, por ejemplo). */
    pregunta: z.string().optional(),
    /** Frase con un hueco «___»; sin plantilla, se escribe la frase entera. */
    plantilla: z.string().optional(),
    /** Línea en inglés debajo del hueco (la respuesta, cuando se pide escribir la pregunta). */
    debajo: z.string().optional(),
    /** Lo que va en el hueco. La primera es la que se enseña al fallar. */
    respuestas: z.array(z.string()).min(1),
    /** Fallos previstos: si la respuesta contiene ese texto, sale ese feedback. */
    errores: z.array(z.object({ contiene: z.string(), feedback: z.string() }).strict()).optional(),
    ...comunes,
  })
  .strict();

export const Unir = z
  .object({
    tipo: z.literal('unir'),
    enunciado: z.string().default('Une las parejas.'),
    pares: z.array(z.tuple([z.string(), z.string()])).min(2).max(5),
  })
  .strict();

export const Recuerda = z
  .object({
    tipo: z.literal('recuerda'),
    titulo: z.string(),
    texto: z.string(),
    /** Ejemplos en inglés (se oyen al tocarlos). */
    ejemplos: z.array(z.string()).optional(),
    /** Filas de dos columnas: [inglés, español] o [dibujo, inglés]. */
    tabla: z.array(z.tuple([z.string(), z.string()])).optional(),
  })
  .strict();

/** Los personajes del chat (los de Numeritis, con sus caras en public/personajes/). */
export const PERSONAJES = { vega: 'Vega', hugo: 'Hugo', valentina: 'Valentina', santiago: 'Santiago' } as const;

const Mensaje = z
  .object({
    de: z.enum(Object.keys(PERSONAJES) as [keyof typeof PERSONAJES, ...(keyof typeof PERSONAJES)[]]),
    /** En español; el vocabulario en inglés, en *cursiva*. */
    texto: z.string(),
    dibujo: z.string().optional(),
    /** El vocabulario nuevo: [inglés, español]. El inglés se oye al tocarlo. */
    palabras: z.array(z.tuple([z.string(), z.string()])).optional(),
  })
  .strict();

/** La teoría contada por los personajes, como en Numeritis: los mensajes llegan de uno en uno. No se corrige. */
export const Chat = z
  .object({
    tipo: z.literal('chat'),
    titulo: z.string(),
    mensajes: z.array(Mensaje).min(1),
  })
  .strict();

export const Ejercicio = z.discriminatedUnion('tipo', [Elegir, Ordenar, Escribir, Unir, Recuerda, Chat]);

/** Las pantallas de teoría (no se corrigen ni cuentan para la nota). */
export const esTeoria = (e: { tipo: string }) => e.tipo === 'recuerda' || e.tipo === 'chat';

export const Leccion = z
  .object({
    titulo: z.string(),
    subtitulo: z.string().optional(),
    emoji: z.string(),
    ejercicios: z.array(Ejercicio).default([]),
    /** Lección de examen: tantas preguntas al azar de esas lecciones del mismo tema, con nota al final. */
    examen: z.object({ de: z.array(z.string()).min(1), preguntas: z.number().int().min(3) }).strict().optional(),
  })
  .strict();

export const Tema = z
  .object({
    asignatura: z.string(),
    titulo: z.string(),
    descripcion: z.string().optional(),
    /** En qué idioma van las órdenes de los ejercicios (para la voz que las lee): en Natural Sciences, en inglés. */
    enunciados: z.enum(['es', 'en']).default('es'),
    lecciones: z.array(z.string()).min(1),
  })
  .strict();

export const Perfiles = z
  .object({
    perfiles: z
      .array(
        z
          .object({
            id: z.string(),
            nombre: z.string(),
            curso: z.string(),
            avatar: z.string(),
            temas: z.array(z.string()).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type TarjetaT = z.infer<typeof Tarjeta>;
export type ElegirT = z.infer<typeof Elegir>;
export type OrdenarT = z.infer<typeof Ordenar>;
export type EscribirT = z.infer<typeof Escribir>;
export type UnirT = z.infer<typeof Unir>;
export type RecuerdaT = z.infer<typeof Recuerda>;
export type ChatT = z.infer<typeof Chat>;
export type EjercicioT = z.infer<typeof Ejercicio>;
export type Perfil = z.infer<typeof Perfiles>['perfiles'][number];
