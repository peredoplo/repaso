import { describe, expect, it } from 'vitest';
import { corregirCuenta, cuentaCierta, escribirNumero, evaluar, leerNumero, leerOperacion, llevadas } from './aritmetica';
import { paraDecir } from './frases';
import { normalizar } from './normalizar';

/** «8.222» → las casillas, desde las unidades. */
const casillas = (n: string, columnas = 4) => {
  const c = [...n.replace(/\D/g, '')].reverse();
  return Array.from({ length: columnas }, (_, i) => c[i] ?? '');
};

describe('aritmética', () => {
  it('lee y escribe los números como el libro', () => {
    expect(leerNumero('5.783')).toBe(5783);
    expect(leerNumero('5783')).toBe(5783);
    expect(leerNumero('5 783')).toBe(5783);
    expect(leerNumero('5,7')).toBeNaN();
    expect(escribirNumero(8222)).toBe('8.222');
    expect(escribirNumero(742)).toBe('742');
    expect(normalizar('8.049')).toBe(normalizar('8049'));
  });

  it('lee sumas y restas en columna', () => {
    expect(leerOperacion('1.456 + 635 + 2.930')).toEqual({ numeros: [1456, 635, 2930], signo: '+', resultado: 5021 });
    expect(leerOperacion('4.152 - 2.534')?.resultado).toBe(1618);
    expect(leerOperacion('4.152 − 2.534')?.resultado).toBe(1618);
    // La resta, del grande el pequeño, y de dos números; nada de mezclar signos.
    expect(leerOperacion('2.534 - 4.152')).toBeNull();
    expect(leerOperacion('9 - 2 - 1')).toBeNull();
    expect(leerOperacion('9 + 2 - 1')).toBeNull();
    expect(llevadas(leerOperacion('5.783 + 2.439')!)).toEqual([0, 1, 1, 1]);
    expect(llevadas(leerOperacion('4.152 - 2.534')!)).toEqual([0, 1, 0, 1]);
  });

  it('da por buena la cuenta bien hecha, también con casillas de más a la izquierda', () => {
    const o = leerOperacion('2.415 - 1.673')!;
    expect(corregirCuenta(o, casillas('742')).bien).toBe(true);
    expect(corregirCuenta(o, ['2', '4', '7', '0']).bien).toBe(true);
    expect(corregirCuenta(o, ['2', '', '7', '']).feedback).toMatch(/Te falta alguna cifra/);
  });

  it('suma: se da cuenta de que se han olvidado las llevadas', () => {
    const o = leerOperacion('5.783 + 2.439')!;
    const r = corregirCuenta(o, casillas('7.112'));
    expect(r.bien).toBe(false);
    expect(r.feedback).toMatch(/las que te llevas/);
    expect(r.feedback).toMatch(/3 \+ 9 = 12: pones 2 y te llevas 1/);
    expect(r.columna).toBe(1);
  });

  it('suma: si no es un fallo típico, explica la primera columna mal', () => {
    const o = leerOperacion('5.783 + 2.439')!;
    const r = corregirCuenta(o, casillas('8.232'));
    expect(r.columna).toBe(1);
    expect(r.feedback).toBe('Mira las decenas: 8 + 3 = 11, y 1 que te llevabas, 12: pones 2 y te llevas 1.');
    // La última columna se pone entera.
    expect(corregirCuenta(leerOperacion('68 + 85 + 72')!, ['5', '2', '3']).bien).toBe(false);
    expect(corregirCuenta(leerOperacion('68 + 85 + 72')!, ['5', '2', '1']).feedback).toMatch(/centenas: no hay cifras que sumar, solo 2 que te llevabas: pones 2/);
  });

  it('resta: se da cuenta de que se ha restado el pequeño del grande', () => {
    const o = leerOperacion('4.152 - 2.534')!;
    const r = corregirCuenta(o, casillas('2.422'));
    expect(r.feedback).toMatch(/el pequeño del grande/);
    expect(r.feedback).toMatch(/unidades has restado/);
    expect(r.feedback).toMatch(/12 − 4 = 8, y te llevas 1/);
  });

  it('resta: se da cuenta de que se ha olvidado la que te llevas', () => {
    const o = leerOperacion('4.152 - 2.534')!;
    // Pide en las unidades (12 − 4 = 8) pero en las decenas hace 5 − 3 = 2 sin sumar el 1.
    const r = corregirCuenta(o, casillas('2.628'));
    expect(r.feedback).toMatch(/la que te llevas/);
    expect(r.feedback).toMatch(/3 \+ 1 que te llevabas = 4; 5 − 4 = 1/);
  });

  it('cálculo mental: comprueba las igualdades con el hueco', () => {
    expect(evaluar('45 + 32 - 7')).toBe(70);
    expect(cuentaCierta('6 + [4] = 10')).toBe(true);
    expect(cuentaCierta('[649] - 258 = 391')).toBe(true);
    expect(cuentaCierta('3.140 = 3.000 + [100] + 40')).toBe(true);
    expect(cuentaCierta('6 + [5] = 10')).toBe(false);
    expect(cuentaCierta('6 + 4 = 10')).toBe(false);
  });

  it('la voz dice los signos y las siglas con palabras', () => {
    expect(paraDecir('1 UM = 10 C = 1.000 U')).toBe('1 unidad de millar es igual a 10 centenas es igual a 1.000 unidades');
    expect(paraDecir('4.152 − 2.534')).toBe('4.152 menos 2.534');
    expect(paraDecir('8 < 9 y 7 > 5')).toBe('8 es menor que 9 y 7 es mayor que 5');
    expect(paraDecir('el 13.º y la 18.ª')).toBe('el decimotercero y la decimoctava');
    expect(paraDecir('4 UM + ___ C + 5 D')).toBe('4 unidades de millar más ___ centenas más 5 decenas');
  });
});
