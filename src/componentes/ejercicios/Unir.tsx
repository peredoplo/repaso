import { useMemo, useRef, useState } from 'react';
import type { UnirT } from '../../contenido/esquema';
import { barajar } from '../../lib/barajar';
import { seLee, tieneLetras } from '../../lib/normalizar';
import { sonar } from '../../lib/sonido';
import { hablar } from '../../lib/voz';
import { claveDicho } from '../../lib/frases';
import { Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

type Lado = 0 | 1;

/** Se toca uno de cada columna. Si son pareja, se quedan en verde; si no, tiemblan. Se corrige solo al acabar. */
export default function Unir({ ejercicio: e, resultado, onResultado, espanol }: PropsEjercicio<UnirT>) {
  const columnas = useMemo(() => [barajar(e.pares.map((_, i) => i)), barajar(e.pares.map((_, i) => i))] as const, [e]);
  const [elegido, setElegido] = useState<{ lado: Lado; i: number } | null>(null);
  const [hechas, setHechas] = useState<number[]>([]);
  const [mal, setMal] = useState<{ lado: Lado; i: number }[]>([]);
  const fallos = useRef(0);

  const tocar = (lado: Lado, i: number) => {
    if (resultado || hechas.includes(i)) return;
    const texto = e.pares[i][lado];
    // En español (Matemáticas), la tarjeta la dice el narrador, grabada; en inglés, la voz de las frases.
    if (espanol) hablar(texto, { clave: claveDicho(texto), es: true });
    else if (seLee(texto)) hablar(texto);
    if (!elegido || elegido.lado === lado) {
      setElegido({ lado, i });
      return;
    }
    if (elegido.i === i) {
      const nuevas = [...hechas, i];
      setHechas(nuevas);
      setElegido(null);
      sonar('toque');
      if (nuevas.length === e.pares.length) {
        const n = fallos.current;
        onResultado({ bien: n === 0, feedback: n ? `Lo has conseguido, con ${n === 1 ? 'un fallo' : `${n} fallos`} por el camino.` : undefined });
      }
    } else {
      fallos.current++;
      sonar('fallo');
      setMal([elegido, { lado, i }]);
      setElegido(null);
      setTimeout(() => setMal([]), 600);
    }
  };

  const clase = (lado: Lado, i: number) => {
    if (hechas.includes(i)) return 'unir__boton unir__boton--hecho';
    if (mal.some((m) => m.lado === lado && m.i === i)) return 'unir__boton unir__boton--mal';
    if (elegido?.lado === lado && elegido.i === i) return 'unir__boton unir__boton--elegido';
    return 'unir__boton';
  };

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      <div className="unir">
        {([0, 1] as const).map((lado) => (
          <div key={lado} className="unir__columna">
            {columnas[lado].map((i) => {
              const texto = e.pares[i][lado];
              return (
                <button key={i} type="button" className={clase(lado, i)} disabled={hechas.includes(i)} onClick={() => tocar(lado, i)}>
                  <span className={tieneLetras(texto) ? '' : 'unir__emoji'} lang={espanol ? 'es' : 'en'}>
                    {texto}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
