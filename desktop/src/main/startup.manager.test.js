jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    setLoginItemSettings: jest.fn(),
    getLoginItemSettings: jest.fn(() => ({ openAtLogin: true }))
  }
}));

jest.mock('@main/logger', () => ({
  info: jest.fn(),
  warn: jest.fn()
}));

const { app } = require('electron');
const logger = require('@main/logger');
const { registerStartup } = require('./startup.manager');

describe('startup manager', () => {
  beforeEach(() => {
    app.isPackaged = false;
    app.setLoginItemSettings.mockClear();
    app.getLoginItemSettings.mockClear();
    logger.info.mockClear();
    logger.warn.mockClear();
  });

  test('registers startup login item and reports success', () => {
    app.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

    expect(registerStartup()).toBe(true);
    expect(app.setLoginItemSettings).toHaveBeenCalledTimes(1);
    expect(app.setLoginItemSettings).toHaveBeenCalledWith(expect.objectContaining({
      openAtLogin: true,
      openAsHidden: true,
      name: 'FlexiPay Agent'
    }));
  });

  test('retries startup registration when login item is missing', () => {
    app.getLoginItemSettings
      .mockReturnValueOnce({ openAtLogin: false })
      .mockReturnValueOnce({ openAtLogin: false })
      .mockReturnValueOnce({ openAtLogin: true });

    expect(registerStartup()).toBe(true);
    expect(app.setLoginItemSettings).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });
});
