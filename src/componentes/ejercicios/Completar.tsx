import { useEffect, useMemo, useState } from 'react';
import type { CompletarT } from '../../contenido/esquema';
import { barajar } from '../../lib/barajar';
import { corregirCompletar } from '../../lib/corregir';
import { normalizar, rellenar } from '../../lib/normalizar';
import { sonar } from '../../lib/sonido';
import { BotonVoz, Dibujo, Senal, Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

/**
 * «Complete the sentences with the words from the box», como en la ficha: se toca una palabra del recuadro y va al
 * primer hueco libre (o al hueco elegido); tocando un hueco lleno, la palabra vuelve al recuadro. Las palabras no se
 * oyen al tocarlas (algunas sobran); al contestar, cada frase tiene su altavoz.
 */
export default function Completar({ ejercicio: e, resultado, registrar }: PropsEjercicio<CompletarT>) {
  const palabras = useMemo(() => barajar([...e.frases.map((f) => f.respuesta), ...(e.sobran ?? [])].map((texto, id) => ({ id, texto }))), [e]);
  /** La palabra (su id) de cada hueco. */
  const [huecos, setHuecos] = useState<(number | null)[]>(() => e.frases.map(() => null));
  const [elegido, setElegido] = useState<number | null>(null);
  const texto = (id: number | null) => (id === null ? null : palabras.find((p) => p.id === id)!.texto);

  useEffect(() => {
    const lleno = huecos.every((h) => h !== null);
    registrar(lleno ? () => corregirCompletar(e, huecos.map(texto)) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huecos, e, registrar]);

  const poner = (id: number) => {
    if (resultado) return;
    const destino = elegido !== null && huecos[elegido] === null ? elegido : huecos.indexOf(null);
    if (destino < 0) return;
    sonar('toque');
    setHuecos((h) => h.map((x, i) => (i === destino ? id : x)));
    setElegido(null);
  };
  const tocarHueco = (i: number) => {
    if (resultado) return;
    if (huecos[i] !== null) setHuecos((h) => h.map((x, k) => (k === i ? null : x)));
    else setElegido(elegido === i ? null : i);
  };

  const bienEn = (i: number) => normalizar(texto(huecos[i]) ?? '') === normalizar(e.frases[i].respuesta);

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      <div className="recuadro" aria-label="Palabras" lang="en">
        {palabras.map((p) => {
          const usada = huecos.includes(p.id);
          return (
            <button key={p.id} type="button" className={usada ? 'ficha ficha--hueco' : 'ficha'} disabled={usada || !!resultado} aria-hidden={usada} tabIndex={usada ? -1 : 0} onClick={() => poner(p.id)}>
              {p.texto}
            </button>
          );
        })}
      </div>
      <ol className="completar">
        {e.frases.map((f, i) => {
          const [antes, despues] = f.frase.split('___');
          const puesta = texto(huecos[i]);
          const estado = resultado ? (bienEn(i) ? ' hueco--bien' : ' hueco--mal') : elegido === i ? ' hueco--elegido' : '';
          return (
            <li key={i} className="completar__frase">
              {f.senal && <Senal s={f.senal} pequena />}
              {f.dibujo && <Dibujo dibujo={f.dibujo} />}
              <span className="completar__texto">
                {resultado && <BotonVoz texto={rellenar(f.frase, f.respuesta)} />}
                <span lang="en">
                  {antes}
                  <button type="button" className={`hueco hueco--boton${puesta ? ' hueco--lleno' : ''}${estado}`} disabled={!!resultado} aria-label={puesta ? `Quitar ${puesta}` : `Hueco ${i + 1}`} onClick={() => tocarHueco(i)}>
                    {puesta ?? ' '}
                  </button>
                  {resultado && !bienEn(i) && <strong className="completar__buena">{f.respuesta}</strong>}
                  {despues}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
