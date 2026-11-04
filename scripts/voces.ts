/**
 * Graba la voz en inglés de todas las frases del contenido con Azure Speech (adaptado de Numeritis), y los mensajes
 * del chat, en español, cada uno con la voz de su personaje. En los temas sin leer (Miguel), todo en español: la orden,
 * las opciones y lo que se oye al contestar, con la voz del narrador.
 * Uso: npm run voces              → graba solo las frases nuevas o cambiadas y borra los audios que sobran.
 *      npm run voces -- --lista   → solo enseña las frases, sin grabar nada.
 *      npm run voces -- --rehacer "texto"  → vuelve a grabar las frases que contienen ese texto.
 * Necesita AZURE_SPEECH_KEY y AZURE_SPEECH_REGION en .env (no se sube al repositorio).
 * Escribe public/voz/<hash>.mp3 y src/voces.json (el índice: frase → archivo; los mensajes, «personaje|texto» → archivo).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PERSONAJES } from '../src/contenido/esquema';
import { alEmpezar, claveInicio, claveMensaje, dichoSinLeer, frasesInglesas, mensajesHablados, sinMarcas, type Inicio } from '../src/lib/frases';
import { HUECO } from '../src/lib/normalizar';
import { leerContenido } from './leer';

/** Voz británica, como la del cole; un poco más lenta para niños de 8 años. */
const VOZ = 'en-GB-SoniaNeural';
const VELOCIDAD = '-12%';
const FORMATO = 'audio-24khz-48kbitrate-mono-mp3';

/**
 * Una voz distinta para cada personaje del chat, algo infantil (petición del autor, 3 de noviembre de 2026). En español
 * no hay voces de niño: son las voces de adulto de tono natural más alto, con el tono algo subido. Subirlo mucho (+45 %)
 * sonaba artificial (revisión del autor, el mismo día): como mucho, +20 %, y Vega, sin subir. Medido: unos 262 Hz Vega, 250 Valentina,
 * 195 Hugo y 180 Santiago, que es el más alto.
 */
const VOCES: Record<keyof typeof PERSONAJES, { voz: string; tono: string }> = {
  vega: { voz: 'es-ES-IreneNeural', tono: '+0%' },
  valentina: { voz: 'es-ES-XimenaNeural', tono: '+6%' },
  hugo: { voz: 'es-ES-EliasNeural', tono: '+20%' },
  santiago: { voz: 'es-ES-DarioNeural', tono: '+15%' },
};
/**
 * Lo que va en *cursiva* (el vocabulario en inglés) lo dice la misma voz que las palabras y los ejercicios, a su
 * velocidad (revisión del autor: la de hombre grave no era agradable de oír).
 */
const VOZ_INGLES = { voz: VOZ, tono: '+0%', velocidad: VELOCIDAD };
/** Silencio antes del inglés y, algo más largo, al volver al español. */
const PAUSA_ANTES = '150ms';
const PAUSA_DESPUES = '300ms';
const VELOCIDAD_CHAT = '-5%';

const raiz = process.cwd();
const carpetaVoz = join(raiz, 'public/voz');
const indiceVoces = join(raiz, 'src/voces.json');

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const escaparXml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hash = (frase: string, voz = VOZ, velocidad = VELOCIDAD) =>
  createHash('sha1').update(`${voz}|${velocidad}|${frase}`).digest('hex').slice(0, 12);

const ssmlFrase = (frase: string) =>
  `<speak version='1.0' xml:lang='en-GB'><voice name='${VOZ}'><prosody rate='${VELOCIDAD}'>${escaparXml(frase)}</prosody></voice></speak>`;

type Voz = { voz: string; tono: string };

/**
 * Lo que va en *cursiva* es inglés (el vocabulario) y lo dice la voz del inglés; lo demás, el personaje. Lo que no
 * tiene letras («, », «).») va con el trozo de antes, para que «*Nutrition*, *interaction*» lo diga seguido una voz.
 */
function trozosMensaje(texto: string): { ingles: boolean; texto: string }[] {
  const trozos: { ingles: boolean; texto: string }[] = [];
  for (const t of texto.trim().split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)) {
    if (!t) continue;
    const ingles = /^\*[^*]/.test(t);
    const limpio = t.replace(/\*/g, '');
    const anterior = trozos.at(-1);
    if (anterior && (anterior.ingles === ingles || !/\p{L}/u.test(limpio))) anterior.texto += limpio;
    else trozos.push({ ingles, texto: limpio });
  }
  return trozos;
}

