/**
 * Direcciones sencillas, sin librería: «/» es la portada y «/ingles/unit-1/» el camino de ese tema.
 * Cloudflare devuelve index.html en cualquier dirección (wrangler.jsonc, single-page-application).
 */
import { useEffect, useState, type MouseEvent } from 'react';

const EVENTO = 'repaso:ruta';

/** «/ingles/unit-1» y «/ingles/unit-1/» son la misma: se devuelve sin barras («ingles/unit-1»; la portada, «»). */
export const limpiar = (ruta: string) => decodeURIComponent(ruta).replace(/^\/+|\/+$/g, '');

export const rutaTema = (tema: string) => `/${tema}/`;

export function ir(ruta: string, { reemplazar = false } = {}): void {
  if (reemplazar) history.replaceState(null, '', ruta);
  else history.pushState(null, '', ruta);
  window.dispatchEvent(new Event(EVENTO));
  window.scrollTo(0, 0);
}

export function useRuta(): string {
  const [ruta, setRuta] = useState(() => limpiar(location.pathname));
  useEffect(() => {
    const cambiar = () => setRuta(limpiar(location.pathname));
    window.addEventListener('popstate', cambiar);
    window.addEventListener(EVENTO, cambiar);
    return () => {
      window.removeEventListener('popstate', cambiar);
      window.removeEventListener(EVENTO, cambiar);
    };
  }, []);
  return ruta;
}

/** Para los <a>: un clic normal cambia de pantalla sin recargar; con Ctrl o la rueda, se abre en otra pestaña. */
export function alPulsarEnlace(ev: MouseEvent<HTMLAnchorElement>): void {
  if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  ev.preventDefault();
  ir(ev.currentTarget.getAttribute('href') ?? '/');
}
