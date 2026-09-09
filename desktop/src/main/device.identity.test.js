jest.mock('@main/logger', () => ({
  warn: jest.fn()
}));

const {
  normalizeHardwareValue,
  parseWindowsSerialOutput,
  parseMacSerialOutput,
  parseWindowsMachineGuid,
  parseMacPlatformUuid
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

  test('parses stable machine fingerprints from Windows and macOS output', () => {
    expect(parseWindowsMachineGuid('MachineGuid\r\n6f9619ff-8b86-d011-b42d-00cf4fc964ff\r\n')).toBe('6f9619ff-8b86-d011-b42d-00cf4fc964ff');
    expect(parseMacPlatformUuid('"IOPlatformUUID" = "E5A1B8E8-4B65-5B90-8F2A-7B1A9E9A1111"')).toBe('E5A1B8E8-4B65-5B90-8F2A-7B1A9E9A1111');
  });
});
