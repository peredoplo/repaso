/** Comprueba el contenido (npm run validar; también antes de cada build). */
import { leerContenido } from './leer';

const c = leerContenido();
if (c.errores.length) {
  console.error(`Hay ${c.errores.length} errores en el contenido:\n${c.errores.map((e) => `  · ${e}`).join('\n')}`);
  process.exit(1);
}
for (const t of c.temas.values()) {
  const n = t.lecciones.reduce((s, l) => s + l.ejercicios.filter((e) => e.tipo !== 'recuerda').length, 0);
  console.log(`${t.id}: ${t.lecciones.length} lecciones, ${n} ejercicios.`);
}
console.log('Contenido correcto.');
