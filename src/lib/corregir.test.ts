import { describe, expect, it } from 'vitest';
import type { ElegirT, EscribirT, OrdenarT } from '../contenido/esquema';
import { corregirElegir, corregirEscribir, corregirOrdenar } from './corregir';
import { distancia, normalizar } from './normalizar';
import { pistaDeError } from './pistas';

describe('normalizar', () => {
  it('quita mayúsculas, puntos y espacios de más', () => {
    expect(normalizar('  I always   brush my teeth. ')).toBe('i always brush my teeth');
    expect(normalizar('How often does she eat sweets?')).toBe('how often does she eat sweets');
  });
  it('mide la distancia de edición', () => {
    expect(distancia('twice', 'twise')).toBe(1);
    expect(distancia('once', 'once')).toBe(0);
  });
});

describe('ordenar', () => {
  const e: OrdenarT = {
    tipo: 'ordenar',
    enunciado: '',
    piezas: 'always / I / my teeth / brush / in the morning',
    solucion: 'I always brush my teeth in the morning.',
  };
  it('acepta la frase sin importar mayúsculas ni el punto', () => {
    expect(corregirOrdenar(e, 'I always brush my teeth in the morning').bien).toBe(true);
  });
  it('explica dónde va always', () => {
    const r = corregirOrdenar(e, 'I brush always my teeth in the morning');
    expect(r.bien).toBe(false);
    expect(r.feedback).toMatch(/antes del verbo/);
    expect(r.solucion).toBe(e.solucion);
  });
});

describe('escribir', () => {
  const b: EscribirT = {
    tipo: 'escribir',
    enunciado: '',
    pregunta: 'How often does he go to bed late?',
    plantilla: 'He ___ to bed late.',
    respuestas: ['never goes'],
    errores: [{ contiene: 'never go to', feedback: 'lleva -es' }],
  };
  it('acepta el hueco y también la frase entera', () => {
    expect(corregirEscribir(b, 'never goes').bien).toBe(true);
    expect(corregirEscribir(b, 'He never goes to bed late.').bien).toBe(true);
    expect(corregirEscribir(b, 'NEVER GOES').bien).toBe(true);
  });
  it('da el feedback del fallo previsto y la frase entera como solución', () => {
    const r = corregirEscribir(b, 'never go');
    expect(r.bien).toBe(false);
    expect(r.feedback).toBe('lleva -es');
    expect(r.solucion).toBe('He never goes to bed late.');
  });
  it('avisa de «two times» aunque no esté previsto', () => {
    const e: EscribirT = { tipo: 'escribir', enunciado: '', respuestas: ['He goes to bed early twice a week.'] };
    expect(corregirEscribir(e, 'He goes to bed early two times a week').feedback).toMatch(/twice/);
  });
  it('dice «¡Casi!» si es una falta de ortografía', () => {
    const e: EscribirT = { tipo: 'escribir', enunciado: '', plantilla: '___ a day', respuestas: ['twice'] };
    expect(corregirEscribir(e, 'twise').feedback).toMatch(/twice|Casi/);
  });
  it('escribir la pregunta: does she eats', () => {
    const e: EscribirT = { tipo: 'escribir', enunciado: '', plantilla: '___?', respuestas: ['How often does she eat sweets'] };
    expect(corregirEscribir(e, 'How often does she eat sweets?').bien).toBe(true);
    expect(corregirEscribir(e, 'How often does she eats sweets').feedback).toMatch(/sin -s/);
  });
});

describe('elegir', () => {
  const e: ElegirT = {
    tipo: 'elegir',
    enunciado: '',
    pregunta: 'She ___ fizzy drinks three times a week.',
    correcta: 'drinks',
    incorrectas: [{ texto: 'eats', feedback: 'se beben' }, 'drink'],
  };
  it('completa la frase para oírla y enseñarla', () => {
    expect(corregirElegir(e, 'drinks')).toMatchObject({ bien: true, voz: 'She drinks fizzy drinks three times a week.' });
    expect(corregirElegir(e, 'eats')).toMatchObject({ bien: false, feedback: 'se beben', solucion: 'She drinks fizzy drinks three times a week.' });
  });
});

describe('pistas', () => {
  it('reconoce los fallos típicos', () => {
    expect(pistaDeError('she eat sweets')).toMatch(/-s/);
    expect(pistaDeError('how often does she eat sweets')).toBeNull();
    expect(pistaDeError('how often do she eat sweets')).toMatch(/does/);
    expect(pistaDeError('she never goes to bed late')).toBeNull();
    expect(pistaDeError('my brother never eats sweets')).toBeNull();
  });
});
