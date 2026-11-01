import type { LeccionC, TemaC } from '../contenido/cargar';
import type { Perfil } from '../contenido/esquema';
import { rachaActual, type Progreso } from '../lib/progreso';
import { alPulsarEnlace } from '../lib/rutas';
import { BotonSonido, Estrellas } from './piezas';

/** Arriba en la portada y en cada tema: quién practica, la racha y los puntos. */
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
        <span className="contador contador--xp" title="Puntos">
          ⭐ {progreso.xp}
        </span>
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

interface Props {
  perfil: Perfil;
  tema: TemaC;
  progreso: Progreso;
  fallosPendientes: number;
  onJugar: (leccion: LeccionC, tema: TemaC) => void;
  onRepasar: () => void;
  onCambiarPerfil?: () => void;
}

/** Desplazamiento en zigzag de cada lección en el camino. */
const ZIGZAG = [0, -60, -90, -60, 0, 60, 90, 60];

/** El camino de lecciones de un tema. */
export default function Mapa({ perfil, tema, progreso, fallosPendientes, onJugar, onRepasar, onCambiarPerfil }: Props) {
  const siguiente = tema.lecciones.find((l) => !progreso.lecciones[l.ruta]);
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
            return (
              <li key={l.id} className="camino__paso" style={{ transform: `translateX(${ZIGZAG[i % ZIGZAG.length]}px)` }}>
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
            );
          })}
        </ol>
      </section>
    </div>
  );
}
