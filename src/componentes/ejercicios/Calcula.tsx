import { useEffect, useRef, useState } from 'react';
import type { CalculaT } from '../../contenido/esquema';
import { partirHueco } from '../../lib/aritmetica';
import { corregirCalcula } from '../../lib/corregir';
import { Dibujo, Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

/** Cálculo mental: unas cuantas cuentas cortas con su hueco («80 + 30 = …», «6 + … = 10»). */
export default function Calcula({ ejercicio: e, resultado, registrar }: PropsEjercicio<CalculaT>) {
  const cuentas = e.cuentas.map((c) => partirHueco(typeof c === 'string' ? c : c.cuenta)!);
  const [escritas, setEscritas] = useState<string[]>(() => cuentas.map(() => ''));
  const cajas = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    registrar(escritas.every((x) => x.trim()) ? () => corregirCalcula(e, escritas) : null);
  }, [escritas, e, registrar]);

  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches !== false) cajas.current[0]?.focus();
  }, []);

  const bienCada = resultado ? corregirCalcula(e, escritas).bienCada : null;

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      {e.dibujo && <Dibujo dibujo={e.dibujo} />}
      <ul className="calcula">
        {cuentas.map((c, i) => (
          <li key={i} className={`calcula__fila${bienCada ? (bienCada[i] ? ' calcula__fila--bien' : ' calcula__fila--mal') : ''}`}>
            {c.antes.trim()}
            <input
              ref={(el) => {
                cajas.current[i] = el;
              }}
              className="calcula__caja"
              value={escritas[i]}
              onChange={(ev) => setEscritas((x) => x.map((y, k) => (k === i ? ev.target.value.replace(/[^\d.]/g, '') : y)))}
              onKeyDown={(ev) => {
                // Enter pasa a la siguiente; en la última, comprueba (lo hace la lección).
                if (ev.key === 'Enter' && i + 1 < cuentas.length && !escritas.every((x) => x.trim())) {
                  ev.preventDefault();
                  ev.stopPropagation();
                  cajas.current[i + 1]?.focus();
                }
              }}
              disabled={!!resultado}
              inputMode="numeric"
              aria-label={`Cuenta ${i + 1}`}
              autoComplete="off"
              size={Math.max(3, c.respuesta.length + 1)}
            />
            {c.despues.trim()}
            {bienCada && !bienCada[i] && <span className="calcula__solucion">{c.respuesta}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
