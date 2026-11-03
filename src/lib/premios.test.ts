import { describe, expect, it } from 'vitest';
import { leerContenido } from '../../scripts/leer';
import { PRECIO_SOBRE, abrirCofre, cofreListo, cofresDe, comprarSobre, estadoCofre } from './premios';
import { progresoVacio, type Progreso } from './progreso';

const tema = leerContenido().temas.get('ingles/unit-1')!;
const hechas = (n: number): Progreso => ({
  ...progresoVacio(),
  lecciones: Object.fromEntries(tema.lecciones.slice(0, n).map((l) => [l.ruta, { estrellas: 3 }])),
});

describe('cofres', () => {
  it('hay uno cada dos lecciones, y el último tras el examen', () => {
    const cofres = cofresDe(tema);
    expect(cofres.map((c) => c.despuesDe)).toEqual([1, 3, 5, 7, 9, 11]);
    expect(cofres.at(-1)!.despuesDe).toBe(tema.lecciones.length - 1);
  });

  it('se abre cuando están hechas las lecciones de antes, y solo una vez', () => {
    const [primero] = cofresDe(tema);
    expect(estadoCofre(tema, primero, hechas(1))).toBe('cerrado');
    expect(estadoCofre(tema, primero, hechas(2))).toBe('listo');
    expect(cofreListo(tema, hechas(2))?.id).toBe(primero.id);

    const { progreso, premio } = abrirCofre(hechas(2), primero.id, () => 0.5);
    expect(premio.gemas).toBeGreaterThanOrEqual(10);
    expect(progreso.gemas).toBe(premio.gemas);
    expect(Object.values(progreso.pegatinas)).toEqual([1]);
    expect(estadoCofre(tema, primero, progreso)).toBe('abierto');
    expect(cofreListo(tema, progreso)).toBeNull();
  });
});

describe('sobres', () => {
  it('cuestan gemas y dan una pegatina; una repetida da gemas de consuelo', () => {
    expect(comprarSobre({ ...progresoVacio(), gemas: PRECIO_SOBRE - 1 })).toBeNull();
    const primera = comprarSobre({ ...progresoVacio(), gemas: 60 }, () => 0.9)!;
    expect(primera.progreso.gemas).toBe(60 - PRECIO_SOBRE);
    expect(primera.premio.repetida).toBe(false);
    const segunda = comprarSobre(primera.progreso, () => 0.9)!;
    expect(segunda.premio.repetida).toBe(true);
    expect(segunda.progreso.pegatinas[segunda.premio.pegatina.id]).toBe(2);
    expect(segunda.progreso.gemas).toBe(60 - 2 * PRECIO_SOBRE + segunda.premio.gemas);
  });
});
