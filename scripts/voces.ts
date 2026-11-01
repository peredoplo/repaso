/**
 * Graba la voz en inglés de todas las frases del contenido con Azure Speech (adaptado de Numeritis).
 * Uso: npm run voces              → graba solo las frases nuevas o cambiadas y borra los audios que sobran.
 *      npm run voces -- --lista   → solo enseña las frases, sin grabar nada.
 *      npm run voces -- --rehacer "texto"  → vuelve a grabar las frases que contienen ese texto.
 * Necesita AZURE_SPEECH_KEY y AZURE_SPEECH_REGION en .env (no se sube al repositorio).
 * Escribe public/voz/<hash>.mp3 y src/voces.json (el índice: frase → archivo).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { frasesInglesas } from '../src/lib/frases';
import { leerContenido } from './leer';

/** Voz británica, como la del cole; un poco más lenta para niños de 8 años. */
const VOZ = 'en-GB-SoniaNeural';
const VELOCIDAD = '-12%';
const FORMATO = 'audio-24khz-48kbitrate-mono-mp3';

const raiz = process.cwd();
const carpetaVoz = join(raiz, 'public/voz');
const indiceVoces = join(raiz, 'src/voces.json');

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const escaparXml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hash = (frase: string) => createHash('sha1').update(`${VOZ}|${VELOCIDAD}|${frase}`).digest('hex').slice(0, 12);

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

async function grabar(frase: string, { clave, region }: { clave: string; region: string }): Promise<Buffer> {
  const ssml = `<speak version='1.0' xml:lang='en-GB'><voice name='${VOZ}'><prosody rate='${VELOCIDAD}'>${escaparXml(frase)}</prosody></voice></speak>`;
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

  if (process.argv.includes('--lista')) {
    [...todas].sort().forEach((f) => console.log(f));
    console.log(`\n${todas.size} frases, ${[...todas].reduce((s, f) => s + f.length, 0)} caracteres.`);
    return;
  }

  const rehacer = process.argv.flatMap((a, i) => (a === '--rehacer' && process.argv[i + 1] ? [process.argv[i + 1]] : []));
  mkdirSync(carpetaVoz, { recursive: true });
  const pendientes = [...todas].filter((f) => rehacer.some((r) => f.includes(r)) || !existsSync(join(carpetaVoz, `${hash(f)}.mp3`)));
  console.log(`${todas.size} frases; ${pendientes.length} por grabar (${pendientes.reduce((s, f) => s + f.length, 0)} caracteres).`);

  const credenciales = pendientes.length ? entorno() : null;
  for (const [k, frase] of pendientes.entries()) {
    writeFileSync(join(carpetaVoz, `${hash(frase)}.mp3`), await grabar(frase, credenciales!));
    console.log(`[${k + 1}/${pendientes.length}] ${frase}`);
    await esperar(300);
  }

  const vigentes = new Set([...todas].map((f) => `${hash(f)}.mp3`));
  const sobran = readdirSync(carpetaVoz).filter((a) => a.endsWith('.mp3') && !vigentes.has(a));
  sobran.forEach((a) => unlinkSync(join(carpetaVoz, a)));

  // Generado por `npm run voces`: no se edita a mano.
  const indice = { voz: VOZ, frases: Object.fromEntries([...todas].sort().map((f) => [f, hash(f)])) };
  writeFileSync(indiceVoces, `${JSON.stringify(indice, null, 1)}\n`);
  console.log(`Hecho. ${sobran.length ? `Borrados ${sobran.length} audios que sobraban. ` : ''}Índice: src/voces.json`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