function ssmlMensaje(texto: string, personaje: Voz): string {
  const trozos = trozosMensaje(texto);
  const partes = trozos.map((t, i) => {
    const { voz, tono, velocidad } = t.ingles ? VOZ_INGLES : { ...personaje, velocidad: VELOCIDAD_CHAT };
    const antes = !t.ingles && i > 0 ? `<break time='${PAUSA_DESPUES}'/>` : '';
    const despues = !t.ingles && trozos[i + 1]?.ingles ? `<break time='${PAUSA_ANTES}'/>` : '';
    return `<voice name='${voz}'>${SIN_RELLENO}${antes}<prosody rate='${velocidad}' pitch='${tono}'>${escaparXml(t.texto.trim())}</prosody>${despues}</voice>`;
  });
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='es-ES'>${partes.join('')}</speak>`;
}

/**
 * Azure pone más de un segundo de silencio al principio y al final de cada voz, y al cambiar de voz se notaba un
 * parón: se quita, para que solo queden las pausas de arriba (medido: unos 0,3-0,4 s).
 */
const SIN_RELLENO = `<mstts:silence type='Leading-exact' value='0ms'/><mstts:silence type='Tailing-exact' value='0ms'/>`;

/**
 * La orden y las frases del principio de cada ejercicio, seguidas (petición del autor, 4 de noviembre de 2026). La orden
 * en español la dice una voz de adulto que no es de ningún personaje; en inglés, la voz de las frases. Lo que va en
 * **negrita** en una orden en inglés son letras desordenadas («Unscramble the letters: **lecl**»): se deletrean.
 */
const NARRADOR = { voz: 'es-ES-ElviraNeural', tono: '+0%', velocidad: VELOCIDAD_CHAT };
const PAUSA_FRASE = '400ms';
const PAUSA_HUECO = '700ms';

/** La voz del narrador sola, en español (lo de los temas sin leer). */
const ssmlNarrador = (xml: string) =>
  `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='es-ES'><voice name='${NARRADOR.voz}'>${SIN_RELLENO}<prosody rate='${NARRADOR.velocidad}' pitch='${NARRADOR.tono}'>${xml}</prosody></voice></speak>`;

function ssmlInicio(i: Inicio, ordenEnIngles: boolean, sinLeer = false): string {
  if (sinLeer) {
    const conHueco = (t: string) => escaparXml(sinMarcas(t)).split(HUECO).join(`<break time='${PAUSA_HUECO}'/>`);
    return ssmlNarrador([i.enunciado, ...i.frases].map(conHueco).join(`<break time='${PAUSA_FRASE}'/>`));
  }
  const trozos = ordenEnIngles
    ? [{ ingles: true, xml: escaparXml(i.enunciado).replace(/\*\*([^*]+)\*\*/g, "<say-as interpret-as='characters'>$1</say-as>").replace(/\*/g, '') }]
    : trozosMensaje(i.enunciado).map((t) => ({ ingles: t.ingles, xml: escaparXml(t.texto.trim()) }));
  for (const f of i.frases) {
    const xml = `<break time='${PAUSA_FRASE}'/>${escaparXml(f).split(HUECO).join(`<break time='${PAUSA_HUECO}'/>`)}`;
    const anterior = trozos.at(-1)!;
    if (anterior.ingles) anterior.xml += ` ${xml}`;
    else trozos.push({ ingles: true, xml });
  }
  const partes = trozos.map((t, k) => {
    const { voz, tono, velocidad } = t.ingles ? VOZ_INGLES : NARRADOR;
    const antes = !t.ingles && k > 0 ? `<break time='${PAUSA_DESPUES}'/>` : '';
    const despues = !t.ingles && trozos[k + 1]?.ingles ? `<break time='${PAUSA_ANTES}'/>` : '';
    return `<voice name='${voz}'>${SIN_RELLENO}${antes}<prosody rate='${velocidad}' pitch='${tono}'>${t.xml}</prosody>${despues}</voice>`;
  });
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='${ordenEnIngles ? 'en-GB' : 'es-ES'}'>${partes.join('')}</speak>`;
}

