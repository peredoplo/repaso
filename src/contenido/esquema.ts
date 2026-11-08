/**
 * El formato del contenido (YAML en contenido/). Regla de idiomas: `enunciado`, `feedback`, `explicacion` y los textos
 * de `recuerda` y `chat` van en español; `pregunta`, `opciones`, `solucion`, `respuestas`, `debajo`, los `ejemplos` y
 * las `palabras` del chat, las `frases` y `respuesta` de completar y las fichas y grupos de clasificar, en inglés (son lo
 * que se oye con la voz). Los dibujos son emojis, nunca imágenes del libro.
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

/**
 * Señales de tráfico y semáforos dibujados (no hay emojis de las señales españolas): el triángulo rojo avisa
 * (*warning*), el círculo rojo prohíbe (*prohibition*) y el círculo azul obliga (*mandatory*). `dibujo` va dentro:
 * un emoji o, en las azules, un símbolo que se ve en blanco («→», «↻»).
 */
export const Senal = z
  .object({
    forma: z.enum(['aviso', 'prohibicion', 'obligacion', 'semaforo-rojo', 'semaforo-ambar', 'semaforo-verde']),
    dibujo: z.string().optional(),
  })
  .strict();

/* ── Dibujos de Matemáticas (como datos, nunca imágenes; idea de Numeritis) ── */

/**
 * Una cuenta en columna, ya hecha o a medias, con la cabecera UM C D U del libro. Con un solo número y sin signo, es
 * la tabla de las cifras (1.342 → 1 UM, 3 C, 4 D, 2 U). `resultado` puede estar mal (la cuenta de un personaje que
 * se ha equivocado): `mal` marca esas columnas (0 = unidades).
 */
export const Columnas = z
  .object({
    filas: z.array(z.string()).min(1).max(3),
    signo: z.enum(['+', '-']).optional(),
    resultado: z.string().optional(),
    /** Las que te llevas, encima de cada columna, empezando por las unidades («» si no hay). */
    llevadas: z.array(z.string()).optional(),
    mal: z.array(z.number().int().min(0)).optional(),
  })
  .strict();

/** La recta numérica (para aproximar): de `desde` a `hasta`, con una rayita cada `paso` y los números marcados. */
export const Recta = z
  .object({
    desde: z.number(),
    hasta: z.number(),
    paso: z.number().positive(),
    marcas: z.array(z.number()).default([]),
    /** Los números de abajo: solo los extremos (lo normal) o los de todas las rayitas. */
    numeros: z.enum(['extremos', 'todos']).default('extremos'),
  })
  .strict();

/** Un gráfico de barras, como en «Trabaja con la información»: una barra de cada serie por categoría. */
export const Grafico = z
  .object({
    categorias: z.array(z.string()).min(1).max(6),
    series: z.array(z.object({ nombre: z.string(), valores: z.array(z.number().min(0)) }).strict()).min(1).max(2),
    /** Lo que mide el eje («Número de días»). */
    eje: z.string().optional(),
    /** Barras tumbadas (como el de los abuelos y las primas). */
    horizontal: z.boolean().optional(),
  })
  .strict();

const visuales = { columnas: Columnas.optional(), recta: Recta.optional(), grafico: Grafico.optional() };

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
    senal: Senal.optional(),
    hora: z.string().optional(),
    tarjeta: Tarjeta.optional(),
    /** Frase que se oye y no se ve (ejercicio de escuchar). */
    escuchar: z.string().optional(),
    ...visuales,
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
    /** Fallos previstos: si la respuesta contiene ese texto (o es justo `igual`), sale ese feedback. */
    errores: z.array(z.object({ contiene: z.string().optional(), igual: z.string().optional(), feedback: z.string() }).strict()).optional(),
    ...visuales,
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

/**
 * Como «Complete the sentences with the words from the box» de las fichas: arriba, el recuadro con las palabras; debajo,
 * unas frases con su hueco «___». Se toca una palabra y va al primer hueco libre; tocando un hueco, vuelve al recuadro.
 */
