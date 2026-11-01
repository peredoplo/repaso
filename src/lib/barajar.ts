/** Mezcla al azar (Fisher-Yates). Si se da `evitar`, intenta no devolver un orden que lo cumpla (el ya resuelto). */
export function barajar<T>(lista: readonly T[], evitar?: (x: T[]) => boolean, azar: () => number = Math.random): T[] {
  let r = [...lista];
  for (let intento = 0; intento < 10; intento++) {
    r = [...lista];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    if (!evitar || !evitar(r)) return r;
  }
  return r;
}
