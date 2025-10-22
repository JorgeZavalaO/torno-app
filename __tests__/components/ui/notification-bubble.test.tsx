/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NotificationBubble } from '@/components/ui/notification-bubble';

describe('NotificationBubble', () => {
  it('no renderiza si count es 0', () => {
    const { container } = render(<NotificationBubble count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el conteo y limita a 99+', () => {
    render(<NotificationBubble count={120} title="Alerta" />);
    expect(screen.getByTitle('Alerta')).toHaveTextContent('99+');
  });
});
