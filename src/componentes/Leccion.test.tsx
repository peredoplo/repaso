import { render, screen } from '@testing-library/react';
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
});
