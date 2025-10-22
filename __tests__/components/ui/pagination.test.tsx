/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

// Evitar depender de ESM de lucide-react
jest.mock('lucide-react', () => ({
  ChevronLeftIcon: () => <svg data-testid="chev-left" />,
  ChevronRightIcon: () => <svg data-testid="chev-right" />,
  MoreHorizontalIcon: () => <svg data-testid="more" />,
}));

describe('Pagination', () => {
  it('estructura básica de navegación', () => {
    render(
      <Pagination aria-label="pagination">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#prev" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /previous/i })).toHaveAttribute('href', '#prev');
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute('href', '#next');
    expect(screen.getByTestId('more')).toBeInTheDocument();
  });
});
