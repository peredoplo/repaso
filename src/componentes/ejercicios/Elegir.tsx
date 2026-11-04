import { useEffect, useMemo, useState } from 'react';
import type { ElegirT } from '../../contenido/esquema';
import { barajar } from '../../lib/barajar';
import { corregirElegir } from '../../lib/corregir';
import { claveOpcion, partirOpcion } from '../../lib/frases';
import { normalizar, tieneLetras } from '../../lib/normalizar';
import { hablar } from '../../lib/voz';
import { BotonVoz, ConHueco, Dibujo, Tarjeta, Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

/** Sin leer (Miguel), cada opción es un dibujo grande con su nombre debajo, y al tocarla se oye el nombre. */
export default function Elegir({ ejercicio: e, resultado, registrar, sinLeer }: PropsEjercicio<ElegirT>) {
  const opciones = useMemo(() => barajar([e.correcta, ...e.incorrectas.map((o) => (typeof o === 'string' ? o : o.texto))]), [e]);
  const [elegida, setElegida] = useState<string | null>(null);
  const conHueco = !!e.pregunta?.includes('___');
  const soloDibujos = opciones.every((o) => !tieneLetras(o));

  useEffect(() => {
    registrar(elegida === null ? null : () => corregirElegir(e, elegida));
  }, [elegida, e, registrar]);

  const elegir = (o: string) => {
    if (resultado) return;
    setElegida(o);
    const { nombre } = partirOpcion(o);
    if (sinLeer && nombre) hablar(nombre, { clave: claveOpcion(o), es: true });
  };

  // En el ordenador, las teclas 1, 2, 3 y 4 eligen.
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement) return;
      const n = Number(ev.key);
      if (n >= 1 && n <= opciones.length) elegir(opciones[n - 1]);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const estadoDe = (o: string) => {
    if (!resultado) return o === elegida ? ' opcion--elegida' : '';
    if (normalizar(o) === normalizar(e.correcta)) return ' opcion--bien';
    return o === elegida ? ' opcion--mal' : ' opcion--apagada';
  };

  return (
    <div className="ejercicio">
      <h2 className="enunciado">
        <Texto>{e.enunciado}</Texto>
      </h2>
      {e.tarjeta && <Tarjeta t={e.tarjeta} />}
      {e.dibujo && <Dibujo dibujo={e.dibujo} hora={e.hora} />}
      {e.escuchar && (
        <div className="escuchar">
          <BotonVoz texto={e.escuchar} grande etiqueta="Escuchar otra vez" />
          <span className="escuchar__ayuda">Tócalo dos veces para oírlo más despacio</span>
        </div>
      )}
      {e.pregunta && (
        <p className="pregunta">
          {conHueco ? (
            <ConHueco
              texto={e.pregunta}
              relleno={resultado ? (resultado.bien ? (elegida ?? '') : e.correcta) : (elegida ?? '')}
              estado={resultado ? 'bien' : undefined}
            />
          ) : sinLeer ? (
            <Texto>{e.pregunta}</Texto>
          ) : (
            <>
              <BotonVoz texto={e.pregunta} />
              <span lang="en">{e.pregunta}</span>
            </>
          )}
        </p>
      )}
      <div className={sinLeer ? 'opciones opciones--oir' : soloDibujos ? 'opciones opciones--dibujos' : 'opciones'} role="group" aria-label="Opciones">
        {opciones.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`opcion${estadoDe(o)}`}
            aria-pressed={o === elegida}
            disabled={!!resultado}
            onClick={() => elegir(o)}
          >
            <span className="opcion__tecla" aria-hidden="true">
              {i + 1}
            </span>
            {sinLeer ? (
              <OpcionDibujo o={o} />
            ) : (
              <span className="opcion__texto" lang="en">
                {o}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function OpcionDibujo({ o }: { o: string }) {
  const { dibujo, nombre } = partirOpcion(o);
  return dibujo ? (
    <>
      <span className="opcion__dibujo" aria-hidden="true">
        {dibujo}
      </span>
      <span className="opcion__texto">{nombre}</span>
    </>
  ) : (
    <span className="opcion__dibujo">{nombre}</span>
  );
}
