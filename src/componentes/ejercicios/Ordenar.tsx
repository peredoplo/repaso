import { useEffect, useMemo, useState } from 'react';
import type { OrdenarT } from '../../contenido/esquema';
import { barajar } from '../../lib/barajar';
import { corregirOrdenar } from '../../lib/corregir';
import { normalizar, partirPiezas } from '../../lib/normalizar';
import { sonar } from '../../lib/sonido';
import { hablar } from '../../lib/voz';
import { BotonVoz, Dibujo, Frase, Tarjeta, Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

/**
 * Como en Duolingo: se tocan las fichas de abajo y suben a la frase; tocando una de arriba, vuelve a su sitio.
 * En el ordenador, la tecla de borrar quita la última.
 */
export default function Ordenar({ ejercicio: e, resultado, registrar }: PropsEjercicio<OrdenarT>) {
  const piezas = useMemo(() => {
    const todas = [...partirPiezas(e.piezas), ...(e.sobran ?? []).filter((s) => !partirPiezas(e.piezas).some((p) => normalizar(p) === normalizar(s)))];
    const conId = todas.map((texto, id) => ({ id, texto }));
    return barajar(conId, (orden) => normalizar(orden.map((p) => p.texto).join(' ')) === normalizar(e.solucion));
  }, [e]);
  const [puestas, setPuestas] = useState<number[]>([]);
  const texto = (id: number) => piezas.find((p) => p.id === id)!.texto;

  useEffect(() => {
    registrar(puestas.length === 0 ? null : () => corregirOrdenar(e, puestas.map(texto).join(' ')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puestas, e, registrar]);

  useEffect(() => {
    if (e.escuchar) hablar(e.solucion, { retraso: 150 });
  }, [e]);

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Backspace' && !resultado) setPuestas((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [resultado]);

  const poner = (id: number) => {
    if (resultado) return;
    sonar('toque');
    setPuestas((p) => [...p, id]);
  };
  const quitar = (id: number) => {
    if (resultado) return;
    setPuestas((p) => p.filter((x) => x !== id));
  };

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      {e.tarjeta && <Tarjeta t={e.tarjeta} />}
      {e.dibujo && <Dibujo dibujo={e.dibujo} />}
      {e.pregunta && <Frase texto={e.pregunta} />}
      {e.escuchar && (
        <div className="escuchar">
          <BotonVoz texto={e.solucion} grande etiqueta="Escuchar otra vez" />
          <span className="escuchar__ayuda">Tócalo dos veces para oírlo más despacio</span>
        </div>
      )}
      <div className={`linea-respuesta${resultado ? (resultado.bien ? ' linea-respuesta--bien' : ' linea-respuesta--mal') : ''}`} aria-label="Tu frase" lang="en">
        {puestas.map((id) => (
          <button key={id} type="button" className="ficha ficha--puesta" disabled={!!resultado} onClick={() => quitar(id)}>
            {texto(id)}
          </button>
        ))}
      </div>
      {e.debajo && <Frase texto={e.debajo} />}
      <div className="banco" aria-label="Fichas" lang="en">
        {piezas.map((p) => {
          const usada = puestas.includes(p.id);
          return (
            <span key={p.id} className="banco__sitio">
              <button type="button" className={usada ? 'ficha ficha--hueco' : 'ficha'} disabled={usada || !!resultado} aria-hidden={usada} tabIndex={usada ? -1 : 0} onClick={() => poner(p.id)}>
                {p.texto}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
