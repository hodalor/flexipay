module.exports = {
  serverUrl: process.env.MDM_SERVER_URL || 'https://mdm.flexipay.local',
  apiKey: process.env.MDM_API_KEY || '',
  providers: {
    android: 'google-amapi',
    ios: 'apple-mdm',
    windows: 'windows-mdm',
    mac: 'apple-mdm',
    car: 'telematics-mdm'
  }
};