const firmaInicio = (ordenEnIngles: boolean, sinLeer: boolean) =>
  `${ordenEnIngles ? 'en' : NARRADOR.voz + NARRADOR.velocidad}+${VOZ_INGLES.voz}${VOZ_INGLES.velocidad}+${PAUSA_FRASE}${PAUSA_HUECO}${PAUSA_ANTES}${PAUSA_DESPUES}+inicio${sinLeer ? '+sinleer' : ''}`;
const FIRMA_SIN_LEER = `${NARRADOR.voz}${NARRADOR.velocidad}${NARRADOR.tono}+sinleer`;

/** Para el nombre del audio: si cambia una voz, su tono o las pausas, se vuelve a grabar. */
const firmaMensaje = (v: Voz) =>
  `${v.voz}${v.tono}+${VOZ_INGLES.voz}${VOZ_INGLES.tono}${VOZ_INGLES.velocidad}+${PAUSA_ANTES}${PAUSA_DESPUES}+exacto`;

function entorno() {
  if (existsSync(join(raiz, '.env'))) process.loadEnvFile(join(raiz, '.env'));
  const clave = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!clave || !region) {
    console.error('Faltan AZURE_SPEECH_KEY o AZURE_SPEECH_REGION en .env.');
    process.exit(1);
  }
  return { clave, region };
}

async function pedir(url: string, init: RequestInit, intentos = 6): Promise<Response> {
  for (let k = 1; ; k++) {
    const r = await fetch(url, init);
    if (r.status !== 429 && r.status < 500) return r;
    if (k >= intentos) return r;
    await esperar((Number(r.headers.get('retry-after')) || 10 * k) * 1000);
  }
}

