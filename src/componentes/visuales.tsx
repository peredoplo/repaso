/**
 * Los dibujos de Matemáticas, hechos con datos (idea de Numeritis): la cuenta en columna con la cabecera UM C D U del
 * libro, la recta numérica para aproximar y el gráfico de barras.
 */
import { Fragment, type ReactNode } from 'react';
import type { ColumnasT, GraficoT, RectaT } from '../contenido/esquema';
import { escribirNumero, SIGLA_COLUMNA } from '../lib/aritmetica';

const soloCifras = (t: string) => t.replace(/\D/g, '');

/** Las cifras de «4.152» puestas en `columnas` casillas, empezando por las unidades («» donde no hay). */
const enColumnas = (t: string, columnas: number) => {
  const c = [...soloCifras(t)].reverse();
  return Array.from({ length: columnas }, (_, i) => c[i] ?? '');
};

interface PropsRejilla {
  columnas: number;
  filas: string[];
  signo?: '+' | '-';
  /** Las que te llevas en cada columna, desde las unidades: encima en la suma, entre los dos números en la resta. */
  llevadas?: ReactNode[];
  /** La fila del resultado, desde las unidades; sin ella, no hay raya. */
  abajo?: ReactNode[];
  /** Columnas marcadas en rojo (0 = unidades). */
  mal?: number[];
}

