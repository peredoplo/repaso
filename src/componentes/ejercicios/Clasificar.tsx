import { useMemo, useRef, useState } from 'react';
import type { ClasificarT } from '../../contenido/esquema';
import { barajar } from '../../lib/barajar';
import { claveDicho, partirOpcion, textoFicha } from '../../lib/frases';
import { sonar } from '../../lib/sonido';
import { hablar } from '../../lib/voz';
import { BotonVoz, Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

/**
 * «Complete the table», como en la ficha: las fichas salen de una en una y se toca la columna donde van. Si está
 * bien, entra en su columna y sale la siguiente (y se oye); si no, tiembla y se ve por qué. Se corrige solo al acabar.
 */
export default function Clasificar({ ejercicio: e, resultado, onResultado, espanol }: PropsEjercicio<ClasificarT>) {
  const fichas = useMemo(
    () => barajar(e.grupos.flatMap((g, grupo) => g.fichas.map((f) => ({ texto: textoFicha(f), feedback: typeof f === 'string' ? undefined : f.feedback, grupo })))),
    [e],
  );
  const [n, setN] = useState(0);
  const [mal, setMal] = useState<number | null>(null);
  const [porque, setPorque] = useState<string | null>(null);
  const fallos = useRef(0);
  const actual = fichas[n];

  // En inglés, «🚲 bicycle» se dice «bicycle»; en español (Matemáticas), la ficha entera, grabada por el narrador.
  const decir = (t: string) => (espanol ? t : partirOpcion(t).nombre);
  const voz = (t: string) => (espanol ? { clave: claveDicho(t), es: true } : {});

  const tocar = (grupo: number) => {
    if (resultado || !actual) return;
    if (grupo !== actual.grupo) {
      fallos.current++;
      sonar('fallo');
      setMal(grupo);
      setPorque(actual.feedback ?? `Va en **${e.grupos[actual.grupo].nombre}**.`);
      setTimeout(() => setMal(null), 600);
      return;
    }
    sonar('toque');
    setPorque(null);
    const siguiente = n + 1;
    setN(siguiente);
    if (siguiente < fichas.length) {
      hablar(decir(fichas[siguiente].texto), { auto: true, retraso: 250, ...voz(fichas[siguiente].texto) });
      return;
    }
    const k = fallos.current;
    onResultado({ bien: k === 0, feedback: k ? `Lo has conseguido, con ${k === 1 ? 'un fallo' : `${k} fallos`} por el camino.` : undefined });
  };

  const puestas = (grupo: number) => fichas.slice(0, n).filter((f) => f.grupo === grupo);

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      <div className="clasificar__carta" aria-live="polite">
        {actual ? (
          <>
            <p className="clasificar__ficha" key={n}>
              <BotonVoz texto={decir(actual.texto)} {...voz(actual.texto)} />
              <span lang={espanol ? 'es' : 'en'}>{actual.texto}</span>
            </p>
            <span className="clasificar__cuantas">
              {n + 1} / {fichas.length}
            </span>
          </>
        ) : (
          <p className="clasificar__ficha clasificar__ficha--fin">🎉</p>
        )}
      </div>
      {porque && (
        <p className="clasificar__porque" aria-live="polite">
          <Texto>{porque}</Texto>
        </p>
      )}
      <div className="clasificar" style={{ gridTemplateColumns: `repeat(${e.grupos.length}, minmax(0, 1fr))` }}>
        {e.grupos.map((g, i) => (
          <button key={i} type="button" className={`clasificar__grupo${mal === i ? ' clasificar__grupo--mal' : ''}`} disabled={!actual || !!resultado} onClick={() => tocar(i)}>
            <span className="clasificar__titulo">
              {g.dibujo && (
                <span className="clasificar__dibujo" aria-hidden="true">
                  {g.dibujo}
                </span>
              )}
              <span lang={espanol ? 'es' : 'en'}>{g.nombre}</span>
            </span>
            <span className="clasificar__lista" lang={espanol ? 'es' : 'en'}>
              {puestas(i).map((f) => (
                <span key={f.texto} className="clasificar__puesta">
                  {f.texto}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
