import { describe, expect, it } from 'vitest';
import { apuntarPartida, estrellasDe, progresoVacio, rachaActual } from './progreso';

const partida = { ruta: 'ingles/unit-1/habitos', estrellas: 2, xp: 15, falladas: ['a#1'], acertadas: ['a#2'] };

describe('progreso', () => {
  it('suma puntos, guarda las mejores estrellas y los fallos', () => {
    let p = apuntarPartida(progresoVacio(), partida, '2026-11-01');
    p = apuntarPartida(p, { ...partida, estrellas: 1, falladas: [], acertadas: ['a#1'] }, '2026-11-01');
    expect(p.xp).toBe(30);
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

  it('cuenta las estrellas por aciertos a la primera', () => {
    expect(estrellasDe(10, 10)).toBe(3);
    expect(estrellasDe(8, 10)).toBe(2);
    expect(estrellasDe(5, 10)).toBe(1);
  });
});
