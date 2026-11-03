import { Fragment, useState, type ReactNode } from 'react';
import type { LeccionC, TemaC } from '../contenido/cargar';
import type { Perfil } from '../contenido/esquema';
import { cofresDe, estadoCofre, type Premio } from '../lib/premios';
import { rachaActual, type Progreso } from '../lib/progreso';
import { alPulsarEnlace } from '../lib/rutas';
import { BotonSonido, Estrellas } from './piezas';
import Recompensa from './Recompensa';

/** Arriba en todas las páginas: quién practica, la racha y las gemas (que llevan al álbum). */
export function Cabecera({ perfil, progreso, onCambiarPerfil }: { perfil: Perfil; progreso: Progreso; onCambiarPerfil?: () => void }) {
  const racha = rachaActual(progreso);
  return (
    <header className="mapa__arriba">
      <button type="button" className="perfil" onClick={onCambiarPerfil} disabled={!onCambiarPerfil}>
        <span className="perfil__avatar" aria-hidden="true">
          {perfil.avatar}
        </span>
        <span>
          <span className="perfil__hola">¡Hola, {perfil.nombre}!</span>
          <span className="perfil__curso">{perfil.curso}</span>
        </span>
      </button>
      <div className="contadores">
        <span className={racha ? 'contador contador--racha' : 'contador'} title="Días seguidos practicando">
          🔥 {racha}
        </span>
        <a className="contador contador--gemas" href="/pegatinas/" onClick={alPulsarEnlace} title="Gemas: úsalas en el álbum de pegatinas">
          💎 {progreso.gemas}
        </a>
        <BotonSonido />
      </div>
    </header>
  );
}

export function BotonRepasar({ n, onRepasar }: { n: number; onRepasar: () => void }) {
  if (n === 0) return null;
  return (
    <button type="button" className="repasar" onClick={onRepasar}>
      <span className="repasar__emoji" aria-hidden="true">
        🎯
      </span>
      <span>
        <strong>Repasa tus fallos</strong>
        <span className="repasar__sub">{n === 1 ? 'Tienes 1 ejercicio' : `Tienes ${n} ejercicios`} para volver a intentar</span>
      </span>
    </button>
  );
}

/** Ventana para abrir un cofre (desde el camino). */
export function VentanaPremio({ children, onCerrar }: { children: ReactNode; onCerrar: () => void }) {
  return (
    <div className="aviso-fondo" role="dialog" aria-modal="true" aria-label="Premio">
      <div className="aviso aviso--premio">
        {children}
        <button type="button" className="boton-texto" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

interface Props {
  perfil: Perfil;
  tema: TemaC;
  progreso: Progreso;
  fallosPendientes: number;
  onJugar: (leccion: LeccionC, tema: TemaC) => void;
  onRepasar: () => void;
  onAbrirCofre: (id: string) => Premio;
  onCambiarPerfil?: () => void;
}

/** Desplazamiento en zigzag de cada paso del camino (lecciones y cofres). */
const ZIGZAG = [0, -60, -90, -60, 0, 60, 90, 60];

/** El camino de lecciones de un tema, con un cofre cada dos lecciones. */
export default function Mapa({ perfil, tema, progreso, fallosPendientes, onJugar, onRepasar, onAbrirCofre, onCambiarPerfil }: Props) {
  const [cofreAbierto, setCofreAbierto] = useState<string | null>(null);
  const siguiente = tema.lecciones.find((l) => !progreso.lecciones[l.ruta]);
  const cofres = cofresDe(tema);
  let paso = 0;
  const desplazar = () => ({ transform: `translateX(${ZIGZAG[paso++ % ZIGZAG.length]}px)` });

  return (
    <div className="mapa">
      <Cabecera perfil={perfil} progreso={progreso} onCambiarPerfil={onCambiarPerfil} />
      <a className="volver" href="/" onClick={alPulsarEnlace}>
        ← Portada
      </a>
      <BotonRepasar n={fallosPendientes} onRepasar={onRepasar} />

      <section className="tema">
        <div className="tema__cabecera">
          <p className="tema__asignatura">{tema.asignatura}</p>
          <h1 className="tema__titulo">{tema.titulo}</h1>
          {tema.descripcion && <p className="tema__descripcion">{tema.descripcion}</p>}
        </div>
        <ol className="camino">
          {tema.lecciones.map((l, i) => {
            const hecha = progreso.lecciones[l.ruta];
            const esSiguiente = l === siguiente;
            const clase = ['nodo', hecha ? 'nodo--hecho' : '', esSiguiente ? 'nodo--siguiente' : '', l.examen ? 'nodo--examen' : ''].join(' ');
            const cofre = cofres.find((c) => c.despuesDe === i);
            const estado = cofre && estadoCofre(tema, cofre, progreso);
            return (
              <Fragment key={l.id}>
                <li className="camino__paso" style={desplazar()}>
                  {esSiguiente && <span className="bocadillo">{i === 0 ? '¡Empieza aquí!' : '¡Sigue por aquí!'}</span>}
                  <button type="button" className={clase} onClick={() => onJugar(l, tema)} aria-label={l.titulo}>
                    <span aria-hidden="true">{l.emoji}</span>
                  </button>
                  <span className="nodo__titulo">{l.titulo}</span>
                  {l.subtitulo && <span className="nodo__subtitulo">{l.subtitulo}</span>}
                  {hecha &&
                    (l.examen && hecha.nota !== undefined ? (
                      <span className="nodo__nota">Mejor nota: {hecha.nota.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</span>
                    ) : (
                      <Estrellas n={hecha.estrellas} />
                    ))}
                </li>
                {cofre && (
                  <li className="camino__paso" style={desplazar()}>
                    {estado === 'listo' && <span className="bocadillo bocadillo--sol">¡Ábreme!</span>}
                    <button
                      type="button"
                      className={`nodo-cofre nodo-cofre--${estado}`}
                      disabled={estado !== 'listo'}
                      aria-label={estado === 'abierto' ? 'Cofre ya abierto' : estado === 'listo' ? 'Abrir el cofre' : 'Cofre cerrado: termina las lecciones de antes'}
                      title={estado === 'cerrado' ? 'Termina las lecciones de antes para abrirlo' : undefined}
                      onClick={() => setCofreAbierto(cofre.id)}
                    >
                      <span aria-hidden="true">{estado === 'abierto' ? '✨' : '🎁'}</span>
                      {estado === 'cerrado' && (
                        <span className="nodo-cofre__candado" aria-hidden="true">
                          🔒
                        </span>
                      )}
                    </button>
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </section>

      {cofreAbierto && (
        <VentanaPremio onCerrar={() => setCofreAbierto(null)}>
          <Recompensa tipo="cofre" onAbrir={() => onAbrirCofre(cofreAbierto)} />
        </VentanaPremio>
      )}
    </div>
  );
}
