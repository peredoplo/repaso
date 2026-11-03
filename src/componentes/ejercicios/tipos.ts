import type { Resultado } from '../../lib/corregir';

export interface PropsEjercicio<E> {
  ejercicio: E;
  /** El resultado, cuando ya se ha comprobado (entonces no se puede cambiar nada). */
  resultado: Resultado | null;
  /** El ejercicio dice si ya se puede comprobar, y cómo: la barra de abajo tiene el botón «Comprobar». */
  registrar: (comprobar: (() => Resultado) | null) => void;
  /** Para los que se corrigen solos (unir). */
  onResultado: (r: Resultado) => void;
  /** El chat dice si aún le quedan mensajes: entonces el botón de abajo es «Seguir» y hace esto. */
  registrarSeguir: (seguir: (() => void) | null) => void;
}
