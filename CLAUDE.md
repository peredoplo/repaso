# Repaso

Web al estilo Duolingo para que los hijos del autor repasen los ejercicios del cole antes de los exámenes. Uso familiar, en el ordenador de casa; más adelante se publicará en Cloudflare. **Ahora:** Julia (3.º de Primaria), Inglés, *Unit 1 · How often?* (versión 1, 1 de noviembre de 2026). Miguel (3.º de Infantil) quizá más adelante: necesitaría pantallas sin leer, solo con voz.

## Cómo se trabaja
- El autor manda la ficha del cole (PDF o foto). Claude copia **los mismos ejercicios** y crea **otros parecidos**, en `contenido/`. No hace falta tocar el código para añadir temas.
- Los ejercicios de la ficha se marcan con un comentario en el YAML (`# a) de la ficha`).
- Tras cambiar cualquier frase en inglés: `npm run voces` (graba con Azure solo las nuevas; la clave está en `.env`, copiada de Numeritis).
- Antes de dar algo por hecho: `npm run validar` y `npm test`.

## Estructura
```
contenido/perfiles.yaml                     ← quién usa la web y qué temas ve
contenido/<asignatura>/<tema>/tema.yaml     ← título y orden de las lecciones
contenido/<asignatura>/<tema>/<leccion>.yaml
src/contenido/esquema.ts                    ← el formato (Zod), con la regla de idiomas
src/lib/                                    ← corregir, pistas de errores típicos, progreso, voz, sonidos
src/componentes/                            ← Mapa, Leccion, Final y un componente por tipo de ejercicio
scripts/                                    ← validar y voces
```

## Direcciones y publicación
- `/` es la portada (los temas de cada perfil, por asignatura); `/<asignatura>/<tema>/` (`/ingles/unit-1/`) es el camino de lecciones de ese tema. Sin librería de rutas: `src/lib/rutas.ts`.
- GitHub: `peredoplo/repaso` (**público**: no subas nada privado; `.env` está en `.gitignore`). Cloudflare publica el worker `repaso` desde ese repositorio: `npm run build` y `wrangler.jsonc` sirve `dist/`, con `single-page-application` para que cualquier dirección abra la web.
- Los audios (`public/voz/`) sí se suben: Cloudflare no tiene la clave de Azure.

## Tipos de ejercicio
`elegir` (con dibujo, tarjeta, hueco «___» o frase para escuchar), `ordenar` (fichas con «/», como en la ficha; `sobran` para fichas de más), `escribir` (hueco o frase entera; acepta mayúsculas, punto y la frase completa), `unir` (parejas), `recuerda` (la regla, sin corregir). La lección con `examen:` saca preguntas al azar de otras lecciones y pone nota.

## Reglas
- **Idiomas:** las instrucciones, las explicaciones y el feedback, en español; las frases que se practican, en inglés. Las opciones incorrectas no se leen en voz alta (no se oye inglés mal dicho).
- **Todo fallo lleva su explicación**, concreta (`feedback` en la opción, `errores` en escribir o `explicacion`). `src/lib/pistas.ts` detecta los fallos típicos (*two times*, *does she eats*, la -s de *he/she*, dónde va *always*).
- **Sin castigo:** no hay vidas. Lo fallado vuelve al final de la lección (hasta 2 veces) y se guarda en «Repasa tus fallos».
- **Dibujos = emojis**, nunca fotos del libro.
- **Nunca se asigna género** en los textos de la web (se usará también con Miguel).
- El progreso se guarda en el navegador (localStorage); no hay servidor ni cuentas.
- Piezas traídas de Numeritis (`C:\Claude\Numeritis`): sonidos (`public/sonidos/`, `src/lib/sonido.ts`), confeti y el guion de las voces de Azure.
