import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { EjercicioC } from '../contenido/cargar';
import Leccion from './Leccion';

const ordenar: EjercicioC = {
  id: 't/l#1',
  tipo: 'ordenar',
  enunciado: 'Ordena las palabras.',
  piezas: 'never / I / go',
  solucion: 'I never go.',
};
const escribir: EjercicioC = { id: 't/l#2', tipo: 'escribir', enunciado: 'Escribe.', plantilla: '___ a day', respuestas: ['twice'] };
const chat: EjercicioC = {
  id: 't/l#3',
  tipo: 'chat',
  titulo: 'Las células',
  mensajes: [
    { de: 'vega', texto: 'Hola, soy Vega.' },
    { de: 'hugo', texto: 'Una célula es una *cell*.', palabras: [['cell', 'célula']] },
  ],
};

describe('Leccion', () => {
  it('se ordena tocando fichas, se comprueba y se termina', async () => {
    const u = userEvent.setup();
    const terminar = vi.fn();
    render(<Leccion titulo="Prueba" ejercicios={[ordenar, escribir]} modo="leccion" onSalir={() => {}} onTerminar={terminar} />);

    const comprobar = screen.getByRole('button', { name: 'Comprobar' });
    expect(comprobar).toBeDisabled();
    for (const p of ['I', 'never', 'go']) await u.click(screen.getByRole('button', { name: p }));
    await u.click(comprobar);
    expect(screen.getByRole('status')).toHaveTextContent('✔');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));

    // Falla el segundo: vuelve a salir al final.
    await u.type(screen.getByLabelText('Tu respuesta'), 'two times');
    await u.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(screen.getByRole('status')).toHaveTextContent('twice');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText(/otra vez/)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Tu respuesta'), 'twice{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('✔');
    await u.keyboard('{Enter}');

    expect(terminar).toHaveBeenCalledTimes(1);
    const { primeros } = terminar.mock.calls[0][0];
    expect(primeros.map((p: { resultado: { bien: boolean } }) => p.resultado.bien)).toEqual([true, false]);
  });

  it('el chat enseña los mensajes de uno en uno y no cuenta para la nota', async () => {
    const u = userEvent.setup();
    const terminar = vi.fn();
    render(<Leccion titulo="Prueba" ejercicios={[chat, ordenar]} modo="leccion" onSalir={() => {}} onTerminar={terminar} />);

    expect(screen.getByText('Hola, soy Vega.')).toBeInTheDocument();
    expect(screen.queryByText(/Una célula/)).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(screen.getByText(/Una célula/)).toBeInTheDocument();
    expect(screen.getByText('Hugo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escuchar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument();
    await u.keyboard('{Enter}');

    for (const p of ['I', 'never', 'go']) await u.click(screen.getByRole('button', { name: p }));
    await u.click(screen.getByRole('button', { name: 'Comprobar' }));
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(terminar.mock.calls[0][0].primeros).toHaveLength(1);
  });

  it('dos toques muy seguidos en «Seguir» no pasan del último mensaje', () => {
    render(<Leccion titulo="Prueba" ejercicios={[chat, ordenar]} modo="leccion" onSalir={() => {}} onTerminar={() => {}} />);
    const seguir = screen.getByRole('button', { name: 'Seguir' });
    act(() => {
      seguir.click();
      seguir.click();
    });
    expect(screen.getByText(/Una célula/)).toBeInTheDocument();
  });

  it('sin leer, se oye la opción al tocarla y la explicación al fallar, en español', async () => {
    // Sin grabación (y sin Web Audio en jsdom), lo dice la voz del navegador: aquí se espía.
    const dichas: { text: string; lang: string }[] = [];
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = '';
      rate = 1;
      voice = null;
      constructor(public text: string) {}
    });
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak: (x: { text: string; lang: string }) => dichas.push(x) });
    const marte: EjercicioC = {
      id: 'u/marte#2',
      sinLeer: true,
      tipo: 'elegir',
      enunciado: '¿De qué color es Marte?',
      correcta: '🔴 Rojo',
      incorrectas: [{ texto: '🔵 Azul', feedback: 'Azul es la Tierra. Marte es *rojo*.' }],
    };
    const u = userEvent.setup();
    render(<Leccion titulo="Marte" ejercicios={[marte]} modo="leccion" onSalir={() => {}} onTerminar={() => {}} />);

    expect(screen.getByRole('button', { name: 'Escuchar otra vez' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Azul/ }));
    expect(dichas.at(-1)).toEqual(expect.objectContaining({ text: 'Azul', lang: 'es-ES' }));
    await u.click(screen.getByRole('button', { name: 'Comprobar' }));
    await vi.waitFor(() => expect(dichas.at(-1)?.text).toBe('¡Casi! Azul es la Tierra. Marte es rojo.'));
    expect(dichas.at(-1)?.lang).toBe('es-ES');
    vi.unstubAllGlobals();
  });

  it('completar: las palabras del recuadro van a los huecos, y se corrige todo junto', async () => {
    const u = userEvent.setup();
    const terminar = vi.fn();
    const completar: EjercicioC = {
      id: 't/c#1',
      tipo: 'completar',
      enunciado: 'Complete the sentences with the words from the box.',
      frases: [
        { frase: 'A red light means ___.', respuesta: 'stop', feedback: 'Rojo: **stop**.' },
        { frase: 'A green light means ___.', respuesta: 'go', feedback: 'Verde: **go**.' },
      ],
    };
    render(<Leccion titulo="Prueba" ejercicios={[completar]} modo="leccion" onSalir={() => {}} onTerminar={terminar} />);
    const comprobar = screen.getByRole('button', { name: 'Comprobar' });
    // Al revés: «go» en el primer hueco; tocándolo, vuelve al recuadro.
    await u.click(screen.getByRole('button', { name: 'go' }));
    await u.click(screen.getByRole('button', { name: 'Quitar go' }));
    expect(comprobar).toBeDisabled();
    await u.click(screen.getByRole('button', { name: 'go' }));
    await u.click(screen.getByRole('button', { name: 'stop' }));
    await u.click(comprobar);
    expect(screen.getByRole('status')).toHaveTextContent('✘');
    expect(screen.getByRole('status')).toHaveTextContent('Rojo: stop. Verde: go.');
  });

  it('clasificar: cada ficha va a su columna; un fallo tiembla, se explica y no la deja pasar', async () => {
    const u = userEvent.setup();
    const terminar = vi.fn();
    const tabla: EjercicioC = {
      id: 't/t#1',
      tipo: 'clasificar',
      enunciado: 'Cities or villages?',
      grupos: [
        { nombre: 'Cities', fichas: [{ texto: 'Streets are long and wide.', feedback: 'Eso es de la ciudad.' }] },
        { nombre: 'Villages', fichas: [{ texto: 'Streets are short and narrow.', feedback: 'Eso es del pueblo.' }] },
      ],
    };
    render(<Leccion titulo="Prueba" ejercicios={[tabla]} modo="leccion" onSalir={() => {}} onTerminar={terminar} />);
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument();
    const columna = (n: string) => screen.getByRole('button', { name: new RegExp('^' + n) });
    const primera = screen.getByText(/Streets are/).textContent!;
    await u.click(columna(primera.includes('long') ? 'Villages' : 'Cities'));
    expect(screen.getByText(primera.includes('long') ? 'Eso es de la ciudad.' : 'Eso es del pueblo.')).toBeInTheDocument();
    await u.click(columna(primera.includes('long') ? 'Cities' : 'Villages'));
    const segunda = screen.getByText(/Streets are/, { selector: '.clasificar__ficha span' }).textContent!;
    await u.click(columna(segunda.includes('long') ? 'Cities' : 'Villages'));
    expect(screen.getByRole('status')).toHaveTextContent('un fallo');
  });
});