/** La rejilla de una cuenta en columna, como en el cuaderno: cada cifra en su columna, con su letra arriba. */
export function Rejilla({ columnas, filas, signo, llevadas, abajo, mal = [] }: PropsRejilla) {
  const orden = Array.from({ length: columnas }, (_, k) => columnas - 1 - k); // de la izquierda (UM) a las unidades
  const clase = (i: number) => `columnas__celda columnas__celda--${SIGLA_COLUMNA[i].toLowerCase()}${mal.includes(i) ? ' columnas__celda--mal' : ''}`;
  // Lo que te llevas: en la suma, encima de los números; en la resta, entre los dos (se suma al de abajo).
  const filaLlevadas = llevadas && (
    <div className="columnas__fila" role="row">
      <span />
      {orden.map((i) => (
        <span key={i} className="columnas__llevada">
          {llevadas[i]}
        </span>
      ))}
    </div>
  );
  const posLlevadas = signo === '-' ? 0 : -1;
  return (
    <div className="columnas" style={{ gridTemplateColumns: `1.6rem repeat(${columnas}, 2.6rem)` }} role="table" aria-label="Cuenta en columna">
      <span />
      {orden.map((i) => (
        <span key={i} className={`columnas__cabecera columnas__cabecera--${SIGLA_COLUMNA[i].toLowerCase()}`} role="columnheader">
          {SIGLA_COLUMNA[i]}
        </span>
      ))}
      {posLlevadas < 0 && filaLlevadas}
      {filas.map((f, k) => {
        const cifras = enColumnas(f, columnas);
        return (
          <Fragment key={k}>
            <div className="columnas__fila" role="row">
              <span className="columnas__signo">{k === filas.length - 1 && signo ? (signo === '-' ? '−' : '+') : ''}</span>
              {orden.map((i) => (
                <span key={i} className={clase(i)} role="cell">
                  {cifras[i]}
                </span>
              ))}
            </div>
            {k === posLlevadas && filaLlevadas}
          </Fragment>
        );
      })}
      {abajo && (
        <div className="columnas__fila columnas__fila--resultado" role="row">
          <span className="columnas__signo" />
          {orden.map((i) => (
            <span key={i} className={clase(i)} role="cell">
              {abajo[i]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Una cuenta ya escrita (la de un personaje, a veces con un fallo) o la tabla de las cifras de un número. */
export function Columnas({ c }: { c: ColumnasT }) {
  const resultado = c.resultado && c.resultado !== '?' ? c.resultado : undefined;
  const columnas = Math.max(...[...c.filas, resultado ?? ''].map((t) => soloCifras(t).length));
  const abajo = c.resultado ? (resultado ? enColumnas(resultado, columnas) : Array.from({ length: columnas }, () => '?')) : undefined;
  const llevadas = c.llevadas ? Array.from({ length: columnas }, (_, i) => c.llevadas![i] ?? '') : undefined;
  return (
    <div className="dibujo">
      <Rejilla columnas={columnas} filas={c.filas} signo={c.signo} llevadas={llevadas} abajo={abajo} mal={c.mal} />
    </div>
  );
}

/** La recta numérica: una rayita en cada paso, la del medio más larga, y los números marcados con un punto. */
export function Recta({ r }: { r: RectaT }) {
  const ancho = 340;
  const margen = 26;
  const n = Math.round((r.hasta - r.desde) / r.paso);
  const x = (v: number) => margen + ((v - r.desde) / (r.hasta - r.desde)) * (ancho - 2 * margen);
  const rayas = Array.from({ length: n + 1 }, (_, k) => r.desde + k * r.paso);
  const mitad = n % 2 === 0 ? r.desde + (n / 2) * r.paso : null;
  const letra = r.numeros === 'todos' && n > 10 ? 9 : 12;
  return (
    <div className="dibujo">
      <svg className="recta" viewBox={`0 0 ${ancho} 86`} width="100%" role="img" aria-label={`Recta numérica de ${r.desde} a ${r.hasta}`}>
        <line x1={margen - 10} x2={ancho - margen + 10} y1="50" y2="50" className="recta__linea" />
        {rayas.map((v, k) => {
          const grande = k === 0 || k === n || v === mitad;
          return (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={grande ? 40 : 45} y2={grande ? 60 : 55} className="recta__raya" />
              {(r.numeros === 'todos' || k === 0 || k === n) && (
                <text x={x(v)} y="77" textAnchor="middle" fontSize={k === 0 || k === n ? 13 : letra} className={k === 0 || k === n ? 'recta__extremo' : 'recta__numero'}>
                  {escribirNumero(v)}
                </text>
              )}
            </g>
          );
        })}
        {r.marcas.map((m) => (
          <g key={m}>
            <circle cx={x(m)} cy="50" r="6" className="recta__punto" />
            <text x={x(m)} y="28" textAnchor="middle" fontSize="14" className="recta__marca">
              {escribirNumero(m)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const COLOR_SERIE = ['var(--verde)', 'var(--coral)'];

/** Un gráfico de barras con su leyenda, de pie o tumbado. */
export function Grafico({ g }: { g: GraficoT }) {
  const max = Math.max(...g.series.flatMap((s) => s.valores), 1);
  const salto = max <= 10 ? 1 : max <= 20 ? 2 : max <= 50 ? 5 : 10;
  const tope = Math.ceil(max / salto) * salto;
  const marcas = Array.from({ length: tope / salto + 1 }, (_, k) => k * salto);
  const nS = g.series.length;
  const ancho = 340;
  const alto = g.horizontal ? 40 + g.categorias.length * (nS * 14 + 14) : 210;
  // Zona de las barras.
  const izq = g.horizontal ? 74 : 34;
  const der = ancho - 10;
  const arriba = 10;
  const abajo = alto - 28;
  const largo = (v: number) => (g.horizontal ? ((der - izq) * v) / tope : ((abajo - arriba) * v) / tope);
  const hueco = g.horizontal ? (abajo - arriba) / g.categorias.length : (der - izq) / g.categorias.length;
  const grueso = Math.min(22, (hueco * 0.7) / nS);
  return (
    <div className="dibujo grafico">
      <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" role="img" aria-label="Gráfico de barras">
        {marcas.map((m) => {
          const p = g.horizontal ? izq + largo(m) : abajo - largo(m);
          return g.horizontal ? (
            <g key={m}>
              <line x1={p} x2={p} y1={arriba} y2={abajo} className="grafico__guia" />
              <text x={p} y={abajo + 16} textAnchor="middle" fontSize="11" className="grafico__numero">
                {m}
              </text>
            </g>
          ) : (
            <g key={m}>
              <line x1={izq} x2={der} y1={p} y2={p} className="grafico__guia" />
              <text x={izq - 6} y={p + 4} textAnchor="end" fontSize="11" className="grafico__numero">
                {m}
              </text>
            </g>
          );
        })}
        {g.categorias.map((c, k) => {
          const centro = g.horizontal ? arriba + hueco * (k + 0.5) : izq + hueco * (k + 0.5);
          return (
            <g key={c}>
              {g.series.map((s, j) => {
                const desde = centro - (nS * grueso) / 2 + j * grueso;
                const l = largo(s.valores[k]);
                return g.horizontal ? (
                  <rect key={s.nombre} x={izq} y={desde} width={l} height={grueso - 2} fill={COLOR_SERIE[j]} rx="2" />
                ) : (
                  <rect key={s.nombre} x={desde} y={abajo - l} width={grueso - 2} height={l} fill={COLOR_SERIE[j]} rx="2" />
                );
              })}
              {g.horizontal ? (
                <text x={izq - 6} y={centro + 4} textAnchor="end" fontSize="12" className="grafico__categoria">
                  {c}
                </text>
              ) : (
                <text x={centro} y={abajo + 18} textAnchor="middle" fontSize="12" className="grafico__categoria">
                  {c}
                </text>
              )}
            </g>
          );
        })}
        <line x1={izq} x2={g.horizontal ? izq : der} y1={g.horizontal ? arriba : abajo} y2={abajo} className="grafico__eje" />
        <line x1={izq} x2={g.horizontal ? der : izq} y1={abajo} y2={g.horizontal ? abajo : arriba} className="grafico__eje" />
      </svg>
      <p className="grafico__leyenda">
        {g.eje && <span className="grafico__que">{g.eje}:</span>}
        {g.series.map((s, j) => (
          <span key={s.nombre} className="grafico__serie">
            <span className="grafico__color" style={{ background: COLOR_SERIE[j] }} /> {s.nombre}
          </span>
        ))}
      </p>
    </div>
  );
}

/** Los dibujos de Matemáticas que lleve un ejercicio o un mensaje del chat. */
export function Visuales({ v }: { v: { columnas?: ColumnasT; recta?: RectaT; grafico?: GraficoT } }) {
  return (
    <>
      {v.columnas && <Columnas c={v.columnas} />}
      {v.recta && <Recta r={v.recta} />}
      {v.grafico && <Grafico g={v.grafico} />}
    </>
  );
}