export const Completar = z
  .object({
    tipo: z.literal('completar'),
    enunciado: z.string().default('Complete the sentences with the words from the box.'),
    frases: z
      .array(
        z
          .object({
            /** En inglés, con un hueco «___». */
            frase: z.string(),
            respuesta: z.string(),
            dibujo: z.string().optional(),
            senal: Senal.optional(),
            /** Lo que se ve si esta frase está mal. */
            feedback: z.string().optional(),
          })
          .strict(),
      )
      .min(2)
      .max(5),
    /** Palabras de más en el recuadro. */
    sobran: z.array(z.string()).optional(),
    ...comunes,
  })
  .strict();

const Ficha = z.union([z.string(), z.object({ texto: z.string(), feedback: z.string() }).strict()]);

/**
 * Como «Complete the table» de las fichas (*Cities* / *Villages*): las fichas salen de una en una y se tocan las
 * columnas donde van. Si está bien, entra en su columna; si no, tiembla y se ve su feedback. Se corrige solo al acabar.
 */
export const Clasificar = z
  .object({
    tipo: z.literal('clasificar'),
    enunciado: z.string(),
    grupos: z
      .array(z.object({ nombre: z.string(), dibujo: z.string().optional(), fichas: z.array(Ficha).min(1) }).strict())
      .min(2)
      .max(3),
  })
  .strict();

/**
 * Una suma o una resta en columna, como en el cuaderno: se escribe el resultado cifra a cifra, empezando por las
 * unidades, y arriba se pueden apuntar las que te llevas (no se corrigen). El resultado lo calcula la web, y al fallar
 * dice el fallo: olvidar la que te llevas, restar el pequeño del grande o en qué columna está mal.
 */
export const Cuenta = z
  .object({
    tipo: z.literal('cuenta'),
    enunciado: z.string().default('Calcula.'),
    /** «5.783 + 2.439» o «4.152 - 2.534». */
    operacion: z.string(),
    /** Un problema: lo que se cuenta antes de la cuenta. */
    problema: z.string().optional(),
    dibujo: z.string().optional(),
    ...comunes,
  })
  .strict();

/**
 * Cálculo mental, como «Calcula mentalmente» del libro: unas cuantas cuentas cortas, cada una con su hueco. La
 * respuesta va entre corchetes, donde esté el hueco: «80 + 30 = [110]», «6 + [4] = 10» (el validador hace la cuenta).
 */
export const Calcula = z
  .object({
    tipo: z.literal('calcula'),
    enunciado: z.string(),
    cuentas: z
      .array(z.union([z.string(), z.object({ cuenta: z.string(), feedback: z.string() }).strict()]))
      .min(1)
      .max(6),
    dibujo: z.string().optional(),
    ...comunes,
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
    ...visuales,
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

export const Ejercicio = z.discriminatedUnion('tipo', [Elegir, Ordenar, Escribir, Unir, Completar, Clasificar, Cuenta, Calcula, Recuerda, Chat]);

/** Los que se corrigen solos, toque a toque: no tienen botón «Comprobar» ni salen en el examen. */
export const seCorrigeSolo = (e: { tipo: string }) => e.tipo === 'unir' || e.tipo === 'clasificar';

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
    /**
     * Para quien aún no lee (Miguel, 3.º de Infantil): todo va en español y todo se oye: la orden y la pregunta al
     * empezar, cada opción o ficha al tocarla y el ánimo o la explicación al contestar. Las opciones llevan dibujo.
     */
    sinLeer: z.boolean().default(false),
    /**
     * En qué idioma va lo que se practica. En Matemáticas, todo en español (`es`): las preguntas y las opciones
     * también, y lo que se oye al empezar lo dice entero la voz del narrador.
     */
    idioma: z.enum(['es', 'en']).default('en'),
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
export type CompletarT = z.infer<typeof Completar>;
export type ClasificarT = z.infer<typeof Clasificar>;
export type SenalT = z.infer<typeof Senal>;
export type RecuerdaT = z.infer<typeof Recuerda>;
export type CuentaT = z.infer<typeof Cuenta>;
export type CalculaT = z.infer<typeof Calcula>;
export type ColumnasT = z.infer<typeof Columnas>;
export type RectaT = z.infer<typeof Recta>;
export type GraficoT = z.infer<typeof Grafico>;
export type ChatT = z.infer<typeof Chat>;
export type EjercicioT = z.infer<typeof Ejercicio>;
export type Perfil = z.infer<typeof Perfiles>['perfiles'][number];
