import { CapacitorConfig } from '@capacitor/cli';

let serverConfig: CapacitorConfig['server'];

const ENV_MOBILE: string = 'prod';

switch (ENV_MOBILE) {
  case 'dev':
    serverConfig = {
      url: 'http://localhost:3020',
      allowNavigation: ['localhost:3020']
    };
    break;
  case 'staging':
    serverConfig = {
      url: 'https://staging.example.com',
      allowNavigation: ['staging.example.com']
    };
    break;
  case 'prod':
    serverConfig = {
      url: 'https://example.com',
      allowNavigation: ['example.com']
    };
    break;
  default:
    serverConfig = {};
    break;
}

const config: CapacitorConfig = {
  appId: 'com.sharetribecapacitor.app',
  appName: 'Sharetribe Capacitor',
  webDir: 'www',
  bundledWebRuntime: false,
  server: serverConfig
};

export default config;
