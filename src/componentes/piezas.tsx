import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { TarjetaT } from '../contenido/esquema';
import { seLee } from '../lib/normalizar';
import { cambiarSonido, prepararSonido, sonidoActivado } from '../lib/sonido';
import { hablar } from '../lib/voz';

/** Texto con **negrita** y *cursiva* (para las palabras en inglés dentro de una explicación). */
export function Texto({ children }: { children: string }) {
  const trozos = children.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {trozos.map((t, i) =>
        t.startsWith('**') ? (
          <strong key={i}>{t.slice(2, -2)}</strong>
        ) : t.startsWith('*') && t.length > 2 ? (
          <em key={i}>{t.slice(1, -1)}</em>
        ) : (
          <Fragment key={i}>{t}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Altavoz: la primera vez dice la frase; si se vuelve a tocar enseguida, más despacio (solo el inglés: el español
 * despacio sonaba demasiado lento). Con `quien`, un mensaje del chat; con `clave` y `es`, la orden de un ejercicio sin leer.
 */
export function BotonVoz({
  texto,
  grande = false,
  etiqueta = 'Escuchar',
  quien,
  clave,
  es,
}: {
  texto: string;
  grande?: boolean;
  etiqueta?: string;
  quien?: string;
  clave?: string;
  es?: boolean;
}) {
  const ultimo = useRef(0);
  const decir = () => {
    const ahora = Date.now();
    hablar(texto, { lenta: !quien && !es && ahora - ultimo.current < 3000, quien, clave, es });
    ultimo.current = ahora;
  };
  return (
    <button type="button" className={grande ? 'voz voz--grande' : 'voz'} aria-label={etiqueta} title={etiqueta} onClick={decir}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        <path d="M15.5 9a4 4 0 0 1 0 6" />
        <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
      </svg>
    </button>
  );
}

/** Una línea en inglés con su altavoz. */
export function Frase({ texto, children }: { texto: string; children?: ReactNode }) {
  return (
    <p className="frase">
      <BotonVoz texto={texto} />
      <span lang="en">{children ?? texto}</span>
    </p>
  );
}

/** Una pregunta con hueco: el hueco se ve como una raya (o con la palabra elegida dentro). */
export function ConHueco({ texto, relleno, estado }: { texto: string; relleno?: string; estado?: 'bien' | 'mal' }) {
  const [antes, despues] = texto.split('___');
  return (
    <span lang="en">
      {antes}
      <span className={`hueco${relleno ? ' hueco--lleno' : ''}${estado ? ` hueco--${estado}` : ''}`}>{relleno || ' '}</span>
      {despues}
    </span>
  );
}

const PERSONA: Record<string, string> = { i: '🙋', you: '🫵', he: '👦', she: '👧', we: '👨‍👩‍👧', they: '👫' };
const PRONOMBRE: Record<string, string> = { i: 'I', you: 'you', he: 'he', she: 'she', we: 'we', they: 'they' };

export function Reloj({ hora }: { hora: string }) {
  return <span className="reloj">{hora}</span>;
}

/** El dibujo grande de un ejercicio (emoji), con su reloj si lo lleva. */
export function Dibujo({ dibujo, hora }: { dibujo: string; hora?: string }) {
  return (
    <div className="dibujo" aria-hidden="true">
      <span className="dibujo__emoji">{dibujo}</span>
      {hora && <Reloj hora={hora} />}
    </div>
  );
}

/** Como las fotos de «Look and complete»: quién, el dibujo, el hábito y cuántas veces. */
export function Tarjeta({ t }: { t: TarjetaT }) {
  return (
    <div className="tarjeta">
      {t.quien && (
        <span className="tarjeta__quien" title={PRONOMBRE[t.quien]}>
          {PERSONA[t.quien]} <span lang="en">{PRONOMBRE[t.quien]}</span>
        </span>
      )}
      <Dibujo dibujo={t.dibujo} hora={t.hora} />
      <p className="tarjeta__texto">
        {!seLee(t.texto) ? (
          <span>{t.texto}</span>
        ) : (
          <>
            <BotonVoz texto={t.texto} />
            <span lang="en">{t.texto}</span>
          </>
        )}
      </p>
      {t.veces && <p className="tarjeta__veces">{t.veces}</p>}
    </div>
  );
}

export function BotonSonido() {
  const [activado, setActivado] = useState(true);
  useEffect(() => {
    setActivado(sonidoActivado());
    prepararSonido();
  }, []);
  const cambiar = () => {
    cambiarSonido(!activado);
    setActivado(!activado);
  };
  return (
    <button type="button" className="boton-sonido" aria-label="Sonido" aria-pressed={activado} title={activado ? 'Quitar el sonido' : 'Poner el sonido'} onClick={cambiar}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {activado ? (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
    </button>
  );
}

export function Estrellas({ n, de = 3 }: { n: number; de?: number }) {
  return (
    <span className="estrellas" aria-label={`${n} de ${de} estrellas`}>
      {Array.from({ length: de }, (_, i) => (
        <span key={i} className={i < n ? 'estrella estrella--si' : 'estrella'}>
          ★
        </span>
      ))}
    </span>
  );
}

const PIEZAS = 48;
const COLORES = ['var(--violeta)', 'var(--sol)', 'var(--verde)', 'var(--coral)', 'var(--cielo)'];

/** Confeti al terminar (solo CSS; posición y retardo salen del índice, sin azar). Traído de Numeritis. */
export function Confeti() {
  const [visible, setVisible] = useState(() => !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [visible]);
  if (!visible) return null;
  return (
    <div className="confeti" aria-hidden="true">
      {Array.from({ length: PIEZAS }, (_, i) => (
        <span
          key={i}
          className="confeti__pieza"
          style={
            {
              '--x': `${(i * 37) % 100}vw`,
              '--retardo': `${(i * 53) % 700}ms`,
              '--giro': `${((i * 71) % 360) + 360}deg`,
              '--deriva': `${((i * 29) % 40) - 20}vw`,
              background: COLORES[i % COLORES.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
