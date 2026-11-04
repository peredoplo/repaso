# Repaso

Web al estilo Duolingo para que los hijos del autor repasen los ejercicios del cole antes de los exámenes. Uso familiar, en el ordenador de casa; más adelante se publicará en Cloudflare. **Ahora:** Julia (3.º de Primaria): Inglés, *Unit 1 · How often?* (versión 1, 1 de noviembre de 2026), y Natural Sciences, *Unit 1 · Living organisms* (3 de noviembre de 2026). Miguel (3.º de Infantil) quizá más adelante: necesitaría pantallas sin leer, solo con voz.

## Cómo se trabaja
- El autor manda la ficha del cole (PDF o foto). Claude copia **los mismos ejercicios** y crea **otros parecidos**, en `contenido/`. No hace falta tocar el código para añadir temas.
- Los ejercicios de la ficha se marcan con un comentario en el YAML (`# a) de la ficha`).
- Tras cambiar cualquier frase en inglés o un mensaje del chat: `npm run voces` (graba con Azure solo las nuevas; la clave está en `.env`, copiada de Numeritis). Cada personaje del chat habla con su voz, de niño (voces de adulto con el tono subido; `VOCES` en `scripts/voces.ts`), y el inglés de sus mensajes (en *cursiva*) lo dice la voz inglesa de las palabras, con una pausa corta al volver al español (peticiones del autor, 3 de noviembre de 2026). El tono, poco subido: más sonaba artificial. Todo el inglés de un mensaje va en *cursiva* y entre paréntesis, detrás del español: «nutrición (*nutrition*)» (lo comprueba el validador); si no es vocabulario, mejor en español ("Natu", no "Natural Sciences"). Cambiar una voz vuelve a grabar sus mensajes.
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
`chat` (la teoría, contada por los personajes de Numeritis: Vega, Hugo, Valentina y Santiago, con sus caras en `public/personajes/`; los mensajes llegan de uno en uno con «Seguir» y cada personaje los dice con su voz, y `palabras` pone el vocabulario en inglés con su altavoz; como mucho 10 mensajes), `elegir` (con dibujo, tarjeta, hueco «___» o frase para escuchar), `ordenar` (fichas con «/», como en la ficha; `sobran` para fichas de más), `escribir` (hueco o frase entera; acepta mayúsculas, punto y la frase completa), `unir` (parejas), `recuerda` (la regla, sin corregir). El chat y `recuerda` son teoría: no cuentan para la nota ni salen en el examen. La lección con `examen:` saca preguntas al azar de otras lecciones y pone nota. Al llegar a cada ejercicio se oyen solas la orden y sus frases, con un silencio en el hueco (`alEmpezar` en `src/lib/frases.ts`; petición del autor, 4 de noviembre de 2026): la orden en español la dice una voz de adulto (`NARRADOR` en `scripts/voces.ts`) y en inglés, la de las frases; el idioma de las órdenes va en el `tema.yaml` (`enunciados: en`). En una orden en español, una palabra inglesa va en *cursiva* (no en negrita), para que la diga la voz inglesa; en una orden en inglés, la **negrita** se deletrea (las letras desordenadas). En «Unscramble the letters: **…**», el validador comprueba que las letras son las de la respuesta (en la ficha, a «tsesui» le faltaba una s).

## Reglas
- **Idiomas:** las instrucciones, las explicaciones y el feedback, en español; las frases que se practican, en inglés. Las opciones incorrectas no se leen en voz alta (no se oye inglés mal dicho).
- **Natural Sciences** (petición del autor, 3 de noviembre de 2026): primero la teoría en español, en el chat, con el vocabulario de la unidad en inglés (en *cursiva* y en `palabras`); después, los ejercicios **en inglés, también el enunciado** («True or false?», «Choose the correct word.»), como en el examen del cole. El feedback, en español. Las lecciones que empiezan algo nuevo abren con su chat.
- **Sin pistas en inglés:** si el ejercicio es pasar algo al inglés, el dato va en español («1 vez al día», no «1/day», que ya dice *day*). Las abreviaturas «2/week» solo donde las usa la ficha del cole («Look and complete»). Y si hay que escribir con letras, el enunciado lo dice.
- **Una frase de ordenar no puede tener otra solución correcta sin aceptarla:** si el cuándo puede ir delante («In the morning I always…»), va en `tambien`; y la ficha que `sobra` no puede formar otra frase buena (en *My dad never drinks…* sobraba *usually*, y *My dad usually drinks…* también es correcta: revisión del autor, 1 de noviembre de 2026).
- **Todo fallo lleva su explicación**, concreta (`feedback` en la opción, `errores` en escribir o `explicacion`). `src/lib/pistas.ts` detecta los fallos típicos (*two times*, *does she eats*, la -s de *he/she*, dónde va *always*).
- **Sin castigo:** no hay vidas. Lo fallado vuelve al final de la lección (una vez) y se guarda en «Repasa tus fallos».
- **Lecciones cortas y con poco que escribir** (a Julia se le hacían pesadas, 2 de noviembre de 2026): como mucho **8 pantallas** (lo comprueba el validador); mejor dos lecciones que una larga. Las frases enteras se forman con fichas (`ordenar`, que admite `tarjeta`, `pregunta` y `debajo`); escribiendo, solo huecos cortos.
- **Premios:** cada lección da gemas (5 + estrellas; en el examen, 5 + nota). Cada dos lecciones hay un cofre en el camino (y otro tras el examen) con gemas y una pegatina; con 25 gemas se compra un sobre. El álbum, en `/pegatinas/` (`src/lib/premios.ts`); los nombres de las pegatinas, en inglés.
- **Dibujos = emojis**, nunca fotos del libro.
- **Nunca se asigna género** en los textos de la web (se usará también con Miguel).
- El progreso se guarda en el navegador (localStorage); no hay servidor ni cuentas.
- Piezas traídas de Numeritis (`C:\Claude\Numeritis`): sonidos (`public/sonidos/`, `src/lib/sonido.ts`), confeti y el guion de las voces de Azure.
