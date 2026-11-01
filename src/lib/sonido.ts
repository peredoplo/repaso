// Sonidos de respuesta (Web Audio), traídos de Numeritis: el acierto, el fallo y el final son grabaciones
// (public/sonidos/); mientras no han llegado (o si fallan), suenan unas notas generadas en el navegador.
// Vienen activados de serie; se pueden silenciar y el ordenador lo recuerda.

export type Sonido = 'acierto' | 'fallo' | 'final' | 'toque';

export const CLAVE_SONIDO = 'repaso.sonido';

interface Nota {
  frecuencia: number;
  hasta?: number;
  inicio: number;
  duracion: number;
  forma: OscillatorType;
  volumen: number;
}

const nota = (frecuencia: number, inicio: number, duracion: number, volumen: number, forma: OscillatorType = 'triangle'): Nota => ({
  frecuencia,
  inicio,
  duracion,
  forma,
  volumen,
});

const MELODIAS: Record<Sonido, Nota[]> = {
  acierto: [nota(659.25, 0, 0.1, 0.18), nota(880, 0.09, 0.14, 0.18)],
  fallo: [nota(392, 0, 0.12, 0.2), { ...nota(330, 0.11, 0.2, 0.2), hasta: 311.13 }],
  final: [523.25, 659.25, 783.99, 1046.5].map((f, i) => nota(f, i * 0.1, i === 3 ? 0.25 : 0.12, 0.16)),
  toque: [nota(1046.5, 0, 0.05, 0.06, 'sine')],
};

const GRABACIONES: Partial<Record<Sonido, { url: string; volumen: number }>> = {
  acierto: { url: '/sonidos/acierto.mp3', volumen: 0.4 },
  fallo: { url: '/sonidos/fallo.mp3', volumen: 0.5 },
  final: { url: '/sonidos/final.mp3', volumen: 0.4 },
};

const grabaciones = new Map<Sonido, AudioBuffer>();

function cargarGrabaciones(ctx: AudioContext): void {
  if (typeof fetch !== 'function' || typeof ctx.decodeAudioData !== 'function') return;
  for (const [tipo, g] of Object.entries(GRABACIONES) as [Sonido, { url: string }][]) {
    fetch(g.url)
      .then((r) => {
        if (!r.ok) throw new Error(`${g.url}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((datos) => ctx.decodeAudioData(datos))
      .then((buffer) => grabaciones.set(tipo, buffer))
      .catch(() => {
        /* sin la grabación: suenan las notas */
      });
  }
}

export function sonidoActivado(): boolean {
  try {
    return localStorage.getItem(CLAVE_SONIDO) !== '0';
  } catch {
    return true;
  }
}

export function cambiarSonido(activado: boolean): void {
  try {
    localStorage.setItem(CLAVE_SONIDO, activado ? '1' : '0');
  } catch {
    /* sin almacenamiento: no se recuerda, pero no pasa nada */
  }
}

let contexto: AudioContext | null = null;

function obtenerContexto(): AudioContext | null {
  if (contexto) return contexto;
  const g = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const Contexto = g.AudioContext ?? g.webkitAudioContext;
  if (!Contexto) return null;
  try {
    contexto = new Contexto();
  } catch {
    return null;
  }
  cargarGrabaciones(contexto);
  return contexto;
}

let preparado = false;

/** El navegador solo deja sonar audio tras un toque: el contexto se crea (y se despierta) con el primero. */
export function prepararSonido(): void {
  if (preparado || typeof document === 'undefined') return;
  preparado = true;
  const eventos = ['pointerup', 'touchend', 'click', 'keydown'];
  const despertar = () => {
    for (const e of eventos) document.removeEventListener(e, despertar, true);
    const ctx = obtenerContexto();
    try {
      if (ctx?.state === 'suspended') void ctx.resume();
    } catch {
      /* sin audio: no pasa nada */
    }
  };
  for (const e of eventos) document.addEventListener(e, despertar, true);
}

export function sonar(tipo: Sonido): void {
  if (!sonidoActivado()) return;
  const ctx = obtenerContexto();
  if (!ctx) return;
  try {
    if (ctx.state !== 'running') void ctx.resume();
    const t0 = ctx.currentTime;
    const grabacion = grabaciones.get(tipo);
    if (grabacion) {
      const fuente = ctx.createBufferSource();
      const ganancia = ctx.createGain();
      fuente.buffer = grabacion;
      ganancia.gain.setValueAtTime(GRABACIONES[tipo]!.volumen, t0);
      fuente.connect(ganancia).connect(ctx.destination);
      fuente.start(t0);
      return;
    }
    for (const n of MELODIAS[tipo]) {
      const inicio = t0 + n.inicio;
      const fin = inicio + n.duracion;
      const oscilador = ctx.createOscillator();
      const ganancia = ctx.createGain();
      oscilador.type = n.forma;
      oscilador.frequency.setValueAtTime(n.frecuencia, inicio);
      if (n.hasta) oscilador.frequency.linearRampToValueAtTime(n.hasta, fin);
      ganancia.gain.setValueAtTime(0.0001, inicio);
      ganancia.gain.exponentialRampToValueAtTime(n.volumen, inicio + 0.01);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, fin);
      oscilador.connect(ganancia).connect(ctx.destination);
      oscilador.start(inicio);
      oscilador.stop(fin + 0.02);
    }
  } catch {
    /* si el audio falla, el ejercicio sigue igual */
  }
}
