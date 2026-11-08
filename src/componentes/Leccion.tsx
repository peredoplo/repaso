import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import type { EjercicioC } from '../contenido/cargar';
import { esTeoria, seCorrigeSolo, type EjercicioT } from '../contenido/esquema';
import type { Resultado } from '../lib/corregir';
import { alEmpezar, BIEN, claveInicio, claveRespuesta, textoInicio, textoRespuesta, todoLoQueSeOye } from '../lib/frases';
import { sonar } from '../lib/sonido';
import { callar, hablar, precargar } from '../lib/voz';
import Calcula from './ejercicios/Calcula';
import Chat from './ejercicios/Chat';
import Clasificar from './ejercicios/Clasificar';
import Completar from './ejercicios/Completar';
import Cuenta from './ejercicios/Cuenta';
import Elegir from './ejercicios/Elegir';
import Escribir from './ejercicios/Escribir';
import Ordenar from './ejercicios/Ordenar';
import Recuerda from './ejercicios/Recuerda';
import type { PropsEjercicio } from './ejercicios/tipos';
import Unir from './ejercicios/Unir';
import { BotonSonido, BotonVoz, Texto } from './piezas';

export type Modo = 'leccion' | 'examen' | 'repaso';

export interface Contestado {
  ejercicio: EjercicioC;
  resultado: Resultado;
}

export interface Resumen {
  /** Lo contestado la primera vez que salió cada ejercicio (sin la teoría: «Recuerda» y el chat). */
  primeros: Contestado[];
}

const COMPONENTES: { [T in EjercicioT['tipo']]: ComponentType<PropsEjercicio<Extract<EjercicioT, { tipo: T }>>> } = {
  elegir: Elegir,
  ordenar: Ordenar,
  escribir: Escribir,
  unir: Unir,
  completar: Completar,
  clasificar: Clasificar,
  cuenta: Cuenta,
  calcula: Calcula,
  recuerda: Recuerda,
  chat: Chat,
};

/** Las veces que vuelve a salir al final un ejercicio fallado (en las lecciones; en el examen, ninguna). Una sola, para que no se haga pesado. */
const REINTENTOS = 1;

interface Props {
  titulo: string;
  ejercicios: EjercicioC[];
  modo: Modo;
  onSalir: () => void;
  onTerminar: (r: Resumen) => void;
}

