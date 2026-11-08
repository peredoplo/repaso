import { useEffect, useRef, useState } from 'react';
import type { EscribirT } from '../../contenido/esquema';
import { corregirEscribir } from '../../lib/corregir';
import { Dibujo, Frase, Tarjeta, Texto } from '../piezas';
import { Visuales } from '../visuales';
import type { PropsEjercicio } from './tipos';

export default function Escribir({ ejercicio: e, resultado, registrar, espanol }: PropsEjercicio<EscribirT>) {
  const numero = e.respuestas.every((r) => /^[\d.]+$/.test(r));
  const [escrito, setEscrito] = useState('');
  const caja = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registrar(escrito.trim() === '' ? null : () => corregirEscribir(e, escrito));
  }, [escrito, e, registrar]);

  useEffect(() => {
    caja.current?.focus();
  }, []);

  const [antes, despues] = e.plantilla ? e.plantilla.split('___') : ['', ''];
  const estado = resultado ? (resultado.bien ? ' escribir__caja--bien' : ' escribir__caja--mal') : '';
  const input = (
    <input
      ref={caja}
      className={`escribir__caja${e.plantilla && antes + despues ? '' : ' escribir__caja--entera'}${estado}`}
      value={escrito}
      onChange={(ev) => setEscrito(ev.target.value)}
      disabled={!!resultado}
      aria-label="Tu respuesta"
      lang={espanol ? 'es' : 'en'}
      inputMode={numero ? 'numeric' : undefined}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      size={Math.max(8, escrito.length + 2)}
    />
  );

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      {e.tarjeta && <Tarjeta t={e.tarjeta} />}
      {e.dibujo && <Dibujo dibujo={e.dibujo} />}
      <Visuales v={e} />
      <div className="escribir">
        {e.pregunta && (espanol ? <p className="pregunta"><Texto>{e.pregunta}</Texto></p> : <Frase texto={e.pregunta} />)}
        <p className="escribir__linea" lang={espanol ? 'es' : 'en'}>
          {e.plantilla ? (
            <>
              {antes}
              {input}
              {despues}
            </>
          ) : (
            input
          )}
        </p>
        {e.debajo && (espanol ? <p className="pregunta"><Texto>{e.debajo}</Texto></p> : <Frase texto={e.debajo} />)}
      </div>
    </div>
  );
}
