import { CapacitorConfig } from '@capacitor/cli';
import { CapcaitorEnv } from './capacitor.env';

/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/push-notifications" />

let serverConfig: CapacitorConfig['server'];

const ENV_MOBILE: string = CapcaitorEnv.REACT_CAPACITOR_ENV;

switch (ENV_MOBILE) {
  case 'dev':
    serverConfig = {
      // url: 'http://127.0.0.1:3020',
      // allowNavigation: ['127.0.0.1:3020'],
      url: 'http://localhost:3020',
      allowNavigation: ['localhost:3020'],
      // url: 'http://localhost:4000',
      // allowNavigation: ['localhost:4000'],
      // allowNavigation: ['*'],
      //** cleartext is not intended for use in production.**//
      cleartext: true,
    };
    break;
  case 'staging':
    serverConfig = {
      // url: 'https://staging.example.com',
      // allowNavigation: ['staging.example.com']
      url: CapcaitorEnv.REACT_CAPACITOR_STAGING_WEB_URL,
      allowNavigation: [CapcaitorEnv.REACT_CAPACITOR_STAGING_ALLOW_NAV_URL],
    };
    break;
  case 'prod':
    serverConfig = {
      // url: 'https://example.com',
      // allowNavigation: ['example.com']
      url: CapcaitorEnv.REACT_CAPACITOR_PROD_WEB_URL,
      allowNavigation: [CapcaitorEnv.REACT_CAPACITOR_PROD_ALLOW_NAV_URL],
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
  server: serverConfig,
  plugins: {
    // App: {
    //   appUrlOpen: {
    //     uri: 'leechy://',
    //   },
    // },
    SplashScreen: {
      launchShowDuration: 5000,
      // launchAutoHide: true,
      launchFadeOutDuration: 5000,
      backgroundColor: '#ffffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // CapacitorHttp: {
    //   enabled: true,
    // },
  },
};

export default config;
