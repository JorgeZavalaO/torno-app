/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renderiza input con atributos básicos', () => {
    render(<Input type="email" placeholder="correo" />);
    const el = screen.getByPlaceholderText('correo') as HTMLInputElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('type', 'email');
    expect(el).toHaveAttribute('data-slot', 'input');
  });

  it('combina clases personalizadas', () => {
    render(<Input className="custom-class" />);
    const el = screen.getByRole('textbox');
    expect(el.className).toMatch(/custom-class/);
  });
});
