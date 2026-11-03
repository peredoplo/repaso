/**
 * La voz en inglés. Las frases grabadas con `npm run voces` (Azure, voz británica) están en public/voz/ y su índice
 * en src/voces.json; las que aún no se han grabado las lee el navegador con su voz inglesa.
 * Los mensajes del chat, en español, los dice cada personaje con su voz (`quien`); sin grabar, los lee el navegador
 * en español.
 *
 * Para que suene enseguida: al empezar una lección se descargan y decodifican todas sus frases (`precargar`), se
 * reproducen con Web Audio (sin esperar a cargar nada) y se salta el silencio con el que empieza cada grabación.
 * Solo suena una frase a la vez: cada `hablar` o `callar` invalida la anterior, también si aún estaba cargando
 * o esperando su turno, así que al pasar de ejercicio nunca se oye lo del anterior.
 */
import indice from '../voces.json';
import { claveMensaje, sinMarcas } from './frases';
import { obtenerContexto, sonidoActivado } from './sonido';

const frases = { ...indice.frases, ...indice.mensajes } as Record<string, string>;

interface Grabacion {
  buffer: AudioBuffer;
  /** Para oírla despacio sin que la voz se vuelva grave (con <audio>, que conserva el tono). */
  url: string;
  /** Segundos de silencio del principio, que se saltan. */
  inicio: number;
}

const cache = new Map<string, Promise<Grabacion | null>>();
/** Sube con cada `hablar` y cada `callar`: una frase que llega tarde solo suena si sigue siendo la última pedida. */
let turno = 0;
let espera: ReturnType<typeof setTimeout> | null = null;
let fuente: AudioBufferSourceNode | null = null;
let elemento: HTMLAudioElement | null = null;

export const estaGrabada = (texto: string) => texto.trim() in frases;

/** Dónde empieza a sonar de verdad (un poco antes, para no cortar la primera consonante). */
function inicioDe(buffer: AudioBuffer): number {
  const datos = buffer.getChannelData(0);
  const umbral = 0.02;
  for (let i = 0; i < datos.length; i++) {
    if (Math.abs(datos[i]) > umbral) return Math.max(0, i / buffer.sampleRate - 0.04);
  }
  return 0;
}

function cargar(texto: string): Promise<Grabacion | null> | null {
  const hash = frases[texto.trim()];
  if (!hash) return null;
  const guardada = cache.get(hash);
  if (guardada) return guardada;
  const ctx = obtenerContexto();
  if (!ctx || typeof fetch !== 'function') return null;
  const promesa = fetch(`/voz/${hash}.mp3`)
    .then((r) => {
      if (!r.ok) throw new Error(`${hash}: ${r.status}`);
      return r.blob();
    })
    .then(async (blob) => {
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      return { buffer, url: URL.createObjectURL(blob), inicio: inicioDe(buffer) };
    })
    .catch(() => {
      cache.delete(hash); // se reintenta la próxima vez
      return null;
    });
  cache.set(hash, promesa);
  return promesa;
}

/** Descarga y prepara estas frases en segundo plano (las de la lección que empieza). */
export function precargar(textos: string[]): void {
  for (const t of new Set(textos)) cargar(t);
}

function decirEnNavegador(texto: string, lenta: boolean, idioma = 'en-GB'): void {
  const s = globalThis.speechSynthesis;
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = idioma;
  u.rate = lenta ? 0.6 : 0.9;
  const voz = s.getVoices().find((v) => v.lang === idioma) ?? s.getVoices().find((v) => v.lang.startsWith(idioma.slice(0, 2)));
  if (voz) u.voice = voz;
  s.speak(u);
}

function reproducir(g: Grabacion, lenta: boolean): void {
  const ctx = obtenerContexto();
  if (lenta || !ctx) {
    elemento = new Audio(g.url);
    elemento.playbackRate = lenta ? 0.7 : 1;
    elemento.currentTime = g.inicio;
    void elemento.play().catch(() => {});
    return;
  }
  if (ctx.state !== 'running') void ctx.resume();
  fuente = ctx.createBufferSource();
  fuente.buffer = g.buffer;
  fuente.connect(ctx.destination);
  fuente.start(0, g.inicio);
}

/**
 * Dice la frase. `auto`: la dice la web sola (tras contestar), y respeta el botón de silencio; si la pide el alumno
 * tocando el altavoz, suena siempre. `lenta`: más despacio. `retraso`: milisegundos de espera (cancelable).
 * `quien`: es un mensaje del chat, en español, y lo dice ese personaje.
 */
export function hablar(texto: string, { auto = false, lenta = false, retraso = 0, quien = '' } = {}): void {
  if (auto && !sonidoActivado()) return;
  callar();
  const mio = turno;
  const t = quien ? claveMensaje(quien, texto) : texto.trim();
  // Sin grabación, la voz del navegador: en español para los mensajes del chat.
  const enNavegador = () => (quien ? decirEnNavegador(sinMarcas(texto), lenta, 'es-ES') : decirEnNavegador(t, lenta));
  const empezar = () => {
    espera = null;
    const p = cargar(t);
    if (!p) {
      enNavegador();
      return;
    }
    void p.then((g) => {
      if (mio !== turno) return; // mientras cargaba se pidió otra cosa (o se pasó de ejercicio)
      if (g) reproducir(g, lenta);
      else enNavegador();
    });
  };
  if (retraso > 0) espera = setTimeout(empezar, retraso);
  else empezar();
}

/** Para lo que esté sonando y anula lo que estuviera a punto de sonar. */
export function callar(): void {
  turno++;
  if (espera) clearTimeout(espera);
  espera = null;
  try {
    fuente?.stop();
  } catch {
    /* ya había terminado */
  }
  fuente = null;
  elemento?.pause();
  elemento = null;
  globalThis.speechSynthesis?.cancel();
}
