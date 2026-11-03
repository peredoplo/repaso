import { useEffect, useState } from 'react';
import type { Premio } from '../lib/premios';
import { sonar } from '../lib/sonido';
import type { Contestado, Modo } from './Leccion';
import { Confeti, Estrellas } from './piezas';
import Recompensa from './Recompensa';

export interface DatosFinal {
  titulo: string;
  modo: Modo;
  aciertos: number;
  total: number;
  estrellas: number;
  nota?: number;
  gemas: number;
  racha: number;
  falladas: Contestado[];
  /** Si esta lección ha dejado un cofre listo para abrir. */
  cofre?: string;
}

const nota1 = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

function mensajeNota(n: number): string {
  if (n >= 9) return '¡Sobresaliente! Llevas el examen muy bien preparado.';
  if (n >= 7) return '¡Notable! Repasa los fallos y saldrá aún mejor.';
  if (n >= 5) return '¡Aprobado! Repasa los fallos y vuelve a intentarlo.';
  return 'Todavía hay que practicar un poco. ¡Repasa las lecciones y vuelve a probar!';
}

interface Props {
  datos: DatosFinal;
  onSeguir: () => void;
  onAbrirCofre: (id: string) => Premio;
}

export default function Final({ datos, onSeguir, onAbrirCofre }: Props) {
  // Mientras haya un cofre sin abrir, Enter lo abre (es el botón que tiene el foco), no pasa de pantalla.
  const [cofrePendiente, setCofrePendiente] = useState(!!datos.cofre);

  useEffect(() => {
    sonar('final');
  }, []);

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' && !cofrePendiente) {
        ev.preventDefault();
        onSeguir();
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onSeguir, cofrePendiente]);

  const examen = datos.modo === 'examen' && datos.nota !== undefined;

  return (
    <div className="final">
      <Confeti />
      <p className="final__emoji" aria-hidden="true">
        {examen ? (datos.nota! >= 5 ? '🏆' : '💪') : datos.estrellas === 3 ? '🏆' : '🎉'}
      </p>
      <h1 className="final__titulo">{examen ? 'Examen terminado' : datos.modo === 'repaso' ? '¡Repaso hecho!' : '¡Lección terminada!'}</h1>
      <p className="final__sub">{datos.titulo}</p>

      {examen ? (
        <div className="final__nota">
          <span className="final__nota-numero">{nota1(datos.nota!)}</span>
          <span className="final__nota-de">de 10</span>
          <p>{mensajeNota(datos.nota!)}</p>
        </div>
      ) : (
        <Estrellas n={datos.estrellas} />
      )}

      <div className="final__datos">
        <div className="dato dato--verde">
          <span className="dato__etiqueta">Aciertos</span>
          <span className="dato__valor">
            {datos.aciertos}/{datos.total}
          </span>
        </div>
        <div className="dato dato--cielo">
          <span className="dato__etiqueta">Gemas</span>
          <span className="dato__valor">+{datos.gemas} 💎</span>
        </div>
        <div className="dato dato--coral">
          <span className="dato__etiqueta">Racha</span>
          <span className="dato__valor">
            {datos.racha} {datos.racha === 1 ? 'día' : 'días'} 🔥
          </span>
        </div>
      </div>

      {datos.cofre && (
        <section className="final__cofre">
          <h2>¡Has desbloqueado un cofre!</h2>
          <Recompensa
            tipo="cofre"
            onAbrir={() => {
              setCofrePendiente(false);
              return onAbrirCofre(datos.cofre!);
            }}
          />
        </section>
      )}

      {datos.falladas.length > 0 && (
        <section className="final__fallos">
          <h2>Para repasar</h2>
          <ul>
            {datos.falladas.map(({ ejercicio, resultado }) => (
              <li key={ejercicio.id}>
                {resultado.tuya && (
                  <p className="final__tuya">
                    ✘ <span lang="en">{resultado.tuya}</span>
                  </p>
                )}
                {resultado.solucion && (
                  <p className="final__buena">
                    ✔ <span lang="en">{resultado.solucion}</span>
                  </p>
                )}
                {!resultado.tuya && <p className="final__buena">Unir parejas</p>}
              </li>
            ))}
          </ul>
          <p className="final__nota-pie">Te los guardo en «Repasa tus fallos».</p>
        </section>
      )}

      {!cofrePendiente && (
        <button type="button" className="boton boton--verde final__boton" onClick={onSeguir} autoFocus>
          Continuar
        </button>
      )}
    </div>
  );
}
