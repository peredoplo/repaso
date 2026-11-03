import { useEffect, useRef, useState } from 'react';
import { NOMBRE_RAREZA, type Pegatina, type Premio } from '../lib/premios';
import { sonar } from '../lib/sonido';
import { Confeti } from './piezas';

/** Un cofre dibujado: la tapa se levanta al abrirlo. */
function DibujoCofre({ abierto }: { abierto: boolean }) {
  return (
    <svg className={`cofre${abierto ? ' cofre--abierto' : ''}`} viewBox="0 0 120 100" aria-hidden="true">
      <g className="cofre__brillo">
        <circle cx="60" cy="48" r="40" />
      </g>
      <rect x="10" y="45" width="100" height="47" rx="7" className="cofre__madera" />
      <rect x="10" y="58" width="100" height="7" className="cofre__oro" />
      <rect x="24" y="45" width="7" height="47" className="cofre__oro" />
      <rect x="89" y="45" width="7" height="47" className="cofre__oro" />
      <g className="cofre__tapa">
        <path d="M10 48 V30 Q10 12 30 12 H90 Q110 12 110 30 V48 Z" className="cofre__madera cofre__madera--clara" />
        <rect x="24" y="12" width="7" height="36" className="cofre__oro" />
        <rect x="89" y="12" width="7" height="36" className="cofre__oro" />
      </g>
      <rect x="51" y="44" width="18" height="20" rx="4" className="cofre__oro cofre__cerradura" />
      <circle cx="60" cy="52" r="3" className="cofre__agujero" />
      <rect x="58.5" y="53" width="3" height="6" className="cofre__agujero" />
    </svg>
  );
}

function DibujoSobre() {
  return (
    <div className="sobre" aria-hidden="true">
      <span className="sobre__brillo">✨</span>
      <span className="sobre__texto">STICKERS</span>
      <span className="sobre__signo">?</span>
    </div>
  );
}

export function TarjetaPegatina({ pegatina, cuantas, nueva }: { pegatina: Pegatina; cuantas?: number; nueva?: boolean }) {
  return (
    <div className={`pegatina pegatina--${pegatina.rareza}${nueva ? ' pegatina--nueva' : ''}`}>
      <span className="pegatina__emoji" aria-hidden="true">
        {pegatina.emoji}
      </span>
      <span className="pegatina__nombre" lang="en">
        {pegatina.nombre}
      </span>
      <span className="pegatina__rareza">{NOMBRE_RAREZA[pegatina.rareza]}</span>
      {cuantas !== undefined && cuantas > 1 && <span className="pegatina__cuantas">×{cuantas}</span>}
    </div>
  );
}

type Fase = 'cerrado' | 'abriendo' | 'abierto';

interface Props {
  tipo: 'cofre' | 'sobre';
  /** Abre de verdad (guarda el premio) y lo devuelve. */
  onAbrir: () => Premio | null;
}

/** Abrir un cofre o un sobre: tiembla, se abre y sale el premio. */
export default function Recompensa({ tipo, onAbrir }: Props) {
  const [fase, setFase] = useState<Fase>('cerrado');
  const [premio, setPremio] = useState<Premio | null>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    boton.current?.focus();
  }, []);

  const abrir = () => {
    if (fase !== 'cerrado') return;
    const p = onAbrir();
    if (!p) return;
    setPremio(p);
    setFase('abriendo');
    setTimeout(() => {
      setFase('abierto');
      sonar('final');
    }, 900);
  };

  return (
    <div className={`recompensa recompensa--${fase}`}>
      {fase === 'abierto' && <Confeti />}
      <div className="recompensa__escena">
        {tipo === 'cofre' ? <DibujoCofre abierto={fase === 'abierto'} /> : fase !== 'abierto' && <DibujoSobre />}
        {fase === 'abierto' && premio && (
          <div className="recompensa__premio" role="status">
            <TarjetaPegatina pegatina={premio.pegatina} nueva={!premio.repetida} />
            {premio.gemas > 0 && <p className="recompensa__gemas">+{premio.gemas} 💎</p>}
            <p className="recompensa__texto">
              {premio.repetida ? '¡Esta ya la tenías! Te doy gemas de más.' : '¡Pegatina nueva para tu álbum!'}
            </p>
          </div>
        )}
      </div>
      {fase === 'cerrado' && (
        <button ref={boton} type="button" className="boton boton--sol" onClick={abrir}>
          {tipo === 'cofre' ? '¡Abrir el cofre!' : '¡Abrir el sobre!'}
        </button>
      )}
    </div>
  );
}