export default function Leccion({ titulo, ejercicios, modo, onSalir, onTerminar }: Props) {
  const [cola, setCola] = useState(() => ejercicios.map((ejercicio) => ({ ejercicio, vez: 0 })));
  const [pos, setPos] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [comprobar, setComprobar] = useState<(() => Resultado) | null>(null);
  const [masChat, setMasChat] = useState<(() => void) | null>(null);
  const [hechos, setHechos] = useState<Set<string>>(new Set());
  const [salir, setSalir] = useState(false);
  const primeros = useRef(new Map<string, Contestado>());
  const [frase, setFrase] = useState('');

  const actual = cola[pos];
  const e = actual.ejercicio;
  const total = ejercicios.length;
  const sinLeer = !!e.sinLeer;
  const inicio = alEmpezar(e);

  const registrar = useCallback((f: (() => Resultado) | null) => setComprobar(() => f), []);
  const registrarSeguir = useCallback((f: (() => void) | null) => setMasChat(() => f), []);
  const teoria = esTeoria(e);

  // Al empezar, se preparan las voces de toda la lección; al salir, se calla lo que suene.
  useEffect(() => {
    precargar(ejercicios.flatMap(todoLoQueSeOye));
    return callar;
  }, [ejercicios]);

  // Al llegar a cada ejercicio se empieza por arriba (tras un chat largo, la página seguía bajada), y se oyen la orden
  // y sus frases, sin tener que tocar nada.
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    const i = alEmpezar(e);
    if (i) hablar(textoInicio(i), { clave: claveInicio(i), auto: !i.siempre, retraso: 300, es: !!e.sinLeer || !!e.espanol });
  }, [pos, e]);

  const responder = useCallback(
    (r: Resultado) => {
      const animo = BIEN[Math.floor(Math.random() * BIEN.length)];
      setResultado(r);
      setFrase(animo);
      sonar(r.bien ? 'acierto' : 'fallo');
      // La frase, justo detrás del sonido; si se pasa de ejercicio antes, ya no suena. Sin leer, lo que pone abajo.
      const retraso = r.bien ? 250 : 450;
      if (e.sinLeer) {
        const t = textoRespuesta(r.bien, animo, r.feedback);
        hablar(t, { clave: claveRespuesta(t), auto: true, retraso, es: true });
      } else if (r.voz && !e.espanol) hablar(r.voz, { auto: true, retraso });
      if (!primeros.current.has(e.id)) primeros.current.set(e.id, { ejercicio: e, resultado: r });
      const otraVez = !r.bien && modo !== 'examen' && actual.vez < REINTENTOS;
      if (otraVez) setCola((c) => [...c, { ejercicio: e, vez: actual.vez + 1 }]);
      else setHechos((h) => new Set(h).add(e.id));
    },
    [e, actual.vez, modo],
  );

  const seguir = useCallback(() => {
    callar();
    if (teoria) setHechos((h) => new Set(h).add(e.id));
    if (pos + 1 >= cola.length) {
      onTerminar({ primeros: [...primeros.current.values()] });
      return;
    }
    setPos(pos + 1);
    setResultado(null);
    setComprobar(null);
    setMasChat(null);
  }, [e, teoria, pos, cola.length, onTerminar]);

  // Enter hace siempre lo del botón grande de abajo: comprobar o continuar.
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' || salir) return;
      ev.preventDefault();
      if (masChat) masChat();
      else if (resultado || teoria) seguir();
      else if (comprobar) responder(comprobar());
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [resultado, comprobar, masChat, teoria, salir, seguir, responder]);

  const Componente = COMPONENTES[e.tipo] as ComponentType<PropsEjercicio<EjercicioT>>;
  const avance = Math.round((hechos.size / total) * 100);

  return (
    <div className="leccion">
      <header className="leccion__arriba">
        <button type="button" className="cerrar" aria-label="Salir de la lección" onClick={() => setSalir(true)}>
          ✕
        </button>
        <div className="barra-avance" role="progressbar" aria-label={titulo} aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100}>
          <div className="barra-avance__relleno" style={{ width: `${Math.max(avance, 3)}%` }} />
        </div>
        {modo === 'examen' && (
          <span className="leccion__contador">
            {Math.min(pos + 1, total)}/{total}
          </span>
        )}
        <BotonSonido />
      </header>

      <main className="leccion__centro">
        {actual.vez > 0 && <p className="otra-vez">🔁 Vamos a intentarlo otra vez</p>}
        {sinLeer && inicio && (
          <div className="escuchar">
            <BotonVoz texto={textoInicio(inicio)} clave={claveInicio(inicio)} es grande etiqueta="Escuchar otra vez" />
          </div>
        )}
        <Componente
          key={`${pos}-${e.id}`}
          ejercicio={e}
          resultado={resultado}
          registrar={registrar}
          onResultado={responder}
          registrarSeguir={registrarSeguir}
          sinLeer={sinLeer}
          espanol={!!e.espanol}
        />
      </main>

      <footer className={`pie${resultado ? (resultado.bien ? ' pie--bien' : ' pie--mal') : ''}`}>
        <div className="pie__dentro">
          {resultado ? (
            <div className="pie__mensaje" role="status">
              <p className="pie__titulo">{resultado.bien ? `✔ ${frase}` : '✘ ¡Casi!'}</p>
              {!resultado.bien && resultado.solucion && (
                <p className="pie__solucion">
                  Lo correcto es: <strong lang={e.espanol ? 'es' : 'en'}>{resultado.solucion}</strong>
                </p>
              )}
              {resultado.feedback && (
                <p className="pie__feedback">
                  <Texto>{resultado.feedback}</Texto>
                </p>
              )}
            </div>
          ) : (
            <div className="pie__mensaje" />
          )}
          {masChat ? (
            <button type="button" className="boton boton--cielo" onClick={masChat}>
              Seguir
            </button>
          ) : resultado || teoria ? (
            <button type="button" className={`boton ${resultado && !resultado.bien ? 'boton--coral' : 'boton--verde'}`} onClick={seguir}>
              {teoria ? '¡Entendido!' : 'Continuar'}
            </button>
          ) : seCorrigeSolo(e) ? (
            <span />
          ) : (
            <button type="button" className="boton boton--verde" disabled={!comprobar} onClick={() => comprobar && responder(comprobar())}>
              Comprobar
            </button>
          )}
        </div>
      </footer>

      {salir && (
        <div className="aviso-fondo" role="dialog" aria-modal="true" aria-labelledby="aviso-titulo">
          <div className="aviso">
            <p className="aviso__emoji">🥺</p>
            <h2 id="aviso-titulo">¿Seguro que quieres salir?</h2>
            <p>Si sales ahora, perderás lo que llevas de esta lección.</p>
            <button type="button" className="boton boton--verde" autoFocus onClick={() => setSalir(false)}>
              Seguir practicando
            </button>
            <button type="button" className="boton-texto" onClick={onSalir}>
              Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
