const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('@main/logger');

const execFileAsync = promisify(execFile);

const INVALID_VALUES = new Set([
  '',
  'unknown',
  'system serial number',
  'to be filled by o.e.m.',
  'default string',
  'none',
  'null',
  'n/a',
  'not available'
]);

function normalizeHardwareValue(value) {
  const normalized = String(value || '')
    .replace(/\r/g, '')
    .replace(/"/g, '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!normalized) {
    return null;
  }

  if (INVALID_VALUES.has(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

function parseWindowsSerialOutput(output) {
  const lines = String(output || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => entry.toLowerCase() !== 'serialnumber');

  for (const line of lines) {
    const candidate = normalizeHardwareValue(line.replace(/^serialnumber\s*:?\s*/i, ''));

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function parseMacSerialOutput(output) {
  const value = String(output || '');
  const ioRegMatch = value.match(/IOPlatformSerialNumber"\s*=\s*"([^"]+)"/i);

  if (ioRegMatch && ioRegMatch[1]) {
    return normalizeHardwareValue(ioRegMatch[1]);
  }

  const systemProfilerMatch = value.match(/Serial Number \(system\):\s*(.+)/i);

  if (systemProfilerMatch && systemProfilerMatch[1]) {
    return normalizeHardwareValue(systemProfilerMatch[1]);
  }

  return null;
}

async function runSerialCommand(command, args, parser) {
  const result = await execFileAsync(command, args, {
    windowsHide: true,
    timeout: 15000,
    maxBuffer: 1024 * 1024
  });

  return parser(result.stdout);
}

async function getWindowsSerialNumber() {
  const commands = [
    {
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-Command',
        "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; (Get-CimInstance -ClassName Win32_BIOS | Select-Object -ExpandProperty SerialNumber)"
      ]
    },
    {
      command: 'wmic',
      args: ['bios', 'get', 'serialnumber']
    }
  ];

  for (const entry of commands) {
    try {
      const serialNumber = await runSerialCommand(entry.command, entry.args, parseWindowsSerialOutput);

      if (serialNumber) {
        return serialNumber;
      }
    } catch (error) {
      logger.warn('Desktop serial command failed', {
        command: entry.command,
        error: error.message
      });
    }
  }

  return null;
}

async function getMacSerialNumber() {
  const commands = [
    {
      command: 'ioreg',
      args: ['-rd1', '-c', 'IOPlatformExpertDevice']
    },
    {
      command: 'system_profiler',
      args: ['SPHardwareDataType']
    }
  ];

  for (const entry of commands) {
    try {
      const serialNumber = await runSerialCommand(entry.command, entry.args, parseMacSerialOutput);

      if (serialNumber) {
        return serialNumber;
      }
    } catch (error) {
      logger.warn('Desktop serial command failed', {
        command: entry.command,
        error: error.message
      });
    }
  }

  return null;
}

async function resolveHardwareSerialNumber() {
  if (process.platform === 'darwin') {
    return getMacSerialNumber();
  }

  if (process.platform === 'win32') {
    return getWindowsSerialNumber();
  }

  return null;
}

module.exports = {
  normalizeHardwareValue,
  parseWindowsSerialOutput,
  parseMacSerialOutput,
  resolveHardwareSerialNumber
};
