/**
 * Fallos típicos de la unidad, para decir algo más útil que «no»: se buscan en la respuesta ya normalizada.
 * Van de más concreto a más general; sale el primero que encaje.
 */

const VERBO_CON_S = 'goes|eats|drinks|brushes|has|makes|does|plays|washes|gets|watches|reads';
const VERBO_SIN_S = 'go|eat|drink|brush|have|make|do|play|wash|get|watch|read';
const ADVERBIO = 'always|usually|sometimes|never';
const EL_ELLA = "he|she|it|my sister|my brother|my mum|my dad|my friend|tom|anna|lucy|max|sam";

const REGLAS: { patron: RegExp; pista: string }[] = [
  { patron: /\btwo times\b/, pista: 'Para decir «2 veces» se usa **twice**.' },
  { patron: /\bone times?\b/, pista: 'Para decir «1 vez» se usa **once**.' },
  { patron: /\bthree time\b/, pista: '«3 veces» es **three times**, con -s.' },
  { patron: /\b(twise|twic|twince)\b/, pista: 'Se escribe **twice**.' },
  { patron: /\b(ones|onse|wance)\b/, pista: 'Se escribe **once**.' },
  { patron: /\bthree tines\b|\btree times\b/, pista: 'Se escribe **three times**.' },
  {
    patron: new RegExp(`\\bdoes (${EL_ELLA}) (${VERBO_CON_S})\\b`),
    pista: 'Después de **does**, el verbo va sin -s: *does she eat*, no *does she eats*.',
  },
  { patron: new RegExp(`\\bdo (${EL_ELLA})\\b`), pista: 'Con **he** y **she** se pregunta con **does**: *How often does she…?*' },
  { patron: /\bdoes (i|you|we|they)\b/, pista: 'Con **I**, **you**, **we** y **they** se pregunta con **do**: *How often do they…?*' },
  {
    patron: new RegExp(`(?<!(does|do) )\\b(${EL_ELLA}) (${ADVERBIO} )?(${VERBO_SIN_S})\\b`),
    pista: 'Con **he** o **she**, el verbo lleva -s: *she eats*, *he goes*, *she has*.',
  },
  {
    patron: new RegExp(`\\b(${VERBO_CON_S}|${VERBO_SIN_S}) (${ADVERBIO})\\b`),
    pista: '**always**, **usually**, **sometimes** y **never** van antes del verbo: *I always brush my teeth.*',
  },
  {
    patron: /\b(once|twice|three times|every day)( a (day|week))? (i|you|he|she|we|they)\b/,
    pista: '**once**, **twice**, **three times** y **every day** van al final de la frase.',
  },
];

export function pistaDeError(respuestaNormalizada: string): string | null {
  return REGLAS.find((r) => r.patron.test(respuestaNormalizada))?.pista ?? null;
}
