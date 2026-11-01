import type { TemaC } from '../contenido/cargar';
import type { Perfil } from '../contenido/esquema';
import type { Progreso } from '../lib/progreso';
import { alPulsarEnlace, rutaTema } from '../lib/rutas';
import { BotonRepasar, Cabecera } from './Mapa';

interface Props {
  perfil: Perfil;
  temas: TemaC[];
  progreso: Progreso;
  fallosPendientes: number;
  onRepasar: () => void;
  onCambiarPerfil?: () => void;
}

// Sin banderas: en Windows salen como letras («GB»).
const EMOJI_ASIGNATURA: Record<string, string> = { Inglés: '🔤',Matemáticas: '🔢', Lengua: '📖', 'Ciencias Naturales': '🌱', 'Ciencias Sociales': '🌍' };

/** La portada: los temas que tiene cada uno, por asignatura, con un enlace a cada uno. */
export default function Portada({ perfil, temas, progreso, fallosPendientes, onRepasar, onCambiarPerfil }: Props) {
  const asignaturas = [...new Set(temas.map((t) => t.asignatura))];
  return (
    <div className="mapa">
      <Cabecera perfil={perfil} progreso={progreso} onCambiarPerfil={onCambiarPerfil} />
      <h1 className="portada__titulo">¿Qué repasamos hoy?</h1>
      <BotonRepasar n={fallosPendientes} onRepasar={onRepasar} />

      {asignaturas.map((asignatura) => (
        <section key={asignatura} className="asignatura">
          <h2 className="asignatura__titulo">
            <span aria-hidden="true">{EMOJI_ASIGNATURA[asignatura] ?? '📚'}</span> {asignatura}
          </h2>
          <ul className="temas">
            {temas
              .filter((t) => t.asignatura === asignatura)
              .map((t) => {
                const hechas = t.lecciones.filter((l) => progreso.lecciones[l.ruta]).length;
                const estrellas = t.lecciones.reduce((s, l) => s + (progreso.lecciones[l.ruta]?.estrellas ?? 0), 0);
                const empezado = hechas > 0;
                return (
                  <li key={t.id}>
                    <a className="tarjeta-tema" href={rutaTema(t.id)} onClick={alPulsarEnlace}>
                      <span className="tarjeta-tema__textos">
                        <span className="tarjeta-tema__titulo">{t.titulo}</span>
                        {t.descripcion && <span className="tarjeta-tema__descripcion">{t.descripcion}</span>}
                        <span className="tarjeta-tema__avance">
                          <span className="tarjeta-tema__barra" aria-hidden="true">
                            <span style={{ width: `${(hechas / t.lecciones.length) * 100}%` }} />
                          </span>
                          {hechas}/{t.lecciones.length} lecciones · {estrellas} ★
                        </span>
                      </span>
                      <span className="tarjeta-tema__boton">{empezado ? 'Seguir' : 'Empezar'}</span>
                    </a>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
