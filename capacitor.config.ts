import { CapacitorConfig } from '@capacitor/cli';
import { CapcaitorEnv } from './capacitor.env';

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
      // url: 'https://staging.example.com',
      // allowNavigation: ['staging.example.com']
      url: CapcaitorEnv.REACT_CAPACITOR_STAGING_WEB_URL,
      allowNavigation: [CapcaitorEnv.REACT_CAPACITOR_STAGING_ALLOW_NAV_URL]
    };
    break;
  case 'prod':
    serverConfig = {
      // url: 'https://example.com',
      // allowNavigation: ['example.com']
      url: CapcaitorEnv.REACT_CAPACITOR_PROD_WEB_URL,
      allowNavigation: [CapcaitorEnv.REACT_CAPACITOR_PROD_ALLOW_NAV_URL]
    };
    break;
  default:
    serverConfig = {};
    break;
}

const config: CapacitorConfig = {
  appId: `com.${CapcaitorEnv.REACT_CAPACITOR_APP_ID}.app`,
  appName: CapcaitorEnv.REACT_CAPACITOR_APP_NAME,
  webDir: 'www',
  bundledWebRuntime: false,
  server: serverConfig
};

export default config;
