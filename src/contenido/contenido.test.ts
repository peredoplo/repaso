import { describe, expect, it } from 'vitest';
import { leerContenido } from '../../scripts/leer';
import { cifras, columnasDe, leerOperacion, partirHueco } from '../lib/aritmetica';
import { corregirCalcula, corregirCompletar, corregirCuenta, corregirElegir, corregirEscribir, corregirOrdenar } from '../lib/corregir';
import { alEmpezar, claveInicio, dichoSinLeer, frasesInglesas, partirOpcion } from '../lib/frases';
import voces from '../voces.json';
import { esTeoria } from './esquema';
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
      if (e.tipo === 'completar') expect(corregirCompletar(e, e.frases.map((f) => f.respuesta)).bien, e.id).toBe(true);
      if (e.tipo === 'cuenta') {
        const o = leerOperacion(e.operacion)!;
        expect(corregirCuenta(e, cifras(o.resultado, columnasDe(o)).map(String)).bien, e.id).toBe(true);
      }
      if (e.tipo === 'calcula') expect(corregirCalcula(e, e.cuentas.map((c) => partirHueco(typeof c === 'string' ? c : c.cuenta)!.respuesta)).bien, e.id).toBe(true);
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

  it('al empezar cada ejercicio se oyen la orden y sus frases, y está grabado', () => {
    for (const e of c.ejercicios.values()) {
      const i = alEmpezar(e);
      if (esTeoria(e)) expect(i).toBeNull();
      else expect(Object.keys(voces.inicios), e.id).toContain(claveInicio(i!));
    }
    const lecl = [...c.ejercicios.values()].find((e) => 'enunciado' in e && e.enunciado.includes('lecl'))!;
    expect(alEmpezar(lecl)!.frases).toEqual(['A ___ is the smallest living unit.']);
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

it('Social Sciences lleva los ejercicios de las dos fichas, y la teoría en el chat', () => {
    const tema = c.temas.get('social-sciences/unit-1')!;
    const todos = tema.lecciones.flatMap((l) => l.ejercicios);
    const preguntas = todos.flatMap((e) => (e.tipo === 'elegir' && e.pregunta ? [e.pregunta] : []));
    // Support 1 y 4, Reach higher 2, 3 y 4.
    for (const f of [
      'Living in a community means taking care of each other.',
      'Small communities do not have any public services.',
      'Cities have narrow streets and few cars and buses.',
      'How often are local elections?',
      'Who do the participants choose?',
      'Ruth puts her old newspapers into the blue container.',
      'Brendan only buys what he really needs.',
      'Fabada',
      'What do maintenance services in towns do?',
      'Which services provide activities, indoors and outdoors, all through the year?',
    ]) {
      expect(preguntas).toContain(f);
    }
    // Support 2 y 3: las parejas.
    const pares = todos.flatMap((e) => (e.tipo === 'unir' ? e.pares.map((p) => p.join(' ')) : []));
    for (const p of ['spring rolls Chinese culture', 'tajines Maghreb culture', 'Rot: Put your organic waste in the compost bin.']) expect(pares).toContain(p);
    // Support 5 y 6: completar con las palabras del recuadro.
    const huecos = todos.flatMap((e) => (e.tipo === 'completar' ? e.frases.map((f) => f.respuesta) : []));
    for (const r of ['blue', 'black', 'triangle', 'red', 'stop', 'caution', 'go']) expect(huecos).toContain(r);
    // Reach higher 1: la tabla de Cities y Villages.
    const fichas = todos.flatMap((e) => (e.tipo === 'clasificar' ? e.grupos.flatMap((g) => g.fichas.map((x) => (typeof x === 'string' ? x : x.texto))) : []));
    for (const x of ['Streets are short and narrow.', 'Job opportunities are limited.', 'There is very little traffic.']) expect(fichas).toContain(x);
    for (const id of ['comunidad', 'costumbres', 'platos-de-espana', 'buenos-ciudadanos', 'cinco-erres', 'ayuntamiento', 'servicios', 'transporte', 'seguridad-vial', 'a-salvo']) {
      expect(tema.lecciones.find((l) => l.id === id)!.ejercicios[0].tipo, id).toBe('chat');
    }
  });

  it('Matemáticas: todo en español, la teoría en el chat y los ejercicios del libro', () => {
    const tema = c.temas.get('matematicas/unidades-1-2')!;
    expect(tema.idioma).toBe('es');
    const todos = tema.lecciones.flatMap((l) => l.ejercicios);
    for (const e of todos) {
      expect(e.espanol, e.id).toBe(true);
      expect(frasesInglesas(e), e.id).toEqual([]);
    }
    for (const l of tema.lecciones.filter((l) => !l.examen)) expect(l.ejercicios[0].tipo, l.ruta).toBe('chat');
    // Las sumas y restas de las páginas 24 y 25, y los problemas de las páginas 21, 25 y 35.
    const cuentas = todos.flatMap((e) => (e.tipo === 'cuenta' ? [e.operacion] : []));
    for (const o of ['5.783 + 2.439', '6.365 + 1.075', '1.456 + 635 + 2.930', '2.415 - 1.673', '3.641 - 2.756', '8.325 - 754', '68 + 85 + 72', '820 - 225', '1.875 - 108']) {
      expect(cuentas).toContain(o);
    }
    // Cada una de las 12 lecciones abre con su chat (el examen no).
    expect(todos.filter((e) => e.tipo === 'chat').length).toBe(12);
  });

  it('cuenta y calcula: el validador comprueba las operaciones', () => {
    const errores = (ejercicios: string) =>
      cargarContenido({
        'contenido/perfiles.yaml': 'perfiles: [{ id: a, nombre: A, curso: x, avatar: x, temas: [t] }]',
        'contenido/t/tema.yaml': 'asignatura: x\ntitulo: x\nidioma: es\nlecciones: [l]',
        'contenido/t/l.yaml': `titulo: x\nemoji: x\nejercicios:\n${ejercicios}`,
      }).errores.join('\n');
    expect(errores("  - { tipo: cuenta, operacion: '2.534 - 4.152' }")).toMatch(/no es una suma o una resta/);
    expect(errores("  - { tipo: cuenta, operacion: '2.534 + 4.152' }")).toBe('');
    expect(errores("  - { tipo: calcula, enunciado: x, cuentas: ['6 + [5] = 10'], explicacion: x }")).toMatch(/no está bien/);
    expect(errores("  - { tipo: calcula, enunciado: x, cuentas: ['6 + [4] = 10'] }")).toMatch(/su feedback/);
    expect(errores("  - { tipo: elegir, enunciado: '*Hola*', correcta: a, incorrectas: [b] }")).toMatch(/sin cursiva/);
    expect(errores("  - { tipo: elegir, enunciado: x, recta: { desde: 200, hasta: 300, paso: 10, marcas: [318] }, correcta: a, incorrectas: [b] }")).toMatch(/se sale de la recta/);
  });

  it('completar y clasificar: huecos, palabras repetidas y explicaciones', () => {
    const errores = (ejercicios: string) =>
      cargarContenido({
        'contenido/perfiles.yaml': 'perfiles: [{ id: a, nombre: A, curso: x, avatar: x, temas: [t] }]',
        'contenido/t/tema.yaml': 'asignatura: x\ntitulo: x\nlecciones: [l]',
        'contenido/t/l.yaml': `titulo: x\nemoji: x\nejercicios:\n${ejercicios}`,
      }).errores.join('\n');
    expect(errores("  - { tipo: completar, frases: [{ frase: 'a b', respuesta: x, feedback: y }, { frase: 'c ___', respuesta: z, feedback: y }] }")).toMatch(/necesita un hueco/);
    expect(errores("  - { tipo: completar, frases: [{ frase: 'a ___', respuesta: x, feedback: y }, { frase: 'c ___', respuesta: x, feedback: y }] }")).toMatch(/repetidas en el recuadro/);
    expect(errores("  - { tipo: completar, frases: [{ frase: 'a ___', respuesta: x }, { frase: 'c ___', respuesta: z, feedback: y }] }")).toMatch(/su feedback/);
    expect(errores("  - { tipo: clasificar, enunciado: x, grupos: [{ nombre: A, fichas: [uno] }, { nombre: B, fichas: [Uno.] }] }")).toMatch(/fichas repetidas/);
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
    const letras = cargarContenido({
      'contenido/perfiles.yaml': 'perfiles: [{ id: a, nombre: A, curso: x, avatar: x, temas: [t] }]',
      'contenido/t/tema.yaml': 'asignatura: x\ntitulo: x\nlecciones: [l]',
      'contenido/t/l.yaml': "titulo: x\nemoji: x\nejercicios:\n  - { tipo: escribir, enunciado: 'Unscramble the letters: **tsesui**', plantilla: 'they form ___.', respuestas: [tissues] }",
    });
    expect(letras.errores.join()).toMatch(/no forman «tissues»/);
    expect(partirPiezas('a / b c / d')).toEqual(['a', 'b c', 'd']);
  });

  it('sin leer: las opciones llevan dibujo y palabra, y cada fallo, su explicación', () => {
    const sinLeer = (ejercicios: string) =>
      cargarContenido({
        'contenido/perfiles.yaml': 'perfiles: [{ id: a, nombre: A, curso: x, avatar: x, temas: [t] }]',
        'contenido/t/tema.yaml': 'asignatura: x\ntitulo: x\nsinLeer: true\nlecciones: [l]',
        'contenido/t/l.yaml': `titulo: x\nemoji: x\nejercicios:\n${ejercicios}`,
      }).errores.join('\n');
    expect(sinLeer("  - { tipo: elegir, enunciado: '¿Color?', correcta: Rojo, incorrectas: [{ texto: '🔵 Azul', feedback: x }] }")).toMatch(/«Rojo» necesita un dibujo/);
    expect(sinLeer("  - { tipo: elegir, enunciado: '¿Color?', correcta: '🔴', incorrectas: [{ texto: '🔵 Azul', feedback: x }] }")).toMatch(/necesita una palabra/);
    expect(sinLeer("  - { tipo: elegir, enunciado: '¿Color?', correcta: '🔴 Rojo', incorrectas: ['🔵 Azul'] }")).toMatch(/su feedback/);
    expect(sinLeer("  - { tipo: escribir, enunciado: x, respuestas: [x] }")).toMatch(/solo hay chat, elegir y ordenar/);
    expect(sinLeer("  - { tipo: elegir, enunciado: '¿Cuántos?', correcta: '8', incorrectas: [{ texto: '3', feedback: Son ocho. }] }")).toBe('');
    expect(partirOpcion('🔴🟠 Entre Marte y Júpiter')).toEqual({ dibujo: '🔴🟠', nombre: 'Entre Marte y Júpiter' });
  });

  it('el universo de Miguel: cada exposición, una lección y tres a fondo, que empiezan por el chat, y todo grabado en español', () => {
    const temas = [...c.temas.values()].filter((t) => t.sinLeer);
    expect(temas.filter((t) => t.id.startsWith('universo/')).flatMap((t) => t.lecciones).length).toBe(19);
    expect(temas.filter((t) => t.id.startsWith('universo-a-fondo/')).flatMap((t) => t.lecciones).length).toBe(57);
    const grabado = new Set(Object.keys((voces as { sinLeer?: object }).sinLeer ?? {}));
    for (const l of temas.flatMap((t) => t.lecciones)) {
      expect(l.ejercicios[0].tipo, l.ruta).toBe('chat');
      for (const e of l.ejercicios) {
        expect(e.sinLeer, e.id).toBe(true);
        expect(frasesInglesas(e), e.id).toEqual([]);
        for (const clave of dichoSinLeer(e)) expect(grabado, clave).toContain(clave);
      }
    }
  });
});
