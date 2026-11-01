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
    const adverbios = c.temas.get('ingles/unit-1')!.lecciones.find((l) => l.id === 'adverbios')!;
    expect(adverbios.ejercicios.filter((e) => e.tipo === 'ordenar').length).toBeGreaterThanOrEqual(9);
    const howOften = c.temas.get('ingles/unit-1')!.lecciones.find((l) => l.id === 'how-often')!;
    expect(howOften.ejercicios.filter((e) => e.tipo === 'escribir').length).toBeGreaterThanOrEqual(6);
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
