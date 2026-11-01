import { useCallback, useState } from 'react';
import type { EjercicioC, LeccionC, TemaC } from './contenido/cargar';
import type { Perfil } from './contenido/esquema';
import { contenido } from './contenido';
import Final, { type DatosFinal } from './componentes/Final';
import Leccion, { type Modo, type Resumen } from './componentes/Leccion';
import Mapa from './componentes/Mapa';
import Portada from './componentes/Portada';
import { barajar } from './lib/barajar';
import { useRuta } from './lib/rutas';
import { apuntarPartida, estrellasDe, guardarProgreso, leerProgreso, rachaActual } from './lib/progreso';

const CLAVE_PERFIL = 'repaso.perfil';
/** Ejercicios como mucho en un «Repasa tus fallos». */
const MAX_REPASO = 12;

type Pantalla =
  | { tipo: 'mapa' }
  | { tipo: 'jugar'; titulo: string; ruta: string; modo: Modo; ejercicios: EjercicioC[] }
  | { tipo: 'final'; datos: DatosFinal };

const puntuable = (e: EjercicioC) => e.tipo !== 'recuerda';

function perfilGuardado(): Perfil | null {
  const { perfiles } = contenido;
  if (perfiles.length === 1) return perfiles[0];
  try {
    const id = localStorage.getItem(CLAVE_PERFIL);
    return perfiles.find((p) => p.id === id) ?? null;
  } catch {
    return null;
  }
}

/** El examen: preguntas al azar de las lecciones que dice, más las suyas propias. Sin tarjetas ni parejas. */
function prepararExamen(leccion: LeccionC, tema: TemaC): EjercicioC[] {
  const { de, preguntas } = leccion.examen!;
  const fuente = tema.lecciones.filter((l) => de.includes(l.id)).flatMap((l) => l.ejercicios);
  const propias = leccion.ejercicios.filter(puntuable);
  const resto = barajar(fuente.filter((e) => puntuable(e) && e.tipo !== 'unir'));
  return barajar([...propias, ...resto].slice(0, Math.max(preguntas, propias.length)));
}

export default function App() {
  const ruta = useRuta();
  const [perfil, setPerfil] = useState<Perfil | null>(perfilGuardado);
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'mapa' });
  const [progreso, setProgreso] = useState(() => (perfil ? leerProgreso(perfil.id) : null));

  const volver = useCallback(() => setPantalla({ tipo: 'mapa' }), []);

  const terminar = useCallback(
    (resumen: Resumen) => {
      if (pantalla.tipo !== 'jugar' || !perfil || !progreso) return;
      const contados = resumen.primeros.filter((c) => puntuable(c.ejercicio));
      const aciertos = contados.filter((c) => c.resultado.bien).length;
      const total = contados.length;
      const estrellas = estrellasDe(aciertos, total);
      const nota = pantalla.modo === 'examen' && total ? Math.round((aciertos / total) * 100) / 10 : undefined;
      const xp = 10 + aciertos + (estrellas === 3 ? 5 : 0);
      const nuevo = apuntarPartida(progreso, {
        ruta: pantalla.modo === 'repaso' ? '' : pantalla.ruta,
        estrellas,
        nota,
        xp,
        falladas: contados.filter((c) => !c.resultado.bien).map((c) => c.ejercicio.id),
        acertadas: contados.filter((c) => c.resultado.bien).map((c) => c.ejercicio.id),
      });
      guardarProgreso(perfil.id, nuevo);
      setProgreso(nuevo);
      setPantalla({
        tipo: 'final',
        datos: {
          titulo: pantalla.titulo,
          modo: pantalla.modo,
          aciertos,
          total,
          estrellas,
          nota,
          xp,
          racha: rachaActual(nuevo),
          falladas: contados.filter((c) => !c.resultado.bien),
        },
      });
      window.scrollTo(0, 0);
    },
    [pantalla, perfil, progreso],
  );

  if (contenido.errores.length) {
    return (
      <div className="errores">
        <h1>Hay errores en el contenido</h1>
        <ul>
          {contenido.errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!perfil || !progreso) {
    return (
      <div className="elegir-perfil">
        <h1>¿Quién va a practicar?</h1>
        <div className="elegir-perfil__lista">
          {contenido.perfiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className="elegir-perfil__boton"
              onClick={() => {
                try {
                  localStorage.setItem(CLAVE_PERFIL, p.id);
                } catch {
                  /* no se recuerda, pero se puede jugar */
                }
                setPerfil(p);
                setProgreso(leerProgreso(p.id));
              }}
            >
              <span className="perfil__avatar">{p.avatar}</span>
              {p.nombre}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (pantalla.tipo === 'jugar') {
    return <Leccion key={pantalla.ruta + pantalla.modo} titulo={pantalla.titulo} ejercicios={pantalla.ejercicios} modo={pantalla.modo} onSalir={volver} onTerminar={terminar} />;
  }

  if (pantalla.tipo === 'final') return <Final datos={pantalla.datos} onSeguir={volver} />;

  const temas = perfil.temas.map((t) => contenido.temas.get(t)!).filter(Boolean);
  // En la página de un tema, solo sus fallos; en la portada, todos.
  const tema = temas.find((t) => t.id === ruta);
  const fallos = progreso.fallos.filter((id) => contenido.ejercicios.has(id) && (!tema || id.startsWith(`${tema.id}/`)));
  const comunes = {
    perfil,
    progreso,
    fallosPendientes: fallos.length,
    onRepasar: () =>
      setPantalla({
        tipo: 'jugar',
        titulo: 'Repasa tus fallos',
        ruta: 'repaso',
        modo: 'repaso',
        ejercicios: barajar(fallos.map((id) => contenido.ejercicios.get(id)!)).slice(0, MAX_REPASO),
      }),
    onCambiarPerfil:
      contenido.perfiles.length > 1
        ? () => {
            setPerfil(null);
            setProgreso(null);
          }
        : undefined,
  };

  if (!tema) return <Portada {...comunes} temas={temas} />;

  return (
    <Mapa
      {...comunes}
      tema={tema}
      onJugar={(leccion, t) =>
        setPantalla({
          tipo: 'jugar',
          titulo: leccion.titulo,
          ruta: leccion.ruta,
          modo: leccion.examen ? 'examen' : 'leccion',
          ejercicios: leccion.examen ? prepararExamen(leccion, t) : leccion.ejercicios,
        })
      }
    />
  );
}
