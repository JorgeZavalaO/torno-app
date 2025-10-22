/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingButton } from '@/components/ui/loading-spinner';

describe('LoadingSpinner', () => {
  it('renderiza con tamaño y texto', () => {
    render(<LoadingSpinner size="sm" text="Cargando" />);
    expect(screen.getByText('Cargando')).toBeInTheDocument();
    const spinner = screen.getByText('Cargando').previousSibling as HTMLElement;
    expect(spinner.className).toMatch(/animate-spin/);
  });
});

describe('LoadingButton', () => {
  it('muestra spinner y deshabilita cuando isLoading', () => {
    render(
      <LoadingButton isLoading loadingText="Procesando" data-testid="btn">
        Enviar
      </LoadingButton>
    );
    const btn = screen.getByTestId('btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText('Procesando')).toBeInTheDocument();
  });

  it('muestra children cuando no está cargando', () => {
    render(
      <LoadingButton data-testid="btn">
        Enviar
      </LoadingButton>
    );
    const btn = screen.getByTestId('btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(screen.getByText('Enviar')).toBeInTheDocument();
  });
});
