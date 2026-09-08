module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'FlexiPayDesktop',
    appBundleId: 'com.flexipay.desktop',
    win32metadata: {
      CompanyName: 'FlexiPay',
      FileDescription: 'FlexiPay Desktop Agent',
      ProductName: 'FlexiPay Desktop Agent',
      InternalName: 'FlexiPayDesktop',
      OriginalFilename: 'FlexiPayDesktop.exe'
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'flexipay_desktop',
        exe: 'FlexiPayDesktop.exe',
        setupExe: 'FlexiPayDesktopSetup.exe',
        authors: 'FlexiPay',
        description: 'FlexiPay Desktop Agent installer',
        noMsi: true
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    }
  ]
};
