import { stockLabel } from '../../src/services/catalog.js';

describe('stockLabel', () => {
  it('returns "In stock" when stock is greater than 5', () => {
    expect(stockLabel(6)).toBe('In stock');
    expect(stockLabel(10)).toBe('In stock');
    expect(stockLabel(100)).toBe('In stock');
  });

  it('returns "Only N left" when stock is between 1 and 5 (inclusive)', () => {
    expect(stockLabel(1)).toBe('Only 1 left');
    expect(stockLabel(2)).toBe('Only 2 left');
    expect(stockLabel(3)).toBe('Only 3 left');
    expect(stockLabel(4)).toBe('Only 4 left');
    expect(stockLabel(5)).toBe('Only 5 left');
  });

  it('returns "Sold out" when stock is 0', () => {
    expect(stockLabel(0)).toBe('Sold out');
  });
});
