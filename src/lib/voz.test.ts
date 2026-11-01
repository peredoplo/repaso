import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callar, hablar } from './voz';

// En jsdom no hay Web Audio: las frases van por la voz del navegador, que aquí se espía.
const dichas: string[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  dichas.length = 0;
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    lang = '';
    rate = 1;
    voice = null;
    constructor(public text: string) {}
  });
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak: (u: { text: string }) => dichas.push(u.text) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('voz', () => {
  it('lo que iba a sonar tras contestar no suena si se pasa de ejercicio', () => {
    hablar('frase de prueba uno', { retraso: 300 });
    callar(); // «Continuar»
    vi.advanceTimersByTime(1000);
    expect(dichas).toEqual([]);
  });

  it('solo suena la última frase pedida', () => {
    hablar('frase de prueba uno', { retraso: 300 });
    hablar('frase de prueba dos');
    vi.advanceTimersByTime(1000);
    expect(dichas).toEqual(['frase de prueba dos']);
  });
});
