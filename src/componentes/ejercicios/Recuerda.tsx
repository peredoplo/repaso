import type { RecuerdaT } from '../../contenido/esquema';
import { seLee as esIngles, tieneLetras } from '../../lib/normalizar';
import { BotonVoz, Frase, Texto } from '../piezas';
import type { PropsEjercicio } from './tipos';

/** Una tarjeta para recordar la regla antes de practicarla. No se corrige. */
export default function Recuerda({ ejercicio: e }: PropsEjercicio<RecuerdaT>) {
  return (
    <div className="ejercicio">
      <div className="recuerda">
        <p className="recuerda__etiqueta">💡 Recuerda</p>
        <h2 className="recuerda__titulo">
          <Texto>{e.titulo}</Texto>
        </h2>
        {e.texto.split('\n').filter(Boolean).map((p, i) => (
          <p key={i} className="recuerda__texto">
            <Texto>{p}</Texto>
          </p>
        ))}
        {e.tabla && (
          <table className="recuerda__tabla">
            <tbody>
              {e.tabla.map(([a, b]) => (
                <tr key={a + b}>
                  {[a, b].map((c, k) => (
                    <td key={k} className={tieneLetras(c) ? '' : 'recuerda__emoji'}>
                      {esIngles(c) ? (
                        <span className="recuerda__ingles">
                          <BotonVoz texto={c} />
                          <span lang="en">{c}</span>
                        </span>
                      ) : (
                        <Texto>{c}</Texto>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {e.ejemplos?.map((x) => (
          <Frase key={x} texto={x} />
        ))}
      </div>
    </div>
  );
}