async function grabar(ssml: string, { clave, region }: { clave: string; region: string }): Promise<Buffer> {
  const r = await pedir(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': clave,
      'Content-Type': 'application/ssml+xml; charset=utf-8',
      'X-Microsoft-OutputFormat': FORMATO,
      'User-Agent': 'repaso',
    },
    body: ssml,
  });
  if (!r.ok) throw new Error(`Azure (voz) respondió ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  const c = leerContenido();
  if (c.errores.length) {
    console.error('Arregla antes los errores del contenido (npm run validar).');
    process.exit(1);
  }
  const todas = new Set<string>();
  for (const e of c.ejercicios.values()) frasesInglesas(e).forEach((f) => todas.add(f));
  // Los mensajes del chat: «vega|texto» → lo que se graba con la voz de Vega.
  const mensajes = new Map<string, { voz: Voz; texto: string }>();
  for (const e of c.ejercicios.values()) {
    for (const m of mensajesHablados(e)) {
      mensajes.set(claveMensaje(m.de, m.texto), { voz: VOCES[m.de as keyof typeof VOCES], texto: m.texto.trim() });
    }
  }
  const archivoMensaje = (m: { voz: Voz; texto: string }) => `${hash(m.texto, firmaMensaje(m.voz), VELOCIDAD_CHAT)}.mp3`;
  // El principio de cada ejercicio: la orden (en el idioma de su tema) y sus frases.
  const inicios = new Map<string, { inicio: Inicio; enIngles: boolean; sinLeer: boolean }>();
  for (const [id, e] of c.ejercicios) {
    const inicio = alEmpezar(e);
    if (!inicio) continue;
    const tema = c.temas.get(id.split('#')[0].split('/').slice(0, -1).join('/'));
    inicios.set(claveInicio(inicio), { inicio, enIngles: tema?.enunciados === 'en', sinLeer: !!e.sinLeer });
  }
  const archivoInicio = (clave: string, v: { enIngles: boolean; sinLeer: boolean }) => `${hash(clave, firmaInicio(v.enIngles, v.sinLeer))}.mp3`;
  // Sin leer: «opcion|Marte» y «respuesta|¡Casi! …» → lo que va detrás de la primera «|».
  const sinLeer = new Set([...c.ejercicios.values()].flatMap(dichoSinLeer));
  const textoSinLeer = (clave: string) => clave.slice(clave.indexOf('|') + 1);
  const archivoSinLeer = (clave: string) => `${hash(clave, FIRMA_SIN_LEER)}.mp3`;

  if (process.argv.includes('--lista')) {
    [...todas].sort().forEach((f) => console.log(f));
    [...mensajes.keys()].sort().forEach((k) => console.log(k));
    [...inicios.keys()].sort().forEach((k) => console.log(k));
    [...sinLeer].sort().forEach((k) => console.log(k));
    console.log(`\n${todas.size} frases, ${mensajes.size} mensajes del chat, ${inicios.size} principios de ejercicio y ${sinLeer.size} cosas sin leer.`);
    return;
  }
  if (process.argv.includes('--ssml')) {
    for (const [k, v] of inicios) if (process.argv.some((a) => a !== '--ssml' && k.includes(a))) console.log(ssmlInicio(v.inicio, v.enIngles, v.sinLeer));
    return;
  }

  const rehacer = process.argv.flatMap((a, i) => (a === '--rehacer' && process.argv[i + 1] ? [process.argv[i + 1]] : []));
  mkdirSync(carpetaVoz, { recursive: true });
  const toca = (texto: string, archivo: string) => rehacer.some((r) => texto.includes(r)) || !existsSync(join(carpetaVoz, archivo));
  const pendientes = [
    ...[...todas].filter((f) => toca(f, `${hash(f)}.mp3`)).map((f) => ({ archivo: `${hash(f)}.mp3`, ssml: ssmlFrase(f), que: f })),
    ...[...mensajes]
      .filter(([, m]) => toca(m.texto, archivoMensaje(m)))
      .map(([k, m]) => ({ archivo: archivoMensaje(m), ssml: ssmlMensaje(m.texto, m.voz), que: k })),
    ...[...inicios]
      .filter(([k, v]) => toca(k, archivoInicio(k, v)))
      .map(([k, v]) => ({ archivo: archivoInicio(k, v), ssml: ssmlInicio(v.inicio, v.enIngles, v.sinLeer), que: k })),
    ...[...sinLeer]
      .filter((k) => toca(k, archivoSinLeer(k)))
      .map((k) => ({ archivo: archivoSinLeer(k), ssml: ssmlNarrador(escaparXml(textoSinLeer(k))), que: k })),
  ];
  console.log(
    `${todas.size} frases, ${mensajes.size} mensajes del chat, ${inicios.size} principios de ejercicio y ${sinLeer.size} cosas sin leer; ${pendientes.length} por grabar.`,
  );

  const credenciales = pendientes.length ? entorno() : null;
  for (const [k, p] of pendientes.entries()) {
    writeFileSync(join(carpetaVoz, p.archivo), await grabar(p.ssml, credenciales!));
    console.log(`[${k + 1}/${pendientes.length}] ${p.que}`);
    await esperar(300);
  }

  const vigentes = new Set([
    ...[...todas].map((f) => `${hash(f)}.mp3`),
    ...[...mensajes.values()].map(archivoMensaje),
    ...[...inicios].map(([k, v]) => archivoInicio(k, v)),
    ...[...sinLeer].map(archivoSinLeer),
  ]);
  const sobran = readdirSync(carpetaVoz).filter((a) => a.endsWith('.mp3') && !vigentes.has(a));
  sobran.forEach((a) => unlinkSync(join(carpetaVoz, a)));

  // Generado por `npm run voces`: no se edita a mano.
  const indice = {
    voz: VOZ,
    frases: Object.fromEntries([...todas].sort().map((f) => [f, hash(f)])),
    mensajes: Object.fromEntries([...mensajes].sort(([a], [b]) => a.localeCompare(b)).map(([k, m]) => [k, archivoMensaje(m).slice(0, -4)])),
    inicios: Object.fromEntries([...inicios].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, archivoInicio(k, v).slice(0, -4)])),
    sinLeer: Object.fromEntries([...sinLeer].sort().map((k) => [k, archivoSinLeer(k).slice(0, -4)])),
  };
  writeFileSync(indiceVoces, `${JSON.stringify(indice, null, 1)}\n`);
  console.log(`Hecho. ${sobran.length ? `Borrados ${sobran.length} audios que sobraban. ` : ''}Índice: src/voces.json`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
