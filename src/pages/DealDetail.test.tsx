import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DealDetail from './DealDetail';

describe('DealDetail Page', () => {
  it('renders without crashing for mock deal 11111111-1111-1111-1111-111111111111', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/deals/11111111-1111-1111-1111-111111111111']}>
          <Routes>
            <Route path="/deals/:id" element={<DealDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should find either loading skeleton or deal title
    expect(await screen.findByText(/Escrow State Timeline|Custom Keyboard/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
