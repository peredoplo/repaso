import { useState } from 'react';
import type { Perfil } from '../contenido/esquema';
import { PEGATINAS, PRECIO_SOBRE, comprarSobre, type Premio } from '../lib/premios';
import type { Progreso } from '../lib/progreso';
import { alPulsarEnlace } from '../lib/rutas';
import { Cabecera } from './Mapa';
import Recompensa, { TarjetaPegatina } from './Recompensa';

interface Props {
  perfil: Perfil;
  progreso: Progreso;
  /** Guarda el progreso nuevo (tras comprar un sobre). */
  onCambio: (p: Progreso) => void;
}

/** El álbum: las pegatinas conseguidas y, en gris, las que faltan. Con gemas se compran sobres. */
export default function Pegatinas({ perfil, progreso, onCambio }: Props) {
  const [abriendo, setAbriendo] = useState(false);
  const tengo = PEGATINAS.filter((p) => progreso.pegatinas[p.id]).length;
  const faltan = PRECIO_SOBRE - progreso.gemas;

  const abrir = (): Premio | null => {
    const r = comprarSobre(progreso);
    if (!r) return null;
    onCambio(r.progreso);
    return r.premio;
  };

  return (
    <div className="mapa">
      <Cabecera perfil={perfil} progreso={progreso} />
      <a className="volver" href="/" onClick={alPulsarEnlace}>
        ← Portada
      </a>
      <h1 className="portada__titulo">
        Mis pegatinas{' '}
        <span className="album__cuenta">
          {tengo}/{PEGATINAS.length}
        </span>
      </h1>

      <div className="album__tienda">
        <div>
          <strong>Sobre de pegatinas</strong>
          <p>Trae una pegatina al azar. Las épicas son muy difíciles de conseguir.</p>
        </div>
        <button type="button" className="boton boton--sol" disabled={faltan > 0} onClick={() => setAbriendo(true)}>
          Abrir · {PRECIO_SOBRE} 💎
        </button>
        {faltan > 0 && <p className="album__faltan">Te faltan {faltan} 💎. ¡Consigue más haciendo lecciones y abriendo cofres!</p>}
      </div>

      <ul className="album">
        {PEGATINAS.map((p) => {
          const n = progreso.pegatinas[p.id] ?? 0;
          return (
            <li key={p.id}>
              {n > 0 ? (
                <TarjetaPegatina pegatina={p} cuantas={n} />
              ) : (
                <div className={`pegatina pegatina--falta pegatina--${p.rareza}`} aria-label="Pegatina que te falta">
                  <span className="pegatina__emoji">?</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {abriendo && (
        <div className="aviso-fondo" role="dialog" aria-modal="true" aria-label="Sobre de pegatinas">
          <div className="aviso aviso--premio">
            <Recompensa tipo="sobre" onAbrir={abrir} />
            <button type="button" className="boton-texto" onClick={() => setAbriendo(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
