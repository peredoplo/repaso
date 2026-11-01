/**
 * La voz en inglés. Las frases grabadas con `npm run voces` (Azure, voz británica) están en public/voz/ y su índice
 * en src/voces.json; las que aún no se han grabado las lee el navegador con su voz inglesa.
 */
import indice from '../voces.json';
import { sonidoActivado } from './sonido';

const frases = indice.frases as Record<string, string>;

let audio: HTMLAudioElement | null = null;

export const estaGrabada = (texto: string) => texto.trim() in frases;

function sintetizar(texto: string, lenta: boolean): void {
  const s = globalThis.speechSynthesis;
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'en-GB';
  u.rate = lenta ? 0.6 : 0.9;
  const voz = s.getVoices().find((v) => v.lang === 'en-GB') ?? s.getVoices().find((v) => v.lang.startsWith('en'));
  if (voz) u.voice = voz;
  s.speak(u);
}

/**
 * Dice la frase. `auto`: la dice la web sola (tras contestar), y respeta el botón de silencio; si la pide el alumno
 * tocando el altavoz, suena siempre. `lenta`: la segunda vez que se toca, más despacio.
 */
export function hablar(texto: string, { auto = false, lenta = false } = {}): void {
  if (auto && !sonidoActivado()) return;
  const t = texto.trim();
  callar();
  const hash = frases[t];
  if (!hash) {
    sintetizar(t, lenta);
    return;
  }
  try {
    audio = new Audio(`/voz/${hash}.mp3`);
    audio.playbackRate = lenta ? 0.75 : 1;
    audio.play().catch(() => sintetizar(t, lenta));
  } catch {
    sintetizar(t, lenta);
  }
}

export function callar(): void {
  audio?.pause();
  audio = null;
  globalThis.speechSynthesis?.cancel();
}
