const {
  toAmountInt,
  fromAmountInt,
  normalizeAmountInt,
  formatAmount
} = require('../src/utils/money');

describe('money utils', () => {
  test('converts decimal values to ngwee integers', () => {
    expect(toAmountInt(12.34)).toBe(1234);
    expect(toAmountInt('0.99')).toBe(99);
  });

  test('throws for invalid monetary values', () => {
    expect(() => toAmountInt('abc')).toThrow('Invalid monetary amount supplied');
  });

  test('formats and normalizes stored amounts safely', () => {
    expect(fromAmountInt(505)).toBe(5.05);
    expect(normalizeAmountInt('123.8')).toBe(124);
    expect(normalizeAmountInt(null)).toBe(0);
    expect(formatAmount(505)).toBe('5.05');
  });
});
