import React from 'react';
import { render, screen } from '@testing-library/react';
import KPICard from './KPICard';

describe('KPICard', () => {
  test('renders the metric label and value', () => {
    render(<KPICard label="Total Loans" value="42" accent="#16a34a" />);

    expect(screen.getByText('Total Loans')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
