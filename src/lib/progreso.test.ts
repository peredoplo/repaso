import { afterEach, describe, expect, it } from 'vitest';
import { apuntarPartida, estrellasDe, gemasDe, leerProgreso, progresoVacio, rachaActual } from './progreso';

const partida = { ruta: 'ingles/unit-1/habitos', estrellas: 2, gemas: 7, falladas: ['a#1'], acertadas: ['a#2'] };

describe('progreso', () => {
  afterEach(() => localStorage.clear());

  it('suma gemas, guarda las mejores estrellas y los fallos', () => {
    let p = apuntarPartida(progresoVacio(), partida, '2026-11-01');
    p = apuntarPartida(p, { ...partida, estrellas: 1, falladas: [], acertadas: ['a#1'] }, '2026-11-01');
    expect(p.gemas).toBe(14);
    expect(p.lecciones['ingles/unit-1/habitos'].estrellas).toBe(2);
    expect(p.fallos).toEqual([]);
  });

  it('la racha crece si se juega al día siguiente y se pierde si no', () => {
    let p = apuntarPartida(progresoVacio(), partida, '2026-10-31');
    p = apuntarPartida(p, partida, '2026-11-01');
    expect(p.racha.dias).toBe(2);
    expect(rachaActual(p, '2026-11-02')).toBe(2);
    expect(rachaActual(p, '2026-11-03')).toBe(0);
    expect(apuntarPartida(p, partida, '2026-11-05').racha.dias).toBe(1);
  });

  it('cuenta las estrellas por aciertos a la primera, y las gemas', () => {
    expect(estrellasDe(10, 10)).toBe(3);
    expect(estrellasDe(8, 10)).toBe(2);
    expect(estrellasDe(5, 10)).toBe(1);
    expect(gemasDe(3)).toBe(8);
    expect(gemasDe(1, 7.5)).toBe(13);
  });

  it('los puntos de antes (xp) pasan a ser gemas', () => {
    localStorage.setItem('repaso.progreso.julia', JSON.stringify({ xp: 42, racha: { dias: 1, ultimo: null }, lecciones: {}, fallos: [] }));
    const p = leerProgreso('julia');
    expect(p.gemas).toBe(42);
    expect(p.cofres).toEqual([]);
    expect(p.pegatinas).toEqual({});
  });
});
