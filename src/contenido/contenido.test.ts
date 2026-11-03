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
    for (const t of c.temas.values()) for (const l of t.lecciones) expect(l.ejercicios.length, l.ruta).toBeLessThanOrEqual(8);
  });

  it('Natural Sciences lleva los ejercicios de las dos fichas, y la teoría en el chat', () => {
    const tema = c.temas.get('natural-sciences/unit-1')!;
    const todos = tema.lecciones.flatMap((l) => l.ejercicios);
    const frases = todos.flatMap((e) => ('pregunta' in e && e.pregunta ? [e.pregunta] : 'plantilla' in e && e.plantilla ? [e.plantilla] : []));
    // Support 1 y 6, Reach higher 2 y 6: las frases de verdadero o falso y de elegir.
    for (const f of [
      'Living things are classified into five kingdoms.',
      'All living things can move around.',
      'We can find both monera and protists in water.',
      'They are unicellular and usually live in or near water.',
      'Lions live in extended families in Africa.',
      'Humans usually give birth after nine months of pregnancy.',
      'All cells in animals and plants have a cell wall.',
      'Some protists divide into two cells to reproduce.',
    ]) {
      expect(frases).toContain(f);
    }
    // Support 5: las cinco palabras desordenadas.
    const desordenar = todos.filter((e) => e.tipo === 'escribir' && e.enunciado.startsWith('Unscramble'));
    expect(desordenar.map((e) => e.tipo === 'escribir' && e.respuestas[0])).toEqual(['cell', 'tissues', 'organ', 'system', 'organism']);
    // Las lecciones que empiezan un tema nuevo lo cuentan antes en el chat.
    for (const id of ['seres-vivos', 'funciones', 'celulas', 'partes-celula', 'reinos']) {
      expect(tema.lecciones.find((l) => l.id === id)!.ejercicios[0].tipo, id).toBe('chat');
    }
  });

  it('detecta piezas que no forman la frase', () => {
    const r = cargarContenido({
      'contenido/perfiles.yaml': 'perfiles: [{ id: a, nombre: A, curso: x, avatar: x, temas: [t] }]',
      'contenido/t/tema.yaml': 'asignatura: x\ntitulo: x\nlecciones: [l]',
      'contenido/t/l.yaml': 'titulo: x\nemoji: x\nejercicios:\n  - { tipo: ordenar, piezas: a / b, solucion: a c }',
    });
    expect(r.errores.join()).toMatch(/no forman/);
    const chat = cargarContenido({
      'contenido/perfiles.yaml': 'perfiles: [{ id: a, nombre: A, curso: x, avatar: x, temas: [t] }]',
      'contenido/t/tema.yaml': 'asignatura: x\ntitulo: x\nlecciones: [l]',
      'contenido/t/l.yaml': "titulo: x\nemoji: x\nejercicios:\n  - { tipo: chat, titulo: x, mensajes: [{ de: hugo, texto: '*Nutrition* y *interaction*.' }] }\n  - { tipo: unir, pares: [[a, b], [c, d]] }",
    });
    expect(chat.errores.join()).toMatch(/entre paréntesis/);
    expect(partirPiezas('a / b c / d')).toEqual(['a', 'b c', 'd']);
  });
});
