jest.mock('@main/logger', () => ({
  warn: jest.fn()
}));

const {
  normalizeHardwareValue,
  parseWindowsSerialOutput,
  parseMacSerialOutput
} = require('./device.identity');

describe('device identity helpers', () => {
  test('normalizes hardware identifiers and drops unusable placeholders', () => {
    expect(normalizeHardwareValue(' ABC123 \r\n')).toBe('ABC123');
    expect(normalizeHardwareValue('To Be Filled By O.E.M.')).toBeNull();
  });

  test('parses Windows serial output from PowerShell or WMIC', () => {
    expect(parseWindowsSerialOutput('SerialNumber\r\nABC12345\r\n')).toBe('ABC12345');
    expect(parseWindowsSerialOutput('ABC12345')).toBe('ABC12345');
  });

  test('parses macOS serial output from ioreg and system_profiler', () => {
    expect(parseMacSerialOutput('"IOPlatformSerialNumber" = "C02ABC123XYZ"')).toBe('C02ABC123XYZ');
    expect(parseMacSerialOutput('Serial Number (system): C02ABC123XYZ')).toBe('C02ABC123XYZ');
  });
});
