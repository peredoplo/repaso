import { describe, expect, it } from 'vitest';
import { leerContenido } from '../../scripts/leer';
import { corregirElegir, corregirEscribir, corregirOrdenar } from '../lib/corregir';
import { partirPiezas } from '../lib/normalizar';
import { cargarContenido } from './cargar';

describe('contenido', () => {
  const c = leerContenido();

  it('no tiene errores', () => {
    expect(c.errores).toEqual([]);
  });

  it('cada ejercicio da por buena su propia solución', () => {
    for (const e of c.ejercicios.values()) {
      if (e.tipo === 'elegir') expect(corregirElegir(e, e.correcta).bien, e.id).toBe(true);
      if (e.tipo === 'ordenar') expect(corregirOrdenar(e, e.solucion).bien, e.id).toBe(true);
      if (e.tipo === 'escribir') for (const r of e.respuestas) expect(corregirEscribir(e, r).bien, e.id).toBe(true);
    }
  });

  it('lleva las 9 frases de la ficha de ordenar y los 6 de «Look and complete»', () => {
    const tema = c.temas.get('ingles/unit-1')!;
    const de = (...ids: string[]) => tema.lecciones.filter((l) => ids.includes(l.id)).flatMap((l) => l.ejercicios);
    const ordenar = de('adverbios', 'adverbios-2').flatMap((e) => (e.tipo === 'ordenar' ? [e.solucion] : []));
    for (const f of ['I always brush my teeth in the morning.', 'She has a shower every day.', 'I never go to bed late.', 'We sometimes do exercise after school.', 'He brushes his teeth twice a day.', 'I sometimes make my bed.', 'My sister always goes to bed early.', 'We eat healthy snacks twice a day.', 'My brother never eats sweets.']) {
      expect(ordenar).toContain(f);
    }
    // a-f: con tarjeta, en la primera lección de How often
    expect(de('how-often').filter((e) => 'tarjeta' in e && e.tarjeta).length).toBe(6);
  });

  it('ninguna lección pasa de 8 pantallas', () => {
    for (const l of c.temas.get('ingles/unit-1')!.lecciones) expect(l.ejercicios.length, l.id).toBeLessThanOrEqual(8);
  });

  it('detecta piezas que no forman la frase', () => {
    const r = cargarContenido({
      'contenido/perfiles.yaml': 'perfiles: [{ id: a, nombre: A, curso: x, avatar: x, temas: [t] }]',
      'contenido/t/tema.yaml': 'asignatura: x\ntitulo: x\nlecciones: [l]',
      'contenido/t/l.yaml': 'titulo: x\nemoji: x\nejercicios:\n  - { tipo: ordenar, piezas: a / b, solucion: a c }',
    });
    expect(r.errores.join()).toMatch(/no forman/);
    expect(partirPiezas('a / b c / d')).toEqual(['a', 'b c', 'd']);
  });
});
