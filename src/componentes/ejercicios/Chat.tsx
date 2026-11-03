import { useEffect, useRef, useState } from 'react';
import { PERSONAJES, type ChatT } from '../../contenido/esquema';
import { hablar } from '../../lib/voz';
import { BotonVoz, Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

/**
 * La teoría contada por los personajes (idea de Numeritis): un grupo de chat en el que los mensajes llegan de uno
 * en uno, cada vez que se pulsa «Seguir», y cada personaje los dice con su voz (`npm run voces`). El vocabulario en
 * inglés va en una tabla dentro del mensaje, con su altavoz.
 */
export default function Chat({ ejercicio: e, registrarSeguir }: PropsEjercicio<ChatT>) {
  const [vistos, setVistos] = useState(1);
  const ultimo = useRef<HTMLLIElement>(null);

  useEffect(() => {
    registrarSeguir(vistos < e.mensajes.length ? () => setVistos((n) => n + 1) : null);
  }, [vistos, e, registrarSeguir]);

  // Cada mensaje, al llegar, lo dice su personaje con su voz (si el sonido está puesto).
  useEffect(() => {
    if (vistos > 1) ultimo.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    const m = e.mensajes[vistos - 1];
    hablar(m.texto, { quien: m.de, auto: true, retraso: 150 });
  }, [vistos, e]);

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.titulo}</Texto>
      </h2>
      <ol className="chat" aria-live="polite">
        {e.mensajes.slice(0, vistos).map((m, i) => {
          const seguido = i > 0 && e.mensajes[i - 1].de === m.de;
          return (
            <li key={i} ref={i === vistos - 1 ? ultimo : undefined} className={`chat__fila${seguido ? ' chat__fila--seguida' : ''}`}>
              {seguido ? <span className="chat__cara" /> : <img className="chat__cara" src={`/personajes/${m.de}-cara.webp`} alt="" />}
              <div className="chat__burbuja">
                <span className="chat__voz">
                  <BotonVoz texto={m.texto} quien={m.de} etiqueta={`Oír a ${PERSONAJES[m.de]}`} />
                </span>
                {!seguido && <p className="chat__autor">{PERSONAJES[m.de]}</p>}
                {m.texto.split('\n').filter(Boolean).map((p, k) => (
                  <p key={k} className="chat__texto">
                    <Texto>{p}</Texto>
                  </p>
                ))}
                {m.dibujo && (
                  <p className="chat__dibujo" aria-hidden="true">
                    {m.dibujo}
                  </p>
                )}
                {m.palabras && (
                  <table className="chat__palabras">
                    <tbody>
                      {m.palabras.map(([en, es]) => (
                        <tr key={en}>
                          <td>
                            <span className="recuerda__ingles">
                              <BotonVoz texto={en} />
                              <span lang="en">{en}</span>
                            </span>
                          </td>
                          <td>
                            <Texto>{es}</Texto>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
