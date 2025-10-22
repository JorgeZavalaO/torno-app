/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renderiza como <button> por defecto', () => {
    render(<Button>Click</Button>);
    const el = screen.getByRole('button', { name: /click/i });
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-slot', 'button');
  });

  it('aplica variantes y tamaños', () => {
    const { rerender } = render(<Button variant="secondary">A</Button>);
    const el = screen.getByRole('button', { name: 'A' });
    expect(el.className).toMatch(/bg-secondary/);

    rerender(<Button size="lg">A</Button>);
    expect(el.className).toMatch(/h-10/);
  });

  it('asChild renderiza el Slot (ej: <a>)', () => {
    render(
      <Button asChild>
        <a href="#link">Ir</a>
      </Button>
    );
    const el = screen.getByRole('link', { name: 'Ir' });
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('href', '#link');
  });
});
