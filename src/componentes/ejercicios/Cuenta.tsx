import { useEffect, useMemo, useRef, useState } from 'react';
import type { CuentaT } from '../../contenido/esquema';
import { columnasDe, leerOperacion, NOMBRE_COLUMNA } from '../../lib/aritmetica';
import { corregirCuenta } from '../../lib/corregir';
import { Dibujo, Texto } from '../piezas';
import { Rejilla } from '../visuales';
import type { PropsEjercicio } from './tipos';

/**
 * Una suma o una resta en columna, como en el cuaderno: el resultado se escribe cifra a cifra, empezando por las
 * unidades (al escribir una, se salta a la columna de la izquierda), y encima se pueden apuntar las que te llevas,
 * que no se corrigen. Al fallar, la columna del fallo sale en rojo y el pie dice qué ha pasado en ella.
 */
export default function Cuenta({ ejercicio: e, resultado, registrar }: PropsEjercicio<CuentaT>) {
  const o = useMemo(() => leerOperacion(e.operacion)!, [e.operacion]);
  const columnas = columnasDe(o);
  const [casillas, setCasillas] = useState<string[]>(() => Array.from({ length: columnas }, () => ''));
  const [llevo, setLlevo] = useState<string[]>(() => Array.from({ length: columnas }, () => ''));
  const cajas = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    registrar(casillas.some((c) => c.trim()) ? () => corregirCuenta(e, casillas) : null);
  }, [casillas, e, registrar]);

  // En el ordenador, el cursor ya está en las unidades.
  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches !== false) cajas.current[0]?.focus();
  }, []);

  const poner = (i: number, valor: string) => {
    const cifra = valor.replace(/\D/g, '').slice(-1);
    setCasillas((c) => c.map((x, k) => (k === i ? cifra : x)));
    if (cifra && i + 1 < columnas) cajas.current[i + 1]?.focus();
  };
  const tecla = (i: number, ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Backspace' && !casillas[i] && i > 0) {
      ev.preventDefault();
      setCasillas((c) => c.map((x, k) => (k === i - 1 ? '' : x)));
      cajas.current[i - 1]?.focus();
    } else if (ev.key === 'ArrowLeft' && i + 1 < columnas) cajas.current[i + 1]?.focus();
    else if (ev.key === 'ArrowRight' && i > 0) cajas.current[i - 1]?.focus();
  };

  const corregida = resultado ? corregirCuenta(e, casillas) : null;
  const mal = corregida && !corregida.bien && corregida.columna !== undefined ? [corregida.columna] : [];
  const estado = resultado ? (resultado.bien ? ' cuenta__caja--bien' : ' cuenta__caja--mal') : '';

  // Encima de las unidades no se lleva nada.
  const arriba = llevo.map((l, i) =>
    i === 0 ? null : (
      <input
        key={i}
        className="cuenta__llevada"
        value={l}
        onChange={(ev) => setLlevo((x) => x.map((y, k) => (k === i ? ev.target.value.replace(/\D/g, '').slice(-1) : y)))}
        disabled={!!resultado}
        inputMode="numeric"
        aria-label={`Lo que te llevas a las ${NOMBRE_COLUMNA[i]}`}
        autoComplete="off"
      />
    ),
  );
  const abajo = casillas.map((c, i) => (
    <input
      key={i}
      ref={(el) => {
        cajas.current[i] = el;
      }}
      className={`cuenta__caja${estado}`}
      value={c}
      onChange={(ev) => poner(i, ev.target.value)}
      onKeyDown={(ev) => tecla(i, ev)}
      onFocus={(ev) => ev.target.select()}
      disabled={!!resultado}
      inputMode="numeric"
      aria-label={`Resultado: ${NOMBRE_COLUMNA[i]}`}
      autoComplete="off"
    />
  ));

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      {e.dibujo && <Dibujo dibujo={e.dibujo} />}
      {e.problema && (
        <p className="problema">
          <Texto>{e.problema}</Texto>
        </p>
      )}
      <div className="dibujo cuenta">
        <Rejilla columnas={columnas} filas={o.numeros.map(String)} signo={o.signo} arriba={arriba} abajo={abajo} mal={mal} />
        <p className="cuenta__ayuda">Empieza por las unidades. Arriba puedes apuntar las que te llevas.</p>
      </div>
    </div>
  );
}
